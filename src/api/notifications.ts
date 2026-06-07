import { api, unwrap } from './client';
import type { ID } from '@/domain/types';

export interface NotificationItem {
  _id: ID;
  title: string;
  body?: string;
  kind?: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export const notificationsApi = {
  async feed(): Promise<NotificationItem[]> {
    try {
      const resp = await api.get('/notifications/feed', { params: { limit: 50 } });
      const data = resp.data;
      const rows = data.data ?? data;
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  },
  async markRead(id: ID): Promise<void> {
    await api.post(`/notifications/${id}/read`).catch(() => undefined);
  },
};
