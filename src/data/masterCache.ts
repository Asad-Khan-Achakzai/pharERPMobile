/**
 * SQLite read/write for locally cached master data (doctors, pharmacies, products, plans).
 * Used by masterSync (writes) and masterQueries (reads when offline).
 */
import { getDb } from './db';
import { getKvJSON, setKvJSON } from './kvStore';
import type {
  Doctor,
  Distributor,
  Pharmacy,
  PlanItem,
  Product,
  TodayBundle,
  WeeklyPlan,
  WeeklyPlanDetail,
} from '@/domain/types';
import type { TerritoryTreeResponse } from '@/api/territories';

const now = () => Date.now();

function idOf(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && '_id' in v) {
    return String((v as { _id: string })._id);
  }
  return null;
}

function escapeLike(raw: string): string {
  return raw.replace(/[%_\\]/g, (c) => `\\${c}`);
}

export const MASTER_KV = {
  meta: 'sync.master.meta',
  todayBundle: (userId: string, date: string) => `sync.master.today.${userId}.${date}`,
  territoriesTree: 'sync.master.territoriesTree',
  weeklyPlansMine: (userId: string) => `sync.master.weeklyPlans.mine.${userId}`,
  weeklyPlansTeam: 'sync.master.weeklyPlans.team',
  planDetail: (planId: string) => `sync.master.planDetail.${planId}`,
} as const;

export interface EntitySyncState {
  count: number;
  syncedAt: number | null;
}

export interface MasterSyncMeta {
  lastStartedAt: number | null;
  lastSuccessAt: number | null;
  lastError: string | null;
  doctors: EntitySyncState;
  pharmacies: EntitySyncState;
  products: EntitySyncState;
  distributors: EntitySyncState;
  weeklyPlans: EntitySyncState;
  planItemsToday: EntitySyncState;
  territories: EntitySyncState;
  /** Reserved for future delta sync — ISO timestamp of last successful full pull */
  doctorsSince: string | null;
  pharmaciesSince: string | null;
  productsSince: string | null;
}

export function emptyMasterSyncMeta(): MasterSyncMeta {
  const empty: EntitySyncState = { count: 0, syncedAt: null };
  return {
    lastStartedAt: null,
    lastSuccessAt: null,
    lastError: null,
    doctors: { ...empty },
    pharmacies: { ...empty },
    products: { ...empty },
    distributors: { ...empty },
    weeklyPlans: { ...empty },
    planItemsToday: { ...empty },
    territories: { ...empty },
    doctorsSince: null,
    pharmaciesSince: null,
    productsSince: null,
  };
}

