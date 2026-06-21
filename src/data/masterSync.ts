/**
 * Pulls master/reference data from existing REST APIs into SQLite + KV cache.
 * No backend changes — uses paginated list endpoints already exposed to mobile.
 */
import { formatISO } from 'date-fns';
import { doctorsApi } from '@/api/doctors';
import { pharmaciesApi } from '@/api/pharmacies';
import { productsApi, distributorsApi } from '@/api/products';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { planItemsApi } from '@/api/planItems';
import { territoriesApi } from '@/api/territories';
import { syncApi } from '@/api/sync';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/state/authStore';
import { attendanceLocal } from './attendanceLocal';
import { masterCache, MASTER_KV, emptyMasterSyncMeta, type MasterSyncMeta } from './masterCache';
import type { Distributor, Product, WeeklyPlan } from '@/domain/types';

const PAGE_SIZE = 100;
/** Cap used by the auth-only `/lookup` fallback (server clamps to LOOKUP_MAX=100). */
const LOOKUP_FALLBACK_LIMIT = 100;

/** 403 from a `*.view`-gated list endpoint — fall back to the auth-only lookup. */
function isPermissionError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

let syncRunning = false;
let syncWaiters: Array<() => void> = [];

export function isMasterSyncRunning(): boolean {
  return syncRunning;
}

