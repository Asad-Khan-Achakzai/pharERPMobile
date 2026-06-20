import { api, unwrap } from './client';
import type { ID } from '@/domain/types';

export interface TargetSummary {
  productTargets?: {
    productId: ID;
    productName?: string;
    qtyTarget?: number;
    qtyAchieved?: number;
    valueTarget?: number;
    valueAchieved?: number;
  }[];
  totals?: {
    qtyTarget?: number;
    qtyAchieved?: number;
    valueTarget?: number;
    valueAchieved?: number;
  };
}

export interface ProductPacksBreakdownRow {
  productId: string;
  productName?: string;
  composition?: string;
  packsTarget?: number;
  netQuantity?: number;
  deliveredQuantity?: number;
  returnedQuantity?: number;
  progressPercent?: number | null;
}

export interface ProductPacksBreakdown {
  month: string;
  medicalRepId: string;
  wholePacksTarget?: number;
  totalNetPacks?: number;
  rows?: ProductPacksBreakdownRow[];
}

export const targetsApi = {
  async myCurrent(): Promise<TargetSummary> {
    try {
      const resp = await api.get('/targets/me/current');
      return unwrap<TargetSummary>(resp);
    } catch {
      return {};
    }
  },

  async packsBreakdown(medicalRepId: ID, month: string): Promise<ProductPacksBreakdown> {
    const resp = await api.get('/targets/packs-breakdown', {
      params: { medicalRepId: String(medicalRepId), month },
    });
    return unwrap<ProductPacksBreakdown>(resp);
  },
};
