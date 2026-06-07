/**
 * Offline-aware order list helpers (Phase 4).
 */
import { ordersApi } from '@/api/orders';
import { isOfflineApiError } from './masterSync';
import { pendingSync } from './pendingSync';
import type { Order } from '@/domain/types';

export const ordersQueries = {
  async list(
    params: Parameters<typeof ordersApi.list>[0] = {}
  ): Promise<{ items: Order[]; total: number; page: number; limit: number }> {
    try {
      const result = await ordersApi.list(params);
      const items = await pendingSync.mergeOrders(result.items);
      const extra = items.length - result.items.length;
      return {
        ...result,
        items: items as Order[],
        total: result.total + extra,
      };
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      const items = (await pendingSync.mergeOrders([])) as Order[];
      return {
        items,
        total: items.length,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      };
    }
  },
};
