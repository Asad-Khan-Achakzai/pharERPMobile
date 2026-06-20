import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { api, ApiError } from '@/api/client';
import { outbox, backoff, type CoreOutboxItem, type MediaOutboxItem } from './outbox';
import { attendanceLocal } from './attendanceLocal';
import { attendanceApi } from '@/api/attendance';
import { localEntities } from './localEntities';
import { useAuthStore } from '@/state/authStore';
import {
  connectionFromNetInfo,
  type ConnectionInfo,
  type ConnectionStrength,
  type ConnectionType,
} from '@/features/sync/connectionStatus';

let running = false;
let online = true;
let unsubscribe: (() => void) | null = null;
let listeners = new Set<() => void>();
let attendanceRefreshListeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

export type { ConnectionStrength, ConnectionType };

export interface SyncStatus {
  online: boolean;
  connectionType: ConnectionType;
  connectionStrength: ConnectionStrength;
  connectionLabel: string;
  inFlight: boolean;
  pending: { core: number; media: number; failed: number };
}

function applyConnection(info: ConnectionInfo): void {
  online = info.online;
  status = {
    ...status,
    online: info.online,
    connectionType: info.type,
    connectionStrength: info.strength,
    connectionLabel: info.label,
  };
}

let status: SyncStatus = {
  online: true,
  connectionType: 'unknown',
  connectionStrength: 3,
  connectionLabel: 'Online',
  inFlight: false,
  pending: { core: 0, media: 0, failed: 0 },
};

function syncConnectionFromNetInfo(state: NetInfoState): void {
  applyConnection(connectionFromNetInfo(state));
}

export function subscribeSyncStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Fired after an attendance outbox item syncs and server me/today is refreshed. */
export function subscribeAttendanceRefresh(fn: () => void): () => void {
  attendanceRefreshListeners.add(fn);
  return () => {
    attendanceRefreshListeners.delete(fn);
  };
}

function emitAttendanceRefresh() {
  for (const l of attendanceRefreshListeners) l();
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

export async function refreshOnlineStatus(): Promise<boolean> {
  const state = await NetInfo.fetch();
  syncConnectionFromNetInfo(state);
  emit();
  return online;
}

async function hasPendingAttendanceOutbox(): Promise<boolean> {
  const rows = await outbox.listCoreActive();
  return rows.some(
    (row) =>
      row.feature === 'attendance' && (row.state === 'PENDING' || row.state === 'IN_FLIGHT'),
  );
}

async function runCoreItem(item: CoreOutboxItem) {
  if (item.feature === 'visit' && (await hasPendingAttendanceOutbox())) {
    await outbox.markCore(item.id, {
      nextAttemptAt: Date.now() + 5000,
      lastError: 'Waiting for attendance check-in to sync first',
      lastStatus: null,
    });
    return;
  }

  await localEntities.updateSyncState(item.clientUuid, 'syncing').catch(() => {});
  await outbox.markCore(item.id, { state: 'IN_FLIGHT' });
  try {
    const body = item.bodyJson ? JSON.parse(item.bodyJson) : undefined;
    await api.request({
      method: item.method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      url: item.path,
      data: body,
      headers: { 'X-Client-Uuid': item.clientUuid },
    });
    await outbox.markCore(item.id, {
      state: 'COMPLETED',
      completedAt: Date.now(),
      lastError: null,
    });
    await localEntities.remove(item.clientUuid).catch(() => {});
    if (item.feature === 'attendance') {
      const uid = useAuthStore.getState().user?._id;
      if (uid) {
        const uidStr = String(uid);
        await attendanceLocal.clearLocal(uidStr);
        try {
          const fresh = await attendanceApi.meToday();
          if (fresh) {
            await attendanceLocal.cacheMeToday(uidStr, fresh);
          }
          emitAttendanceRefresh();
        } catch {
          /* server me/today refresh is best-effort after sync */
        }
      }
    }
  } catch (err) {
    const httpStatus = err instanceof ApiError ? err.status : 0;
    const attempts = item.attempts + 1;
    const fatal =
      httpStatus === 400 ||
      httpStatus === 422 ||
      httpStatus === 409 ||
      httpStatus === 403 ||
      attempts >= 12;
    await outbox.markCore(item.id, {
      state: fatal ? 'FAILED' : 'PENDING',
      attempts,
      lastError: err instanceof Error ? err.message : String(err),
      lastStatus: httpStatus,
      nextAttemptAt: Date.now() + backoff(attempts),
    });
    await localEntities
      .updateSyncState(item.clientUuid, fatal ? 'failed' : 'pending')
      .catch(() => {});
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

export async function flushOutbox(opts: { force?: boolean } = {}): Promise<void> {
  if (opts.force) {
    await refreshOnlineStatus();
  }
  if (!online && !opts.force) return;
  if (running) return;

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

export async function resetSyncStatusAfterSessionChange(): Promise<void> {
  status = { ...status, inFlight: false };
  await refreshCounts();
}

export function startSyncEngine(): void {
  if (unsubscribe) return;

  void outbox.recoverStaleInFlight().then(() => refreshCounts());

  void refreshOnlineStatus().then((isOnline) => {
    if (isOnline) void flushOutbox();
  });

  unsubscribe = NetInfo.addEventListener((state) => {
    syncConnectionFromNetInfo(state);
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
  await refreshOnlineStatus();
  await outbox.retryAll();

  // If a background flush is still running, wait briefly so manual sync can proceed.
  let waits = 0;
  while (running && waits < 60) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    waits += 1;
  }

  await flushOutbox({ force: true });
}
