import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';

export type OutboxState = 'PENDING' | 'IN_FLIGHT' | 'COMPLETED' | 'FAILED' | 'DISCARDED';

export interface CoreOutboxItem {
  id: number;
  clientUuid: string;
  feature: string;
  action: string;
  method: string;
  path: string;
  bodyJson: string | null;
  state: OutboxState;
  attempts: number;
  lastError: string | null;
  lastStatus: number | null;
  enqueuedAt: number;
  nextAttemptAt: number;
  completedAt: number | null;
}

export interface MediaOutboxItem {
  id: number;
  clientUuid: string;
  feature: string;
  kind: string;
  fileUri: string;
  mime: string;
  size: number | null;
  relatedResource: string | null;
  relatedId: string | null;
  state: OutboxState;
  assetId: string | null;
  attempts: number;
  lastError: string | null;
  enqueuedAt: number;
  nextAttemptAt: number;
  completedAt: number | null;
}

interface EnqueueCoreArgs {
  feature: string;
  action: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  clientUuid?: string;
}

interface EnqueueMediaArgs {
  feature: string;
  kind:
    | 'VISIT_PHOTO'
    | 'ATTENDANCE_SELFIE'
    | 'EXPENSE_RECEIPT'
    | 'PAYMENT_RECEIPT'
    | 'PRODUCT_VISUAL'
    | 'OTHER';
  fileUri: string;
  mime: string;
  size?: number;
  relatedResource?: string;
  relatedId?: string;
  clientUuid?: string;
}

