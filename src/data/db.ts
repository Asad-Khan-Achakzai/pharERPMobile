import * as SQLite from 'expo-sqlite';

const DB_NAME = 'pharerp.mobile.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: false });
  }
  return dbPromise;
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY NOT NULL,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    specialization TEXT,
    territory_id TEXT,
    city TEXT,
    last_visit_at TEXT,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);`,
  `CREATE TABLE IF NOT EXISTS pharmacies (
    id TEXT PRIMARY KEY NOT NULL,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT,
    territory_id TEXT,
    outstanding REAL DEFAULT 0,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_pharmacies_name ON pharmacies(name);`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);`,
  `CREATE TABLE IF NOT EXISTS distributors (
    id TEXT PRIMARY KEY NOT NULL,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS plan_items (
    id TEXT PRIMARY KEY NOT NULL,
    company_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    doctor_id TEXT,
    pharmacy_id TEXT,
    sequence INTEGER,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_plan_items_date ON plan_items(user_id, date);`,
  `CREATE TABLE IF NOT EXISTS visit_drafts (
    client_uuid TEXT PRIMARY KEY NOT NULL,
    plan_item_id TEXT,
    doctor_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS outbox_core (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_uuid TEXT UNIQUE NOT NULL,
    feature TEXT NOT NULL,
    action TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    body_json TEXT,
    state TEXT NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    last_status INTEGER,
    enqueued_at INTEGER NOT NULL,
    next_attempt_at INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER
  );`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_core_state ON outbox_core(state, next_attempt_at);`,
  `CREATE TABLE IF NOT EXISTS outbox_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_uuid TEXT UNIQUE NOT NULL,
    feature TEXT NOT NULL,
    kind TEXT NOT NULL,
    file_uri TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER,
    related_resource TEXT,
    related_id TEXT,
    state TEXT NOT NULL DEFAULT 'PENDING',
    asset_id TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    enqueued_at INTEGER NOT NULL,
    next_attempt_at INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER
  );`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_media_state ON outbox_media(state, next_attempt_at);`,
  `CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
];

export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  for (const stmt of SCHEMA) {
    await db.execAsync(stmt);
  }
}

export async function resetDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DROP TABLE IF EXISTS doctors;
    DROP TABLE IF EXISTS pharmacies;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS distributors;
    DROP TABLE IF EXISTS plan_items;
    DROP TABLE IF EXISTS visit_drafts;
    DROP TABLE IF EXISTS outbox_core;
    DROP TABLE IF EXISTS outbox_media;
    DROP TABLE IF EXISTS kv;
  `);
  await initDb();
}
