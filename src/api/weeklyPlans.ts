import { api, unwrap } from './client';
import type {
  BulkPlanItemInput,
  CheckInConfiguration,
  CpByDay,
  ID,
  PlanItem,
  WeeklyPlan,
  WeeklyPlanDetail
} from '@/domain/types';

export type { WeeklyPlan, WeeklyPlanDetail };

export interface CreateWeeklyPlanInput {
  medicalRepId?: ID;
  weekStartDate: string;
  weekEndDate: string;
  notes?: string;
  status?: WeeklyPlan['status'];
  approvalRequired?: boolean;
  cpByDay?: Record<string, string | null>;
}

export interface UpdateWeeklyPlanInput {
  notes?: string;
  medicalRepId?: ID;
  weekStartDate?: string;
  weekEndDate?: string;
  status?: WeeklyPlan['status'];
  checkInConfiguration?: CheckInConfiguration | null;
  cpByDay?: Record<string, string | null> | null;
}

export type { CpByDay };

export const weeklyPlansApi = {
  /**
   * Backend: `GET /weekly-plans` → ApiResponse.paginated (`data: docs[]`).
   */
  async list(
    params: {
      status?: string;
      medicalRepId?: ID;
      scope?: 'self' | 'team';
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<WeeklyPlan[]> {
    const resp = await api.get('/weekly-plans', { params });
    const data = unwrap<WeeklyPlan[]>(resp);
    return Array.isArray(data) ? data : [];
  },

  async create(body: CreateWeeklyPlanInput): Promise<WeeklyPlan> {
    const resp = await api.post('/weekly-plans', body);
    return unwrap<WeeklyPlan>(resp);
  },

  /** Backend: `GET /weekly-plans/:id` → plan + `planItems` + `editLock`. */
  async getById(id: ID): Promise<WeeklyPlanDetail> {
    const resp = await api.get(`/weekly-plans/${id}`);
    return unwrap<WeeklyPlanDetail>(resp);
  },

  async update(id: ID, body: UpdateWeeklyPlanInput): Promise<WeeklyPlan> {
    const resp = await api.put(`/weekly-plans/${id}`, body);
    return unwrap<WeeklyPlan>(resp);
  },

  /** Backend: `POST /weekly-plans/:id/plan-items` with `{ items: [...] }`. */
  async bulkPlanItems(id: ID, items: BulkPlanItemInput[]): Promise<PlanItem[]> {
    const resp = await api.post(`/weekly-plans/${id}/plan-items`, { items });
    return unwrap<PlanItem[]>(resp);
  },

  async pendingApprovals(): Promise<WeeklyPlan[]> {
    const resp = await api.get('/weekly-plans/pending-approvals');
    const data = unwrap<unknown>(resp);
    if (Array.isArray(data)) return data as WeeklyPlan[];
    if (data && typeof data === 'object' && Array.isArray((data as { docs?: unknown }).docs)) {
      return (data as { docs: WeeklyPlan[] }).docs;
    }
    return [];
  },

  async submit(id: ID): Promise<WeeklyPlan> {
    const resp = await api.post(`/weekly-plans/${id}/submit`);
    return unwrap<WeeklyPlan>(resp);
  },

  async approve(id: ID): Promise<WeeklyPlan> {
    const resp = await api.post(`/weekly-plans/${id}/approve`);
    return unwrap<WeeklyPlan>(resp);
  },

  async reject(id: ID, reason: string): Promise<WeeklyPlan> {
    const resp = await api.post(`/weekly-plans/${id}/reject`, { reason });
    return unwrap<WeeklyPlan>(resp);
  },

  async copyPreviousWeek(id: ID): Promise<WeeklyPlanDetail> {
    const resp = await api.post(`/weekly-plans/${id}/copy-previous-week`);
    return unwrap<WeeklyPlanDetail>(resp);
  },

  async optimizeRoute(
    id: ID,
    body: {
      date: string;
      startLat?: number | null;
      startLng?: number | null;
      itemCoordinates?: Record<string, { lat: number; lng: number }>;
    }
  ): Promise<unknown> {
    const resp = await api.post(`/weekly-plans/${id}/optimize-route`, body);
    return unwrap(resp);
  },
};
