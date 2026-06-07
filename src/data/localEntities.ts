/**
 * Shadow rows for offline-created data — merged into list UIs (Phase 4).
 * Keyed by outbox client_uuid; sync_state mirrors outbox_core.state.
 */
import { getDb } from './db';
import type { OutboxState } from './outbox';
import { getSessionOwnerFromAuth } from './sessionLocalData';

export type SyncUiState = 'pending' | 'syncing' | 'synced' | 'failed';

export interface LocalEntityRow {
  clientUuid: string;
  feature: string;
  entityType: string;
  display: Record<string, unknown>;
  syncState: SyncUiState;
  enqueuedAt: number;
  updatedAt: number;
}

function mapOutboxState(state: OutboxState | string, inFlight?: boolean): SyncUiState {
  if (inFlight || state === 'IN_FLIGHT') return 'syncing';
  if (state === 'FAILED') return 'failed';
  if (state === 'COMPLETED' || state === 'DISCARDED') return 'synced';
  return 'pending';
}

export const localEntities = {
  async upsert(args: {
    clientUuid: string;
    feature: string;
    entityType: string;
    display: Record<string, unknown>;
    syncState?: SyncUiState;
  }): Promise<void> {
    const scope = getSessionOwnerFromAuth();
    if (!scope) return;
    const db = await getDb();
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO local_entities (client_uuid, user_id, company_id, feature, entity_type, display_json, sync_state, enqueued_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(client_uuid) DO UPDATE SET
         user_id = excluded.user_id,
         company_id = excluded.company_id,
         feature = excluded.feature,
         entity_type = excluded.entity_type,
         display_json = excluded.display_json,
         sync_state = excluded.sync_state,
         updated_at = excluded.updated_at`,
      [
        args.clientUuid,
        scope.userId,
        scope.companyId,
        args.feature,
        args.entityType,
        JSON.stringify(args.display),
        args.syncState ?? 'pending',
        now,
        now,
      ]
    );
  },

  async updateSyncState(clientUuid: string, syncState: SyncUiState): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE local_entities SET sync_state = ?, updated_at = ? WHERE client_uuid = ?`,
      [syncState, Date.now(), clientUuid]
    );
  },

  async remove(clientUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM local_entities WHERE client_uuid = ?`, [clientUuid]);
  },

  async listByFeature(feature: string): Promise<LocalEntityRow[]> {
    const scope = getSessionOwnerFromAuth();
    if (!scope) return [];
    const db = await getDb();
    const rows = await db.getAllAsync<{
      client_uuid: string;
      feature: string;
      entity_type: string;
      display_json: string;
      sync_state: string;
      enqueued_at: number;
      updated_at: number;
    }>(
      `SELECT * FROM local_entities
       WHERE user_id = ? AND company_id = ? AND feature = ? AND sync_state != 'synced'
       ORDER BY enqueued_at DESC`,
      [scope.userId, scope.companyId, feature]
    );
    return rows.map((r) => ({
      clientUuid: r.client_uuid,
      feature: r.feature,
      entityType: r.entity_type,
      display: JSON.parse(r.display_json) as Record<string, unknown>,
      syncState: r.sync_state as SyncUiState,
      enqueuedAt: r.enqueued_at,
      updatedAt: r.updated_at,
    }));
  },

  async listActive(): Promise<LocalEntityRow[]> {
    const scope = getSessionOwnerFromAuth();
    if (!scope) return [];
    const db = await getDb();
    const rows = await db.getAllAsync<{
      client_uuid: string;
      feature: string;
      entity_type: string;
      display_json: string;
      sync_state: string;
      enqueued_at: number;
      updated_at: number;
    }>(
      `SELECT * FROM local_entities
       WHERE user_id = ? AND company_id = ? AND sync_state IN ('pending', 'syncing', 'failed')
       ORDER BY enqueued_at DESC`,
      [scope.userId, scope.companyId]
    );
    return rows.map((r) => ({
      clientUuid: r.client_uuid,
      feature: r.feature,
      entityType: r.entity_type,
      display: JSON.parse(r.display_json) as Record<string, unknown>,
      syncState: r.sync_state as SyncUiState,
      enqueuedAt: r.enqueued_at,
      updatedAt: r.updated_at,
    }));
  },

  async syncFromOutbox(
    items: Array<{ clientUuid: string; feature: string; state: OutboxState }>
  ): Promise<void> {
    for (const item of items) {
      const ui = mapOutboxState(item.state);
      if (ui === 'synced') {
        await localEntities.remove(item.clientUuid);
      } else {
        await localEntities.updateSyncState(item.clientUuid, ui);
      }
    }
  },

  mapOutboxState,
};
