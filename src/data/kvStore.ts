/**
 * SQLite-backed key/value store for **non-secret** data that doesn't fit the
 * 2KB SecureStore size budget (cached user, company, server config, etc.).
 *
 * Secrets (access/refresh tokens, biometric flag) MUST stay in `secureStore.ts`.
 */
import { getDb } from './db';

export const kvStore = {
  async get(key: string): Promise<string | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM kv WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, Date.now()]
    );
  },
  async remove(key: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM kv WHERE key = ?', [key]);
  },
  async removeMany(keys: string[]): Promise<void> {
    if (!keys.length) return;
    const db = await getDb();
    const placeholders = keys.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM kv WHERE key IN (${placeholders})`, keys);
  },
};

export async function getKvJSON<T>(key: string): Promise<T | null> {
  const raw = await kvStore.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setKvJSON<T>(key: string, value: T): Promise<void> {
  await kvStore.set(key, JSON.stringify(value));
}

export const KV_KEYS = {
  user: 'auth.user',
  company: 'auth.company',
  serverConfig: 'sync.serverConfig',
} as const;
