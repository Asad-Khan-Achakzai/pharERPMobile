import { api, unwrap } from './client';
import type { ID, PlanItem, TodayBundle, VisitLog } from '@/domain/types';

/**
 * Aligns with backend `markVisitSchema` in
 * `pharmaERPBackend/src/validators/planItem.validator.js`.
 */
export interface MarkVisitInput {
  notes?: string;
  orderTaken?: boolean;
  visitTime?: string;
  checkInTime?: string;
  checkOutTime?: string;
  location?: { lat: number; lng: number };
  doctorId?: ID | null;
  productsDiscussed?: ID[];
  primaryProductId?: ID | null;
  samplesQty?: number | null;
  samplesGiven?: string | null;
  followUpDate?: string | null;
  outOfOrderReason?: string | null;
  clientUuid?: string;
}

/**
 * Aligns with backend `unplannedVisitSchema`.
 */
export interface UnplannedVisitInput {
  doctorId: ID;
  unplannedReason: 'EMERGENCY' | 'AVAILABLE_UNEXPECTEDLY' | 'OTHER';
  notes?: string;
  orderTaken?: boolean;
  visitTime?: string;
  checkInTime?: string;
  checkOutTime?: string;
  location?: { lat: number; lng: number };
  productsDiscussed?: ID[];
  primaryProductId?: ID | null;
  samplesQty?: number | null;
  samplesGiven?: string | null;
  followUpDate?: string | null;
  clientUuid?: string;
}

/**
 * Aligns with backend `reorderPlanItemsSchema`.
 */
export interface ReorderPlanItemsInput {
  weeklyPlanId: ID;
  date: string;
  orderedPlanItemIds: ID[];
}

export const planItemsApi = {
  /**
   * Returns the full Today Execution bundle (not just the items array).
   * Backend: `GET /plan-items/today` → ApiResponse.success(res, buildTodayExecution(...))
   */
  async listToday(params?: { date?: string; employeeId?: ID }): Promise<TodayBundle> {
    const resp = await api.get('/plan-items/today', { params });
    return unwrap<TodayBundle>(resp);
  },
  async markVisit(planItemId: ID, input: MarkVisitInput): Promise<PlanItem> {
    const { clientUuid, ...body } = input;
    const resp = await api.post(`/plan-items/${planItemId}/mark-visit`, body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
    return unwrap<PlanItem>(resp);
  },
  async reorder(input: ReorderPlanItemsInput): Promise<unknown> {
    const resp = await api.put('/plan-items/reorder', input);
    return unwrap(resp);
  },
};

export const visitsApi = {
  async unplanned(input: UnplannedVisitInput): Promise<VisitLog> {
    const { clientUuid, ...body } = input;
    const resp = await api.post('/visits/unplanned', body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
    return unwrap<VisitLog>(resp);
  },
};
