import * as React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '@/state/authStore';
import { getSyncStatus } from '@/data/syncEngine';
import {
  syncMasterData,
  getMasterSyncMeta,
  isMasterSyncRunning,
  type MasterSyncMeta,
} from '@/data/masterSync';
import { emptyMasterSyncMeta } from '@/data/masterCache';

const RESUME_DEBOUNCE_MS = 5000;
let lastResumeSyncAt = 0;

export function useMasterDataSync() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [meta, setMeta] = React.useState<MasterSyncMeta>(emptyMasterSyncMeta());
  const [syncing, setSyncing] = React.useState(false);

  const refreshMeta = React.useCallback(async () => {
    setMeta(await getMasterSyncMeta());
  }, []);

  const runSync = React.useCallback(
    async (reason: 'login' | 'resume' | 'manual' | 'background' = 'manual') => {
      if (!accessToken || isMasterSyncRunning()) return meta;
      setSyncing(true);
      try {
        const next = await syncMasterData({ reason });
        setMeta(next);
        return next;
      } finally {
        setSyncing(false);
      }
    },
    [accessToken, meta]
  );

  React.useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  return { meta, syncing, runSync, refreshMeta };
}

/** Background master-data sync on app resume (when online + signed in). */
export function MasterDataSyncBridge() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  React.useEffect(() => {
    if (!bootstrapped || !accessToken) return;

    void syncMasterData({ reason: 'background' }).catch(() => {
      /* offline at startup — cache from last session still usable */
    });

    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastResumeSyncAt < RESUME_DEBOUNCE_MS) return;
      if (!getSyncStatus().online) return;
      lastResumeSyncAt = now;
      void syncMasterData({ reason: 'resume' }).catch(() => {});
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [bootstrapped, accessToken]);

  return null;
}

export async function syncMasterDataAfterLogin(skipServerConfig = false): Promise<void> {
  try {
    await syncMasterData({ reason: 'login', skipServerConfig });
  } catch {
    /* login succeeds even if master sync fails — user can retry from Outbox */
  }
}
