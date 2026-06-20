import * as React from 'react';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { attendanceOffline } from '@/data/attendanceOffline';
import { useAuthStore } from '@/state/authStore';
import {
  canUseBackgroundLocation,
  isBackgroundLiveTrackingRunning,
  startBackgroundLiveTracking,
  stopBackgroundLiveTracking,
} from '@/features/tracking/backgroundLocationService';
import { tickLiveTracking } from '@/features/tracking/liveTracking';

/**
 * Starts background location updates while checked in (custom builds only).
 * In Expo Go, sends a single foreground heartbeat instead — background GPS crashes the host app.
 */
export function useLiveTracking(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const serverConfig = useAuthStore((s) => s.serverConfig);
  const enabled = !!serverConfig?.liveTracking?.enabled;
  const intervalMs = serverConfig?.liveTracking?.heartbeatIntervalMs ?? 5 * 60 * 1000;
  const maxAccuracyMeters = serverConfig?.liveTracking?.maxAccuracyMeters;

  const today = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceOffline.meToday(),
    enabled: !!accessToken && enabled,
    refetchInterval: 60_000,
  });

  const checkedIn = !!today.data?.checkInTime && !today.data?.checkOutTime;

  React.useEffect(() => {
    if (!accessToken || !enabled) {
      void stopBackgroundLiveTracking();
      return undefined;
    }

    if (!checkedIn) {
      void stopBackgroundLiveTracking();
      return undefined;
    }

    let cancelled = false;

    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          if (!canUseBackgroundLocation()) {
            if (!cancelled) await tickLiveTracking();
            return;
          }

          const result = await startBackgroundLiveTracking({
            heartbeatIntervalMs: intervalMs,
            maxAccuracyMeters,
          });
          if (!cancelled) {
            await tickLiveTracking();
          }
          if (!cancelled && !result.started) {
            /* background unavailable — foreground ping above is enough for now */
          }
        } catch {
          /* permissions denied or native limitation */
        }
      })();
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [accessToken, enabled, checkedIn, intervalMs, maxAccuracyMeters]);

  React.useEffect(() => {
    if (!enabled || !checkedIn) return undefined;

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void isBackgroundLiveTrackingRunning().then((running) => {
          if (running || !canUseBackgroundLocation()) {
            void tickLiveTracking();
          }
        });
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [enabled, checkedIn]);
}