export const outbox = {
  async enqueueCore(args: EnqueueCoreArgs): Promise<string> {
    const db = await getDb();
    const clientUuid = args.clientUuid ?? uuidv4();
    const now = Date.now();
    await db.runAsync(
      `INSERT OR REPLACE INTO outbox_core
       (client_uuid, feature, action, method, path, body_json, state, attempts, enqueued_at, next_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, 0)`,
      [
        clientUuid,
        args.feature,
        args.action,
        args.method,
        args.path,
        args.body !== undefined ? JSON.stringify(args.body) : null,
        now,
      ],
    );
    return clientUuid;
  },

  async enqueueMedia(args: EnqueueMediaArgs): Promise<string> {
    const db = await getDb();
    const clientUuid = args.clientUuid ?? uuidv4();
    const now = Date.now();
    await db.runAsync(
      `INSERT OR REPLACE INTO outbox_media
       (client_uuid, feature, kind, file_uri, mime, size, related_resource, related_id, state, attempts, enqueued_at, next_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, 0)`,
      [
        clientUuid,
        args.feature,
        args.kind,
        args.fileUri,
        args.mime,
        args.size ?? null,
        args.relatedResource ?? null,
        args.relatedId ?? null,
        now,
      ],
    );
    return clientUuid;
  },

  async listCore(state?: OutboxState): Promise<CoreOutboxItem[]> {
    const db = await getDb();
    const where = state ? 'WHERE state = ?' : '';
    const rows = (await db.getAllAsync(
      `SELECT * FROM outbox_core ${where} ORDER BY enqueued_at DESC LIMIT 200`,
      state ? [state] : [],
    )) as any[];
    return rows.map(rowToCore);
  },

  async listMedia(state?: OutboxState): Promise<MediaOutboxItem[]> {
    const db = await getDb();
    const where = state ? 'WHERE state = ?' : '';
    const rows = (await db.getAllAsync(
      `SELECT * FROM outbox_media ${where} ORDER BY enqueued_at DESC LIMIT 200`,
      state ? [state] : [],
    )) as any[];
    return rows.map(rowToMedia);
  },

  async dueCore(now = Date.now()): Promise<CoreOutboxItem[]> {
    const db = await getDb();
    const rows = (await db.getAllAsync(
      `SELECT * FROM outbox_core
       WHERE state = 'PENDING' AND next_attempt_at <= ?
       ORDER BY enqueued_at ASC LIMIT 20`,
      [now],
    )) as any[];
    return rows.map(rowToCore);
  },

  async dueMedia(now = Date.now()): Promise<MediaOutboxItem[]> {
    const db = await getDb();
    const rows = (await db.getAllAsync(
      `SELECT * FROM outbox_media
       WHERE state = 'PENDING' AND next_attempt_at <= ?
       ORDER BY enqueued_at ASC LIMIT 5`,
      [now],
    )) as any[];
    return rows.map(rowToMedia);
  },

  async markCore(id: number, patch: Partial<CoreOutboxItem>): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (patch.state !== undefined) {
      fields.push('state = ?');
      values.push(patch.state);
    }
    if (patch.attempts !== undefined) {
      fields.push('attempts = ?');
      values.push(patch.attempts);
    }
    if (patch.lastError !== undefined) {
      fields.push('last_error = ?');
      values.push(patch.lastError);
    }
    if (patch.lastStatus !== undefined) {
      fields.push('last_status = ?');
      values.push(patch.lastStatus);
    }
    if (patch.nextAttemptAt !== undefined) {
      fields.push('next_attempt_at = ?');
      values.push(patch.nextAttemptAt);
    }
    if (patch.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(patch.completedAt);
    }
    if (!fields.length) return;
    values.push(id);
    await db.runAsync(`UPDATE outbox_core SET ${fields.join(', ')} WHERE id = ?`, values as any[]);
  },

  async markMedia(id: number, patch: Partial<MediaOutboxItem>): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (patch.state !== undefined) {
      fields.push('state = ?');
      values.push(patch.state);
    }
    if (patch.attempts !== undefined) {
      fields.push('attempts = ?');
      values.push(patch.attempts);
    }
    if (patch.lastError !== undefined) {
      fields.push('last_error = ?');
      values.push(patch.lastError);
    }
    if (patch.nextAttemptAt !== undefined) {
      fields.push('next_attempt_at = ?');
      values.push(patch.nextAttemptAt);
    }
    if (patch.assetId !== undefined) {
      fields.push('asset_id = ?');
      values.push(patch.assetId);
    }
    if (patch.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(patch.completedAt);
    }
    if (!fields.length) return;
    values.push(id);
    await db.runAsync(`UPDATE outbox_media SET ${fields.join(', ')} WHERE id = ?`, values as any[]);
  },

  async discardCore(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(`UPDATE outbox_core SET state = 'DISCARDED' WHERE id = ?`, [id]);
  },

  async discardMedia(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(`UPDATE outbox_media SET state = 'DISCARDED' WHERE id = ?`, [id]);
  },

  async retryAll(): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE outbox_core SET state = 'PENDING', next_attempt_at = 0
       WHERE state IN ('FAILED','PENDING')`,
    );
    await db.runAsync(
      `UPDATE outbox_media SET state = 'PENDING', next_attempt_at = 0
       WHERE state IN ('FAILED','PENDING')`,
    );
  },

  async countPending(): Promise<{ core: number; media: number; failed: number }> {
    const db = await getDb();
    const c = (await db.getFirstAsync(
      `SELECT COUNT(*) AS n FROM outbox_core WHERE state = 'PENDING'`,
    )) as any;
    const m = (await db.getFirstAsync(
      `SELECT COUNT(*) AS n FROM outbox_media WHERE state = 'PENDING'`,
    )) as any;
    const f = (await db.getFirstAsync(
      `SELECT COUNT(*) AS n FROM outbox_core WHERE state = 'FAILED'`,
    )) as any;
    return { core: c?.n ?? 0, media: m?.n ?? 0, failed: f?.n ?? 0 };
  },
};

function rowToCore(row: any): CoreOutboxItem {
  return {
    id: row.id,
    clientUuid: row.client_uuid,
    feature: row.feature,
    action: row.action,
    method: row.method,
    path: row.path,
    bodyJson: row.body_json,
    state: row.state,
    attempts: row.attempts,
    lastError: row.last_error,
    lastStatus: row.last_status,
    enqueuedAt: row.enqueued_at,
    nextAttemptAt: row.next_attempt_at,
    completedAt: row.completed_at,
  };
}

function rowToMedia(row: any): MediaOutboxItem {
  return {
    id: row.id,
    clientUuid: row.client_uuid,
    feature: row.feature,
    kind: row.kind,
    fileUri: row.file_uri,
    mime: row.mime,
    size: row.size,
    relatedResource: row.related_resource,
    relatedId: row.related_id,
    state: row.state,
    assetId: row.asset_id,
    attempts: row.attempts,
    lastError: row.last_error,
    enqueuedAt: row.enqueued_at,
    nextAttemptAt: row.next_attempt_at,
    completedAt: row.completed_at,
  };
}

export function backoff(attempt: number): number {
  const base = 5000;
  const max = 5 * 60 * 1000;
  return Math.min(max, base * Math.pow(2, Math.min(attempt, 8)));
}
