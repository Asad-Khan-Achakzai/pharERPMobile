import { api, unwrap } from './client';
import type { ID, Pharmacy, PharmacyBonusScheme } from '@/domain/types';

/**
 * Matches backend `createPharmacySchema` / `updatePharmacySchema` in
 * `pharmaERPBackend/src/validators/pharmacy.validator.js`.
 */
export interface PharmacyCreateInput {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  /** % discount applied to TP on pharmacy bills. Defaults to 0 server-side. */
  discountOnTP?: number;
  bonusScheme?: PharmacyBonusScheme;
}

export interface PharmacyUpdateInput extends Partial<PharmacyCreateInput> {
  isActive?: boolean;
}

export const pharmaciesApi = {
  /** Backend `lookup.service.js` accepts `?search=` (not `?q=`). */
  async lookup(search: string, limit = 20): Promise<Pharmacy[]> {
    const resp = await api.get('/pharmacies/lookup', { params: { search, limit } });
    return unwrap<Pharmacy[]>(resp);
  },

  async list(
    params: { search?: string; page?: number; limit?: number } = {}
  ): Promise<{ items: Pharmacy[]; total: number }> {
    const resp = await api.get('/pharmacies', { params });
    const data = resp.data;
    return {
      items: (data.data ?? data) as Pharmacy[],
      total: data.pagination?.total ?? (Array.isArray(data.data) ? data.data.length : 0),
    };
  },

  async getById(id: ID): Promise<Pharmacy> {
    const resp = await api.get(`/pharmacies/${id}`);
    return unwrap<Pharmacy>(resp);
  },

  async financials(id: ID): Promise<{ outstanding: number; lastOrderAt?: string }> {
    try {
      const resp = await api.get(`/ledger/pharmacy/${id}/summary`);
      return unwrap(resp);
    } catch {
      return { outstanding: 0 };
    }
  },

  async create(payload: PharmacyCreateInput): Promise<Pharmacy> {
    const resp = await api.post('/pharmacies', payload);
    return unwrap<Pharmacy>(resp);
  },

  async update(id: ID, payload: PharmacyUpdateInput): Promise<Pharmacy> {
    const resp = await api.put(`/pharmacies/${id}`, payload);
    return unwrap<Pharmacy>(resp);
  },
};
