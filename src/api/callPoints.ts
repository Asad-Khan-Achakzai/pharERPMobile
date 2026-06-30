import { api, unwrap } from './client';
import type { CallPoint, ID } from '@/domain/types';

export type { CallPoint };

export const callPointsApi = {
  /** Active-only CPs for weekly plan day selection (auth + tenant only). */
  async lookup(params: { search?: string; limit?: number } = {}): Promise<CallPoint[]> {
    const resp = await api.get('/call-points/lookup', { params });
    const data = unwrap<CallPoint[]>(resp);
    return Array.isArray(data) ? data : [];
  },

  async list(params: { search?: string; isActive?: boolean; page?: number; limit?: number } = {}): Promise<
    CallPoint[]
  > {
    const resp = await api.get('/call-points', { params });
    const data = unwrap<CallPoint[]>(resp);
    return Array.isArray(data) ? data : [];
  },

  async getById(id: ID): Promise<CallPoint> {
    const resp = await api.get(`/call-points/${id}`);
    return unwrap<CallPoint>(resp);
  },
};
