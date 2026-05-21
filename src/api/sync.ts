import { api, unwrap } from './client';
import type { ServerConfig } from '@/domain/types';

export const syncApi = {
  async getServerConfig(): Promise<ServerConfig> {
    const resp = await api.get('/sync/server-config');
    return unwrap<ServerConfig>(resp);
  },

  async getServerTime(): Promise<{ now: string }> {
    const resp = await api.get('/sync/server-time');
    return unwrap<{ now: string }>(resp);
  },
};