export async function waitForMasterSync(timeoutMs = 120_000): Promise<void> {
  if (!syncRunning) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Master sync timeout')), timeoutMs);
    syncWaiters.push(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function notifySyncDone() {
  for (const w of syncWaiters) w();
  syncWaiters = [];
}

function isActiveOrRecent(plan: WeeklyPlan): boolean {
  if (plan.status === 'ACTIVE' || plan.status === 'SUBMITTED') return true;
  const start = new Date(plan.weekStartDate).getTime();
  const end = new Date(plan.weekEndDate).getTime();
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return now >= start - weekMs && now <= end + weekMs;
}

async function syncPaginatedDoctors(companyId: string): Promise<number> {
  let page = 1;
  let total = Infinity;
  let count = 0;
  while ((page - 1) * PAGE_SIZE < total) {
    const { items, total: t } = await doctorsApi.list({ page, limit: PAGE_SIZE });
    total = t;
    if (items.length) {
      await masterCache.upsertDoctors(companyId, items);
      count += items.length;
    }
    if (items.length < PAGE_SIZE) break;
    page += 1;
  }
  return count;
}

async function syncPaginatedPharmacies(companyId: string): Promise<number> {
  let page = 1;
  let total = Infinity;
  let count = 0;
  while ((page - 1) * PAGE_SIZE < total) {
    const { items, total: t } = await pharmaciesApi.list({ page, limit: PAGE_SIZE });
    total = t;
    if (items.length) {
      await masterCache.upsertPharmacies(companyId, items);
      count += items.length;
    }
    if (items.length < PAGE_SIZE) break;
    page += 1;
  }
  return count;
}

/**
 * Limited-permission roles (e.g. medical reps without `doctors.view`) can't hit
 * the paginated list endpoint. Fall back to the auth-only `/doctors/lookup` so
 * the offline cache is still populated with their scoped set.
 */
async function syncDoctorsResilient(companyId: string): Promise<number> {
  try {
    return await syncPaginatedDoctors(companyId);
  } catch (err) {
    if (!isPermissionError(err)) throw err;
    const items = await doctorsApi.lookup('', LOOKUP_FALLBACK_LIMIT);
    if (items.length) await masterCache.upsertDoctors(companyId, items);
    return items.length;
  }
}

async function syncPharmaciesResilient(companyId: string): Promise<number> {
  try {
    return await syncPaginatedPharmacies(companyId);
  } catch (err) {
    if (!isPermissionError(err)) throw err;
    const items = await pharmaciesApi.lookup('', LOOKUP_FALLBACK_LIMIT);
    if (items.length) await masterCache.upsertPharmacies(companyId, items);
    return items.length;
  }
}

async function fetchProductsResilient(): Promise<Product[]> {
  try {
    return await productsApi.list();
  } catch (err) {
    if (!isPermissionError(err)) throw err;
    return productsApi.lookup('', LOOKUP_FALLBACK_LIMIT);
  }
}

async function fetchDistributorsResilient(): Promise<Distributor[]> {
  try {
    return await distributorsApi.list();
  } catch (err) {
    if (!isPermissionError(err)) throw err;
    return distributorsApi.lookup('', LOOKUP_FALLBACK_LIMIT);
  }
}

async function syncPlanDetails(plans: WeeklyPlan[]): Promise<number> {
  let cached = 0;
  const targets = plans.filter(isActiveOrRecent).slice(0, 8);
  for (const plan of targets) {
    try {
      const detail = await weeklyPlansApi.getById(plan._id);
      await masterCache.setPlanDetail(plan._id, detail);
      cached += 1;
    } catch {
      /* best-effort — list still usable offline */
    }
  }
  return cached;
}

export interface SyncMasterOptions {
  reason?: 'login' | 'resume' | 'manual' | 'background';
  /** Skip server-config refresh (e.g. when caller already fetched it) */
  skipServerConfig?: boolean;
}

export async function syncMasterData(opts: SyncMasterOptions = {}): Promise<MasterSyncMeta> {
  if (syncRunning) {
    await waitForMasterSync();
    return masterCache.getMeta();
  }

  const auth = useAuthStore.getState();
  const companyId = auth.company?._id;
  const userId = auth.user?._id;
  if (!companyId || !userId || !auth.accessToken) {
    return masterCache.getMeta();
  }

  syncRunning = true;
  const started = Date.now();
  let meta = await masterCache.getMeta();
  meta = {
    ...meta,
    lastStartedAt: started,
    lastError: null,
  };
  await masterCache.setMeta(meta);

  try {
    if (!opts.skipServerConfig) {
      try {
        const prevCfg = useAuthStore.getState().serverConfig;
        const prevVersion = prevCfg?.attendance?.configVersion;
        const cfg = await syncApi.getServerConfig();
        await useAuthStore.getState().setServerConfig(cfg);
        if (
          prevVersion != null &&
          cfg.attendance?.configVersion != null &&
          cfg.attendance.configVersion !== prevVersion
        ) {
          const uid = useAuthStore.getState().user?._id;
          if (uid) {
            await attendanceLocal.clearLocal(String(uid)).catch(() => {});
          }
        }
        if (cfg.push?.enabled || cfg.company?.mobilePushEnabled) {
          void import('@/features/push/registerPush').then(({ schedulePushRegistration }) =>
            schedulePushRegistration(1000),
          );
        }
      } catch {
        /* cached server config remains valid */
      }
    }

    const doctorsCount = await syncDoctorsResilient(companyId);
    meta.doctors = { count: doctorsCount, syncedAt: Date.now() };
    meta.doctorsSince = formatISO(new Date());

    const pharmaciesCount = await syncPharmaciesResilient(companyId);
    meta.pharmacies = { count: pharmaciesCount, syncedAt: Date.now() };
    meta.pharmaciesSince = formatISO(new Date());

    const products = await fetchProductsResilient();
    await masterCache.replaceProducts(companyId, products);
    meta.products = { count: products.length, syncedAt: Date.now() };
    meta.productsSince = formatISO(new Date());

    const distributors = await fetchDistributorsResilient();
    await masterCache.replaceDistributors(companyId, distributors);
    meta.distributors = { count: distributors.length, syncedAt: Date.now() };

    try {
      const myPlans = await weeklyPlansApi.list({ limit: 100 });
      await masterCache.upsertWeeklyPlans(companyId, userId, myPlans);
      await masterCache.setWeeklyPlansList(MASTER_KV.weeklyPlansMine(userId), myPlans);
      await syncPlanDetails(myPlans);
      meta.weeklyPlans = { count: myPlans.length, syncedAt: Date.now() };
    } catch (err) {
      if (!isPermissionError(err)) throw err;
    }

    try {
      const today = await planItemsApi.listToday();
      await masterCache.setTodayBundle(userId, today, companyId);
      meta.planItemsToday = {
        count: today.items?.length ?? 0,
        syncedAt: Date.now(),
      };
    } catch (err) {
      if (!isPermissionError(err)) throw err;
    }

    try {
      const tree = await territoriesApi.tree();
      await masterCache.setTerritoriesTree(tree);
      meta.territories = { count: tree.total ?? tree.roots.length, syncedAt: Date.now() };
    } catch {
      meta.territories = { ...meta.territories, syncedAt: meta.territories.syncedAt };
    }

    meta.lastSuccessAt = Date.now();
    meta.lastError = null;
    await masterCache.setMeta(meta);
    return meta;
  } catch (err) {
    meta.lastError = err instanceof Error ? err.message : String(err);
    await masterCache.setMeta(meta);
    throw err;
  } finally {
    syncRunning = false;
    notifySyncDone();
  }
}

export function isOfflineApiError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 0 || err.status >= 500 || err.status === 408;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: string }).message).toLowerCase();
    return msg.includes('network') || msg.includes('timeout');
  }
  return false;
}

export async function getMasterSyncMeta(): Promise<MasterSyncMeta> {
  return masterCache.getMeta();
}

export function formatLastSync(ts: number | null | undefined): string {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(ts).toLocaleString();
}

export { emptyMasterSyncMeta };
export type { MasterSyncMeta } from './masterCache';
