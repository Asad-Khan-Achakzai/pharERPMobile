import { api, unwrap } from './client';
import type { Distributor, ID, Product } from '@/domain/types';

/**
 * Backend `lookup.service.js` accepts `?search=`. The list endpoint uses
 * `parsePagination` which also reads `search`.
 */
export const productsApi = {
  async lookup(search = '', limit = 50): Promise<Product[]> {
    const resp = await api.get('/products/lookup', { params: { search, limit } });
    return unwrap<Product[]>(resp);
  },
  async list(): Promise<Product[]> {
    const resp = await api.get('/products', { params: { limit: 200 } });
    return (resp.data.data ?? resp.data) as Product[];
  },
};

export const distributorsApi = {
  async lookup(search = '', limit = 50): Promise<Distributor[]> {
    const resp = await api.get('/distributors/lookup', { params: { search, limit } });
    return unwrap<Distributor[]>(resp);
  },
  async list(): Promise<Distributor[]> {
    const resp = await api.get('/distributors', { params: { limit: 200 } });
    return (resp.data.data ?? resp.data) as Distributor[];
  },
  async getById(id: ID): Promise<Distributor> {
    const resp = await api.get(`/distributors/${id}`);
    return unwrap<Distributor>(resp);
  },
};
