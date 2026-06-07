/**
 * Merges local shadow entities into list query results (Phase 4).
 */
import { localEntities } from './localEntities';
import type { Expense, Order, PlanItem, TodayBundle } from '@/domain/types';
import type { SyncUiState } from './localEntities';

export type { SyncUiState };

export function withSyncState<T extends { _id?: string; clientUuid?: string }>(
  item: T,
  syncState: SyncUiState
): T & { _syncState: SyncUiState; _localPending?: boolean } {
  return {
    ...item,
    _syncState: syncState,
    _localPending: syncState === 'pending' || syncState === 'syncing' || syncState === 'failed',
  };
}

export const pendingSync = {
  async mergeOrders(serverItems: Order[]): Promise<Array<Order & { _syncState?: SyncUiState; _localPending?: boolean }>> {
    const pending = await localEntities.listByFeature('order');
    const serverIds = new Set(serverItems.map((o) => String(o._id)));
    const shadows = pending
      .filter((p) => !serverIds.has(String(p.display._id)))
      .map((p) =>
        withSyncState(
          {
            ...(p.display as unknown as Order),
            _id: String(p.display._id ?? `local:${p.clientUuid}`),
            clientUuid: p.clientUuid,
            status: (p.display.status as Order['status']) ?? 'PENDING',
          },
          p.syncState
        )
      );
    return [...shadows, ...serverItems.map((o) => withSyncState(o, 'synced'))];
  },

  async mergeTodayVisits(bundle: TodayBundle): Promise<TodayBundle> {
    const pending = await localEntities.listByFeature('visit');
    const serverVisitedIds = new Set(
      bundle.items.filter((i) => i.status === 'VISITED').map((i) => String(i._id))
    );

    let items = [...bundle.items];
    for (const p of pending) {
      const planItemId = p.display.planItemId as string | undefined;
      if (planItemId && items.some((i) => String(i._id) === String(planItemId))) {
        items = items.map((item) =>
          String(item._id) === String(planItemId)
            ? withSyncState(
                {
                  ...item,
                  status: 'VISITED' as PlanItem['status'],
                  actualVisitTime: String(p.display.visitTime ?? new Date().toISOString()),
                },
                p.syncState
              )
            : item
        );
      } else if (!planItemId || !serverVisitedIds.has(String(planItemId))) {
        items.unshift(
          withSyncState(
            {
              _id: String(p.display._id ?? `local:${p.clientUuid}`),
              date: String(p.display.date ?? bundle.date),
              status: 'VISITED' as PlanItem['status'],
              type: 'DOCTOR_VISIT',
              employeeId: '',
              weeklyPlanId: '',
              doctorId: {
                _id: 'local',
                name: String(p.display.doctorName ?? 'Doctor'),
                specialization: p.display.specialization as string | undefined,
              },
              actualVisitTime: String(p.display.visitTime ?? new Date().toISOString()),
              isUnplanned: Boolean(p.display.isUnplanned),
              notes: p.display.notes as string | undefined,
              clientUuid: p.clientUuid,
            } as PlanItem,
            p.syncState
          )
        );
      }
    }

    const summary = {
      total: items.length,
      pending: items.filter((i) => i.status === 'PENDING').length,
      visited: items.filter((i) => i.status === 'VISITED').length,
      missed: items.filter((i) => i.status === 'MISSED').length,
    };
    return { ...bundle, items, summary };
  },

  async mergeExpenses(
    serverItems: Expense[]
  ): Promise<Array<Expense & { _syncState?: SyncUiState; _localPending?: boolean }>> {
    const pending = await localEntities.listByFeature('expense');
    const shadows = pending.map((p) =>
      withSyncState(
        {
          ...(p.display as unknown as Expense),
          _id: String(p.display._id ?? `local:${p.clientUuid}`),
          clientUuid: p.clientUuid,
        },
        p.syncState
      )
    );
    return [...shadows, ...serverItems.map((e) => withSyncState(e, 'synced'))];
  },

  async getSyncStateForClientUuid(clientUuid: string): Promise<SyncUiState | null> {
    const active = await localEntities.listActive();
    return active.find((e) => e.clientUuid === clientUuid)?.syncState ?? null;
  },
};
