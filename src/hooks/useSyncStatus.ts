import { useEffect, useState } from 'react';
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/data/syncEngine';

export function useSyncStatus(): SyncStatus {
  const [state, setState] = useState<SyncStatus>(() => getSyncStatus());
  useEffect(() => {
    return subscribeSyncStatus(() => setState({ ...getSyncStatus() }));
  }, []);
  return state;
}
