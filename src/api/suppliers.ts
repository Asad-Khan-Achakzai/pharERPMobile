import { api, unwrap } from './client';
import type { ID } from '@/domain/types';

export interface Supplier {
  _id: ID;
  name: string;
  city?: string;
  phone?: string;
  isActive?: boolean;
}

export const suppliersApi = {
  async lookup(search = '', limit = 25): Promise<Supplier[]> {
    const resp = await api.get('/suppliers/lookup', {
      params: { search: search || undefined, limit, isActive: 'true' },
    });
    return unwrap<Supplier[]>(resp);
  },
};
