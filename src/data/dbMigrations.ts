import type * as SQLite from 'expo-sqlite';

/** Column additions for installs that predated the full master-cache schema. */
const COLUMN_PATCHES: Record<string, Array<{ name: string; ddl: string }>> = {
  doctors: [
    { name: 'company_id', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'name', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'specialization', ddl: 'TEXT' },
    { name: 'territory_id', ddl: 'TEXT' },
    { name: 'city', ddl: 'TEXT' },
    { name: 'last_visit_at', ddl: 'TEXT' },
    { name: 'json', ddl: 'TEXT NOT NULL DEFAULT \'{}\'' },
    { name: 'updated_at', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  ],
  pharmacies: [
    { name: 'company_id', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'name', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'city', ddl: 'TEXT' },
    { name: 'territory_id', ddl: 'TEXT' },
    { name: 'outstanding', ddl: 'REAL DEFAULT 0' },
    { name: 'json', ddl: 'TEXT NOT NULL DEFAULT \'{}\'' },
    { name: 'updated_at', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  ],
  products: [
    { name: 'company_id', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'name', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'sku', ddl: 'TEXT' },
    { name: 'category', ddl: 'TEXT' },
    { name: 'json', ddl: 'TEXT NOT NULL DEFAULT \'{}\'' },
    { name: 'updated_at', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  ],
  distributors: [
    { name: 'company_id', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'name', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'json', ddl: 'TEXT NOT NULL DEFAULT \'{}\'' },
    { name: 'updated_at', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  ],
  plan_items: [
    { name: 'company_id', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'user_id', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'date', ddl: 'TEXT NOT NULL DEFAULT \'\'' },
    { name: 'status', ddl: 'TEXT NOT NULL DEFAULT \'PENDING\'' },
    { name: 'doctor_id', ddl: 'TEXT' },
    { name: 'pharmacy_id', ddl: 'TEXT' },
    { name: 'sequence', ddl: 'INTEGER' },
    { name: 'json', ddl: 'TEXT NOT NULL DEFAULT \'{}\'' },
    { name: 'updated_at', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  ],
  outbox_core: [
    { name: 'last_status', ddl: 'INTEGER' },
    { name: 'completed_at', ddl: 'INTEGER' },
    { name: 'user_id', ddl: "TEXT NOT NULL DEFAULT ''" },
    { name: 'company_id', ddl: "TEXT NOT NULL DEFAULT ''" },
  ],
  outbox_media: [
    { name: 'asset_id', ddl: 'TEXT' },
    { name: 'completed_at', ddl: 'INTEGER' },
    { name: 'user_id', ddl: "TEXT NOT NULL DEFAULT ''" },
    { name: 'company_id', ddl: "TEXT NOT NULL DEFAULT ''" },
  ],
  local_entities: [
    { name: 'user_id', ddl: "TEXT NOT NULL DEFAULT ''" },
    { name: 'company_id', ddl: "TEXT NOT NULL DEFAULT ''" },
  ],
};

async function tableExists(db: SQLite.SQLiteDatabase, table: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [table]
  );
  return !!row?.name;
}

async function existingColumns(db: SQLite.SQLiteDatabase, table: string): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(rows.map((r) => r.name));
}

/**
 * SQLite has no `ADD COLUMN IF NOT EXISTS`. Patch legacy tables in place so
 * `CREATE TABLE IF NOT EXISTS` upgrades do not silently skip column adds.
 */
export async function runDbMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const [table, patches] of Object.entries(COLUMN_PATCHES)) {
    if (!(await tableExists(db, table))) continue;
    const have = await existingColumns(db, table);
    for (const patch of patches) {
      if (have.has(patch.name)) continue;
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${patch.name} ${patch.ddl}`);
      have.add(patch.name);
    }
  }
}
