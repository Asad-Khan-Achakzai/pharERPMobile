import NetInfo from '@react-native-community/netinfo';
import { api, ApiError } from '@/api/client';
import { outbox, backoff, type CoreOutboxItem, type MediaOutboxItem } from './outbox';
import { useAuthStore } from '@/state/authStore';

let running = false;
let online = true;
let unsubscribe: (() => void) | null = null;
let listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

export interface SyncStatus {
  online: boolean;
  inFlight: boolean;
  pending: { core: number; media: number; failed: number };
}

let status: SyncStatus = {
  online: true,
  inFlight: false,
  pending: { core: 0, media: 0, failed: 0 },
};

export function subscribeSyncStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getSyncStatus(): SyncStatus {
  return status;
}

function emit() {
  for (const l of listeners) l();
}

async function refreshCounts() {
  status = { ...status, pending: await outbox.countPending() };
  emit();
}

async function runCoreItem(item: CoreOutboxItem) {
  await outbox.markCore(item.id, { state: 'IN_FLIGHT' });
  try {
    const body = item.bodyJson ? JSON.parse(item.bodyJson) : undefined;
    await api.request({
      method: item.method as any,
      url: item.path,
      data: body,
      headers: { 'X-Client-Uuid': item.clientUuid },
    });
    await outbox.markCore(item.id, {
      state: 'COMPLETED',
      completedAt: Date.now(),
      lastError: null,
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    const attempts = item.attempts + 1;
    const fatal = status === 400 || status === 422 || status === 409 || status === 403;
    await outbox.markCore(item.id, {
      state: fatal ? 'FAILED' : 'PENDING',
      attempts,
      lastError: err instanceof Error ? err.message : String(err),
      lastStatus: status,
      nextAttemptAt: Date.now() + backoff(attempts),
    });
  }
}

async function runMediaItem(item: MediaOutboxItem) {
  const cfg = useAuthStore.getState().serverConfig;
  if (!cfg?.media.enableMediaUpload) {
    return;
  }
  await outbox.markMedia(item.id, { state: 'IN_FLIGHT' });
  try {
    const presign = await api.post('/media/presign', {
      kind: item.kind,
      mime: item.mime,
      size: item.size ?? 0,
    });
    const asset = presign.data?.data ?? presign.data;
    if (asset?.uploadUrl) {
      const blob = await (await fetch(item.fileUri)).blob();
      await fetch(asset.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': item.mime },
        body: blob,
      });
      await api.post('/media/finalize', {
        assetId: asset.assetId,
        size: item.size,
        mime: item.mime,
      });
      if (item.relatedResource && item.relatedId) {
        await api.post('/media/link', {
          resource: item.relatedResource,
          id: item.relatedId,
          assetIds: [asset.assetId],
        });
      }
      await outbox.markMedia(item.id, {
        state: 'COMPLETED',
        completedAt: Date.now(),
        assetId: asset.assetId,
      });
    } else {
      await outbox.markMedia(item.id, {
        state: 'FAILED',
        lastError: 'Storage not configured',
      });
    }
  } catch (err) {
    const attempts = item.attempts + 1;
    await outbox.markMedia(item.id, {
      state: 'PENDING',
      attempts,
      lastError: err instanceof Error ? err.message : String(err),
      nextAttemptAt: Date.now() + backoff(attempts),
    });
  }
}

export async function flushOutbox(): Promise<void> {
  if (!online || running) return;
  running = true;
  status = { ...status, inFlight: true };
  emit();
  try {
    const core = await outbox.dueCore();
    for (const item of core) {
      await runCoreItem(item);
    }
    const media = await outbox.dueMedia();
    for (const item of media) {
      await runMediaItem(item);
    }
  } finally {
    running = false;
    status = { ...status, inFlight: false };
    await refreshCounts();
  }
}

export function startSyncEngine(): void {
  if (unsubscribe) return;
  unsubscribe = NetInfo.addEventListener((state) => {
    online = !!state.isConnected && state.isInternetReachable !== false;
    status = { ...status, online };
    emit();
    if (online) {
      void flushOutbox();
    }
  });
  ticker = setInterval(() => {
    void flushOutbox();
  }, 15000);
  void refreshCounts();
}

export function stopSyncEngine(): void {
  unsubscribe?.();
  unsubscribe = null;
  if (ticker) clearInterval(ticker);
  ticker = null;
}

export async function forceSync(): Promise<void> {
  await outbox.retryAll();
  await flushOutbox();
}
