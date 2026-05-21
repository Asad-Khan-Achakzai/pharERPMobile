import { api, unwrap } from './client';
import type { ID } from '@/domain/types';

export interface AssignableUser {
  _id: ID;
  name: string;
  email?: string;
}

export const usersApi = {
  async assignable(search = '', limit = 20, scope?: 'team'): Promise<AssignableUser[]> {
    const resp = await api.get('/users/assignable', {
      params: {
        limit,
        ...(search ? { search } : {}),
        ...(scope ? { scope } : {}),
      },
    });
    return unwrap<AssignableUser[]>(resp);
  },
};
