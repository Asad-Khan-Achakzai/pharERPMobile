/**
 * Offline-aware expense list helpers (Phase 4).
 */
import { expensesApi } from '@/api/expenses';
import { isOfflineApiError } from './masterSync';
import { pendingSync } from './pendingSync';
import type { Expense } from '@/domain/types';

export const expensesQueries = {
  async list(params: Parameters<typeof expensesApi.list>[0] = {}): Promise<{ items: Expense[]; total: number }> {
    try {
      const result = await expensesApi.list(params);
      const items = await pendingSync.mergeExpenses(result.items);
      const extra = items.length - result.items.length;
      return { items: items as Expense[], total: result.total + extra };
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      const items = (await pendingSync.mergeExpenses([])) as Expense[];
      return { items, total: items.length };
    }
  },
};
