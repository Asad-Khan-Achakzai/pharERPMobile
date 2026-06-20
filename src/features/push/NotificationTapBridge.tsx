import * as React from 'react';
import { useAuthStore } from '@/state/authStore';
import { isPushSupportedInThisBuild } from '@/features/push/registerPush';
import { openNotificationTargetFromPushData } from '@/features/notifications/notificationNavigation';

/**
 * Handles system push notification taps (foreground, background, cold start).
 */
export function NotificationTapBridge() {
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const accessToken = useAuthStore((s) => s.accessToken);

  React.useEffect(() => {
    if (!bootstrapped || !accessToken || !isPushSupportedInThisBuild()) return;

    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const Notifications = await import('expo-notifications');

      const handleResponse = (response: {
        notification: {
          date?: number;
          request: { content: { data?: Record<string, unknown> } };
        };
      }) => {
        const data = response.notification.request.content.data;
        setTimeout(() => {
          void openNotificationTargetFromPushData(data);
        }, 400);
      };

      const last = await Notifications.getLastNotificationResponseAsync();
      if (!cancelled && last?.notification?.date) {
        const openedMsAgo = Date.now() - last.notification.date * 1000;
        if (openedMsAgo >= 0 && openedMsAgo < 15_000) {
          handleResponse(last);
        }
      }

      subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [bootstrapped, accessToken]);

  return null;
}
