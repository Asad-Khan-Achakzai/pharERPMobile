import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { canOpenManagerLeaf } from '@/auth/navigation';
import { notificationsApi } from '@/api/notifications';
import { useAuthStore } from '@/state/authStore';

export type NotificationTarget = {
  link?: string | null;
  kind?: string | null;
  notificationId?: string | null;
};

/** Map backend notification links to expo-router paths. */
export function resolveNotificationRoute(link?: string | null, kind?: string | null): Href | null {
  const trimmed = link?.trim();
  if (trimmed) {
    if (trimmed === '/approvals' || trimmed.endsWith('/approvals')) {
      return '/(manager)/approvals';
    }
    if (trimmed.startsWith('/(manager)/') || trimmed.startsWith('/(tabs)/')) {
      return trimmed as Href;
    }
    if (trimmed.startsWith('/')) {
      return trimmed as Href;
    }
  }

  if (kind === 'ATTENDANCE') {
    return '/(manager)/approvals';
  }

  return null;
}

export async function openNotificationTarget(target: NotificationTarget): Promise<boolean> {
  const route = resolveNotificationRoute(target.link, target.kind);
  if (!route) return false;

  const user = useAuthStore.getState().user;
  if (route.includes('approvals') && !canOpenManagerLeaf(user, 'approvals')) {
    router.push('/notifications');
    return true;
  }

  if (target.notificationId) {
    await notificationsApi.markRead(target.notificationId);
  }

  router.push(route);
  return true;
}

export function openNotificationTargetFromPushData(
  data: Record<string, unknown> | undefined,
): Promise<boolean> {
  if (!data) return Promise.resolve(false);
  return openNotificationTarget({
    link: typeof data.link === 'string' ? data.link : null,
    kind: typeof data.kind === 'string' ? data.kind : null,
    notificationId: typeof data.notificationId === 'string' ? data.notificationId : null,
  });
}
