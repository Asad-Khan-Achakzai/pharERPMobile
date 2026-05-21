import { api, unwrap } from './client';
import type { Doctor, ID, VisitLog } from '@/domain/types';

export interface DoctorListParams {
  /** Backend `parsePagination` reads `search`, not `q`. */
  search?: string;
  isActive?: boolean | 'true' | 'false';
  territoryId?: ID;
  underTerritoryId?: ID;
  assignedRepId?: ID;
  pharmacyId?: ID;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface DoctorLookupParams {
  search?: string;
  limit?: number;
  /**
   * Restrict to doctors linked to a specific pharmacy. Matches the web
   * call `doctorsService.lookup({ pharmacyId, ... })` used by
   * `CreateOrderPage.tsx`. Server filters by `Doctor.pharmacyId`.
   */
  pharmacyId?: ID;
  /** Same filters as `GET /doctors` list — available on `/doctors/lookup` (no doctors.view). */
  territoryId?: ID;
  underTerritoryId?: ID;
  assignedRepId?: ID;
  isActive?: 'true' | 'false';
}

/**
 * Lookup returns a lightweight projection; see `lookup.service.js` doctors() —
 * `{ _id, name, pharmacyId, specialization, doctorBrick, doctorCode, city, zone }`.
 *
 * NOTE: positional overload kept for backwards compatibility with existing
 * callers (`doctorsApi.lookup('search', 20)`). New code should pass the
 * object form to enable `pharmacyId` / `isActive` filters.
 */
export const doctorsApi = {
  async lookup(
    searchOrParams: string | DoctorLookupParams = '',
    limit = 20
  ): Promise<Doctor[]> {
    const params: Record<string, string | number> =
      typeof searchOrParams === 'string'
        ? { search: searchOrParams, limit }
        : {
            limit: searchOrParams.limit ?? limit,
            ...(searchOrParams.search ? { search: searchOrParams.search } : {}),
            ...(searchOrParams.pharmacyId
              ? { pharmacyId: String(searchOrParams.pharmacyId) }
              : {}),
            ...(searchOrParams.territoryId
              ? { territoryId: String(searchOrParams.territoryId) }
              : {}),
            ...(searchOrParams.underTerritoryId
              ? { underTerritoryId: String(searchOrParams.underTerritoryId) }
              : {}),
            ...(searchOrParams.assignedRepId
              ? { assignedRepId: String(searchOrParams.assignedRepId) }
              : {}),
            ...(searchOrParams.isActive ? { isActive: searchOrParams.isActive } : {}),
          };
    const resp = await api.get('/doctors/lookup', { params });
    return unwrap<Doctor[]>(resp);
  },

  async list(params: DoctorListParams = {}): Promise<{ items: Doctor[]; total: number }> {
    const resp = await api.get('/doctors', { params });
    const data = resp.data;
    return {
      items: (data.data ?? data) as Doctor[],
      total: data.pagination?.total ?? (Array.isArray(data.data) ? data.data.length : 0),
    };
  },

  async getById(id: ID): Promise<Doctor> {
    const resp = await api.get(`/doctors/${id}`);
    return unwrap<Doctor>(resp);
  },

  async create(payload: Partial<Doctor>): Promise<Doctor> {
    const resp = await api.post('/doctors', payload);
    return unwrap<Doctor>(resp);
  },

  async update(id: ID, payload: Partial<Doctor>): Promise<Doctor> {
    const resp = await api.put(`/doctors/${id}`, payload);
    return unwrap<Doctor>(resp);
  },

  /**
   * Assignment workflow — mirrors web's `PATCH /doctors/:id/assign`. Required
   * permission `doctors.assign`. Only the four assignment fields are accepted
   * by the backend (`assignDoctorSchema`).
   */
  async assign(
    id: ID,
    payload: {
      territoryId?: ID | null;
      assignedRepId?: ID | null;
      monthlyVisitTarget?: number | null;
      tier?: string | null;
    }
  ): Promise<Doctor> {
    const resp = await api.patch(`/doctors/${id}/assign`, payload);
    return unwrap<Doctor>(resp);
  },

  /**
   * Doctor-scoped visit history endpoint isn't exposed yet on the backend.
   * This safely returns an empty list while we wait for `/visits?doctorId=…`.
   */
  async visitHistory(_id: ID, _limit = 20): Promise<VisitLog[]> {
    return [];
  },
};
