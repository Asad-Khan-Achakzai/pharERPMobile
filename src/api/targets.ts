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

export const targetsApi = {
  async myCurrent(): Promise<TargetSummary> {
    try {
      const resp = await api.get('/targets/me/current');
      return unwrap<TargetSummary>(resp);
    } catch {
      return {};
    }
  },
};