export const masterCache = {
  async getMeta(): Promise<MasterSyncMeta> {
    return (await getKvJSON<MasterSyncMeta>(MASTER_KV.meta)) ?? emptyMasterSyncMeta();
  },

  async setMeta(meta: MasterSyncMeta): Promise<void> {
    await setKvJSON(MASTER_KV.meta, meta);
  },

  async upsertDoctors(companyId: string, items: Doctor[]): Promise<void> {
    if (!items.length) return;
    const db = await getDb();
    const ts = now();
    await db.withTransactionAsync(async () => {
      for (const d of items) {
        await db.runAsync(
          `INSERT INTO doctors (id, company_id, name, specialization, territory_id, city, last_visit_at, json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             company_id = excluded.company_id,
             name = excluded.name,
             specialization = excluded.specialization,
             territory_id = excluded.territory_id,
             city = excluded.city,
             json = excluded.json,
             updated_at = excluded.updated_at`,
          [
            d._id,
            companyId,
            d.name,
            d.specialization ?? null,
            idOf(d.territoryId),
            d.city ?? null,
            null,
            JSON.stringify(d),
            ts,
          ]
        );
      }
    });
  },

  async listDoctors(
    companyId: string,
    opts: { search?: string; limit?: number } = {}
  ): Promise<Doctor[]> {
    const db = await getDb();
    const limit = opts.limit ?? 500;
    let sql = 'SELECT json FROM doctors WHERE company_id = ?';
    const params: (string | number)[] = [companyId];
    const term = opts.search?.trim();
    if (term) {
      const q = `%${escapeLike(term)}%`;
      sql +=
        " AND (name LIKE ? ESCAPE '\\' OR city LIKE ? ESCAPE '\\' OR IFNULL(specialization,'') LIKE ? ESCAPE '\\')";
      params.push(q, q, q);
    }
    sql += ' ORDER BY name COLLATE NOCASE ASC LIMIT ?';
    params.push(limit);
    const rows = await db.getAllAsync<{ json: string }>(sql, params);
    return rows.map((r) => JSON.parse(r.json) as Doctor);
  },

  async getDoctor(id: string): Promise<Doctor | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ json: string }>('SELECT json FROM doctors WHERE id = ?', [
      id,
    ]);
    return row ? (JSON.parse(row.json) as Doctor) : null;
  },

  async countDoctors(companyId: string): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) AS c FROM doctors WHERE company_id = ?',
      [companyId]
    );
    return row?.c ?? 0;
  },

  async upsertPharmacies(companyId: string, items: Pharmacy[]): Promise<void> {
    if (!items.length) return;
    const db = await getDb();
    const ts = now();
    await db.withTransactionAsync(async () => {
      for (const p of items) {
        await db.runAsync(
          `INSERT INTO pharmacies (id, company_id, name, city, territory_id, outstanding, json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             company_id = excluded.company_id,
             name = excluded.name,
             city = excluded.city,
             territory_id = excluded.territory_id,
             outstanding = excluded.outstanding,
             json = excluded.json,
             updated_at = excluded.updated_at`,
          [
            p._id,
            companyId,
            p.name,
            p.city ?? null,
            idOf(p.territoryId),
            p.outstanding ?? 0,
            JSON.stringify(p),
            ts,
          ]
        );
      }
    });
  },

  async listPharmacies(
    companyId: string,
    opts: { search?: string; limit?: number } = {}
  ): Promise<Pharmacy[]> {
    const db = await getDb();
    const limit = opts.limit ?? 500;
    let sql = 'SELECT json FROM pharmacies WHERE company_id = ?';
    const params: (string | number)[] = [companyId];
    const term = opts.search?.trim();
    if (term) {
      const q = `%${escapeLike(term)}%`;
      sql += " AND (name LIKE ? ESCAPE '\\' OR IFNULL(city,'') LIKE ? ESCAPE '\\')";
      params.push(q, q);
    }
    sql += ' ORDER BY name COLLATE NOCASE ASC LIMIT ?';
    params.push(limit);
    const rows = await db.getAllAsync<{ json: string }>(sql, params);
    return rows.map((r) => JSON.parse(r.json) as Pharmacy);
  },

  async getPharmacy(id: string): Promise<Pharmacy | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ json: string }>(
      'SELECT json FROM pharmacies WHERE id = ?',
      [id]
    );
    return row ? (JSON.parse(row.json) as Pharmacy) : null;
  },

  async countPharmacies(companyId: string): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) AS c FROM pharmacies WHERE company_id = ?',
      [companyId]
    );
    return row?.c ?? 0;
  },

  async replaceProducts(companyId: string, items: Product[]): Promise<void> {
    const db = await getDb();
    const ts = now();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM products WHERE company_id = ?', [companyId]);
      for (const p of items) {
        await db.runAsync(
          `INSERT INTO products (id, company_id, name, sku, category, json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            p._id,
            companyId,
            p.name,
            p.sku ?? null,
            p.category ?? null,
            JSON.stringify(p),
            ts,
          ]
        );
      }
    });
  },

  async listProducts(companyId: string): Promise<Product[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ json: string }>(
      'SELECT json FROM products WHERE company_id = ? ORDER BY name COLLATE NOCASE ASC',
      [companyId]
    );
    return rows.map((r) => JSON.parse(r.json) as Product);
  },

  async replaceDistributors(companyId: string, items: Distributor[]): Promise<void> {
    const db = await getDb();
    const ts = now();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM distributors WHERE company_id = ?', [companyId]);
      for (const d of items) {
        await db.runAsync(
          `INSERT INTO distributors (id, company_id, name, json, updated_at) VALUES (?, ?, ?, ?, ?)`,
          [d._id, companyId, d.name, JSON.stringify(d), ts]
        );
      }
    });
  },

  async listDistributors(companyId: string): Promise<Distributor[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ json: string }>(
      'SELECT json FROM distributors WHERE company_id = ? ORDER BY name COLLATE NOCASE ASC',
      [companyId]
    );
    return rows.map((r) => JSON.parse(r.json) as Distributor);
  },

  async upsertWeeklyPlans(companyId: string, userId: string, items: WeeklyPlan[]): Promise<void> {
    if (!items.length) return;
    const db = await getDb();
    const ts = now();
    await db.withTransactionAsync(async () => {
      for (const p of items) {
        await db.runAsync(
          `INSERT INTO weekly_plans (id, company_id, user_id, json, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             company_id = excluded.company_id,
             user_id = excluded.user_id,
             json = excluded.json,
             updated_at = excluded.updated_at`,
          [p._id, companyId, userId, JSON.stringify(p), ts]
        );
      }
    });
  },

  async listWeeklyPlans(companyId: string): Promise<WeeklyPlan[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ json: string }>(
      'SELECT json FROM weekly_plans WHERE company_id = ? ORDER BY json DESC',
      [companyId]
    );
    return rows.map((r) => JSON.parse(r.json) as WeeklyPlan);
  },

  async setWeeklyPlansList(
    key: string,
    plans: WeeklyPlan[]
  ): Promise<void> {
    await setKvJSON(key, plans);
  },

  async getWeeklyPlansList(key: string): Promise<WeeklyPlan[] | null> {
    return getKvJSON<WeeklyPlan[]>(key);
  },

  async setPlanDetail(planId: string, detail: WeeklyPlanDetail): Promise<void> {
    await setKvJSON(MASTER_KV.planDetail(planId), detail);
    if (detail.planItems?.length) {
      await masterCache.upsertPlanItemsFromDetail(detail);
    }
  },

  async getPlanDetail(planId: string): Promise<WeeklyPlanDetail | null> {
    return getKvJSON<WeeklyPlanDetail>(MASTER_KV.planDetail(planId));
  },

  async upsertPlanItemsFromDetail(detail: WeeklyPlanDetail): Promise<void> {
    const companyId = typeof detail.companyId === 'string' ? detail.companyId : detail.companyId ?? '';
    const repId =
      typeof detail.medicalRepId === 'object'
        ? detail.medicalRepId._id
        : (detail.medicalRepId ?? '');
    if (!companyId || !repId || !detail.planItems?.length) return;
    await masterCache.upsertPlanItems(companyId, repId, detail.planItems);
  },

  async upsertPlanItems(companyId: string, userId: string, items: PlanItem[]): Promise<void> {
    if (!items.length) return;
    const db = await getDb();
    const ts = now();
    await db.withTransactionAsync(async () => {
      for (const item of items) {
        const doctorId = idOf(item.doctorId);
        await db.runAsync(
          `INSERT INTO plan_items (id, company_id, user_id, date, status, doctor_id, pharmacy_id, sequence, json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             status = excluded.status,
             doctor_id = excluded.doctor_id,
             json = excluded.json,
             updated_at = excluded.updated_at`,
          [
            item._id,
            companyId,
            userId,
            item.date,
            item.status,
            doctorId,
            null,
            item.sequenceOrder ?? null,
            JSON.stringify(item),
            ts,
          ]
        );
      }
    });
  },

  async setTodayBundle(
    userId: string,
    bundle: TodayBundle,
    companyId?: string
  ): Promise<void> {
    await setKvJSON(MASTER_KV.todayBundle(userId, bundle.date), bundle);
    const cid = companyId ?? bundle.items?.[0]?.companyId;
    if (cid && bundle.items?.length) {
      await masterCache.upsertPlanItems(String(cid), userId, bundle.items);
    }
  },

  async getTodayBundle(userId: string, date?: string): Promise<TodayBundle | null> {
    const d =
      date ??
      new Date().toISOString().slice(0, 10);
    const cached = await getKvJSON<TodayBundle>(MASTER_KV.todayBundle(userId, d));
    if (cached) return cached;

    const db = await getDb();
    const rows = await db.getAllAsync<{ json: string }>(
      'SELECT json FROM plan_items WHERE user_id = ? AND date = ? ORDER BY sequence ASC',
      [userId, d]
    );
    const items = rows.map((r) => JSON.parse(r.json) as PlanItem);
    if (!items.length) return null;

    const summary = {
      total: items.length,
      pending: items.filter((i) => i.status === 'PENDING').length,
      visited: items.filter((i) => i.status === 'VISITED').length,
      missed: items.filter((i) => i.status === 'MISSED').length,
    };
    return { date: d, summary, items } as TodayBundle;
  },

  async setTerritoriesTree(tree: TerritoryTreeResponse): Promise<void> {
    await setKvJSON(MASTER_KV.territoriesTree, tree);
  },

  async getTerritoriesTree(): Promise<TerritoryTreeResponse | null> {
    return getKvJSON<TerritoryTreeResponse>(MASTER_KV.territoriesTree);
  },

  async lookupDoctors(companyId: string, search: string, limit = 20): Promise<Doctor[]> {
    return masterCache.listDoctors(companyId, { search, limit });
  },

  async lookupPharmacies(companyId: string, search: string, limit = 20): Promise<Pharmacy[]> {
    return masterCache.listPharmacies(companyId, { search, limit });
  },
};
