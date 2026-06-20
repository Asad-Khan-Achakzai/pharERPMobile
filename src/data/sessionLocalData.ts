/**
 * Per-user session isolation for SQLite offline data.
 * Clears outbox / shadows when signing out or switching accounts.
 */
import { getDb } from './db';
import { kvStore } from './kvStore';
import { emptyMasterSyncMeta, masterCache } from './masterCache';
import { useAuthStore } from '@/state/authStore';

export const SESSION_OWNER_KV = 'auth.sessionOwner';

export function sessionOwnerKey(userId: string, companyId: string): string {
  return `${companyId}:${userId}`;
}

export function getSessionOwnerFromAuth(): { userId: string; companyId: string } | null {
  const { user, company } = useAuthStore.getState();
  if (!user?._id || !company?._id) return null;
  return { userId: String(user._id), companyId: String(company._id) };
}

/** Session scope from SQLite — safe when Zustand is not hydrated (background tasks). */
export async function getSessionScopeFromStorage(): Promise<{ userId: string; companyId: string } | null> {
  const raw = await kvStore.get(SESSION_OWNER_KV);
  if (!raw) return null;
  const sep = raw.indexOf(':');
  if (sep <= 0) return null;
  const companyId = raw.slice(0, sep);
  const userId = raw.slice(sep + 1);
  if (!userId || !companyId) return null;
  return { userId, companyId };
}

export async function getStoredSessionOwner(): Promise<string | null> {
  return kvStore.get(SESSION_OWNER_KV);
}

export async function setStoredSessionOwner(userId: string, companyId: string): Promise<void> {
  await kvStore.set(SESSION_OWNER_KV, sessionOwnerKey(userId, companyId));
}

export async function clearStoredSessionOwner(): Promise<void> {
  await kvStore.remove(SESSION_OWNER_KV);
}

/** Remove queued mutations and UI shadows — never shared across users. */
export async function clearSessionLocalData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM outbox_core;
    DELETE FROM outbox_media;
    DELETE FROM local_entities;
    DELETE FROM visit_drafts;
  `);
}

/** Drop cached plan / attendance rows for a user (master lists re-sync on login). */
export async function clearUserScopedCache(userId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM plan_items WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM weekly_plans WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM attendance_local WHERE user_id = ?', [userId]);

  const rows = await db.getAllAsync<{ key: string }>(
    `SELECT key FROM kv WHERE key LIKE ? OR key = ?`,
    [`sync.master.today.${userId}.%`, `sync.master.weeklyPlans.mine.${userId}`],
  );
  for (const row of rows) {
    await kvStore.remove(row.key);
  }
}

/** Rows created before user scoping — attach to the active session (same-user upgrade). */
export async function adoptLegacyUnscopedRows(userId: string, companyId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE outbox_core SET user_id = ?, company_id = ? WHERE user_id IS NULL OR user_id = ''`,
    [userId, companyId],
  );
  await db.runAsync(
    `UPDATE outbox_media SET user_id = ?, company_id = ? WHERE user_id IS NULL OR user_id = ''`,
    [userId, companyId],
  );
  await db.runAsync(
    `UPDATE local_entities SET user_id = ?, company_id = ? WHERE user_id IS NULL OR user_id = ''`,
    [userId, companyId],
  );
}

/** Drop unscoped rows with no session to attach them to. */
export async function purgeLegacyUnscopedOutbox(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM outbox_core WHERE user_id IS NULL OR user_id = ''`);
  await db.runAsync(`DELETE FROM outbox_media WHERE user_id IS NULL OR user_id = ''`);
  await db.runAsync(`DELETE FROM local_entities WHERE user_id IS NULL OR user_id = ''`);
}

/**
 * When company or user changes, wipe the previous user's offline queue and shadows.
 * Returns true when data was cleared (caller should invalidate React Query).
 */
export async function ensureSessionIsolation(userId: string, companyId: string): Promise<boolean> {
  const nextKey = sessionOwnerKey(userId, companyId);
  const prevKey = await getStoredSessionOwner();

  if (!prevKey) {
    const db = await getDb();
    const orphan = (await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM outbox_core
       WHERE user_id IS NOT NULL AND user_id != '' AND user_id != ?`,
      [userId],
    )) as { n: number } | null;
    if ((orphan?.n ?? 0) > 0) {
      await clearSessionLocalData();
      await adoptLegacyUnscopedRows(userId, companyId);
      return true;
    }
    await adoptLegacyUnscopedRows(userId, companyId);
    return false;
  }

  if (prevKey === nextKey) {
    await adoptLegacyUnscopedRows(userId, companyId);
    return false;
  }

  const prevUserId = prevKey.split(':')[1];
  await clearSessionLocalData();
  if (prevUserId) {
    await clearUserScopedCache(prevUserId);
  }

  const meta = await masterCache.getMeta();
  await masterCache.setMeta({
    ...emptyMasterSyncMeta(),
    lastSuccessAt: meta.lastSuccessAt,
  });

  return true;
}
