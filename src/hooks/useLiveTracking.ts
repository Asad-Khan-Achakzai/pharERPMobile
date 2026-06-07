import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceOffline } from '@/data/attendanceOffline';
import { useAuthStore } from '@/state/authStore';
import { tickLiveTracking } from '@/features/tracking/liveTracking';

/**
 * Foreground heartbeat loop while checked in and live tracking is enabled.
 * Offline pings are buffered via outbox_core + syncEngine retry queue.
 */
export function useLiveTracking(): void {
  const serverConfig = useAuthStore((s) => s.serverConfig);
  const enabled = !!serverConfig?.liveTracking?.enabled;
  const intervalMs = serverConfig?.liveTracking?.heartbeatIntervalMs ?? 5 * 60 * 1000;

  const today = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceOffline.meToday(),
    enabled,
    refetchInterval: 60_000,
  });

  const checkedIn = !!today.data?.checkInTime && !today.data?.checkOutTime;

  React.useEffect(() => {
    if (!enabled || !checkedIn) return undefined;

    void tickLiveTracking();
    const id = setInterval(() => {
      void tickLiveTracking();
    }, intervalMs);

    return () => clearInterval(id);
  }, [enabled, checkedIn, intervalMs]);
}
