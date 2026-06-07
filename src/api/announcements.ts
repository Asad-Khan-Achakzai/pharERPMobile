import { api, unwrap } from './client';
import type { ID } from '@/domain/types';

export interface AnnouncementItem {
  _id: ID;
  title: string;
  body: string;
  publishedAt?: string;
  createdAt?: string;
}

export const announcementsApi = {
  async feed(): Promise<AnnouncementItem[]> {
    try {
      const resp = await api.get('/announcements/feed', { params: { limit: 20 } });
      const data = resp.data;
      const rows = data.data ?? data;
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  },
};
