/**
 * Offline-aware data fetchers for React Query.
 * Online: network first, write-through to SQLite.
 * Offline / network failure: read from SQLite cache.
 */
import { doctorsApi, type DoctorListParams, type DoctorLookupParams } from '@/api/doctors';
import { pharmaciesApi } from '@/api/pharmacies';
import { productsApi, distributorsApi } from '@/api/products';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { planItemsApi } from '@/api/planItems';
import { territoriesApi } from '@/api/territories';
import { useAuthStore } from '@/state/authStore';
import { masterCache, MASTER_KV } from './masterCache';
import { isOfflineApiError } from './masterSync';
import { pendingSync } from './pendingSync';
import type { Doctor, Pharmacy, Product, TodayBundle, WeeklyPlan, WeeklyPlanDetail } from '@/domain/types';
import type { TerritoryTreeResponse } from '@/api/territories';

export type DataSource = 'network' | 'cache';

function companyId(): string {
  const id = useAuthStore.getState().company?._id;
  if (!id) throw new Error('Not signed in');
  return id;
}

function userId(): string {
  const id = useAuthStore.getState().user?._id;
  if (!id) throw new Error('Not signed in');
  return id;
}

async function withCache<T>(
  network: () => Promise<T>,
  cache: () => Promise<T | null>,
  persist?: (data: T) => Promise<void>
): Promise<T> {
  try {
    const data = await network();
    if (persist) await persist(data);
    return data;
  } catch (err) {
    if (!isOfflineApiError(err)) throw err;
    const cached = await cache();
    if (cached != null) return cached;
    throw err;
  }
}

export const masterQueries = {
  async doctorsList(
    params: DoctorListParams = {}
  ): Promise<{ items: Doctor[]; total: number; source: DataSource }> {
    const cid = companyId();
    try {
      const result = await doctorsApi.list(params);
      if (result.items.length) {
        await masterCache.upsertDoctors(cid, result.items);
      }
      return { ...result, source: 'network' };
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      const items = await masterCache.listDoctors(cid, {
        search: params.search,
        limit: params.limit ?? 500,
      });
      return { items, total: items.length, source: 'cache' };
    }
  },

  async doctorById(id: string): Promise<Doctor> {
    return withCache(
      () => doctorsApi.getById(id),
      () => masterCache.getDoctor(id),
      async (d) => masterCache.upsertDoctors(companyId(), [d])
    );
  },

  async pharmaciesList(
    params: { search?: string; page?: number; limit?: number } = {}
  ): Promise<{ items: Pharmacy[]; total: number; source: DataSource }> {
    const cid = companyId();
    try {
      const result = await pharmaciesApi.list(params);
      if (result.items.length) {
        await masterCache.upsertPharmacies(cid, result.items);
      }
      return { ...result, source: 'network' };
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      const items = await masterCache.listPharmacies(cid, {
        search: params.search,
        limit: params.limit ?? 500,
      });
      return { items, total: items.length, source: 'cache' };
    }
  },

  async pharmacyById(id: string): Promise<Pharmacy> {
    return withCache(
      () => pharmaciesApi.getById(id),
      () => masterCache.getPharmacy(id),
      async (p) => masterCache.upsertPharmacies(companyId(), [p])
    );
  },

  async productsList(): Promise<Product[]> {
    const cid = companyId();
    return withCache(
      () => productsApi.list(),
      () => masterCache.listProducts(cid),
      async (items) => masterCache.replaceProducts(cid, items)
    );
  },

  async distributorsLookup(search = '', limit = 50) {
    const cid = companyId();
    try {
      const items = await distributorsApi.lookup(search, limit);
      if (items.length) await masterCache.replaceDistributors(cid, items);
      return items;
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      const q = search.trim().toLowerCase();
      const all = await masterCache.listDistributors(cid);
      return all
        .filter((d) => !q || d.name.toLowerCase().includes(q))
        .slice(0, limit);
    }
  },

  async doctorsLookup(
    searchOrParams: string | DoctorLookupParams = '',
    limit = 20
  ): Promise<Doctor[]> {
    const cid = companyId();
    try {
      const items = await doctorsApi.lookup(searchOrParams, limit);
      if (items.length) await masterCache.upsertDoctors(cid, items);
      return items;
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      const params = typeof searchOrParams === 'string' ? { search: searchOrParams } : searchOrParams;
      const lim = params.limit ?? limit;
      let items = await masterCache.listDoctors(cid, {
        search: params.search,
        limit: 500,
      });
      if (params.pharmacyId) {
        const pid = String(params.pharmacyId);
        items = items.filter((d) => {
          const docPharm = d.pharmacyId;
          const docPid =
            typeof docPharm === 'object' && docPharm ? docPharm._id : docPharm;
          return docPid != null && String(docPid) === pid;
        });
      }
      if (params.assignedRepId) {
        const rid = String(params.assignedRepId);
        items = items.filter((d) => {
          const rep = d.assignedRepId;
          const repId = typeof rep === 'object' && rep ? rep._id : rep;
          return repId != null && String(repId) === rid;
        });
      }
      if (params.territoryId) {
        const tid = String(params.territoryId);
        items = items.filter((d) => {
          const terr = d.territoryId;
          const terrId = typeof terr === 'object' && terr ? terr._id : terr;
          return terrId != null && String(terrId) === tid;
        });
      }
      if (params.isActive === 'false') {
        items = items.filter((d) => d.isActive === false);
      } else {
        items = items.filter((d) => d.isActive !== false);
      }
      return items.slice(0, lim);
    }
  },

  async pharmaciesLookup(search: string, limit = 20): Promise<Pharmacy[]> {
    const cid = companyId();
    try {
      const items = await pharmaciesApi.lookup(search, limit);
      if (items.length) await masterCache.upsertPharmacies(cid, items);
      return items;
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      return masterCache.lookupPharmacies(cid, search, limit);
    }
  },

  async weeklyPlansList(scope: 'mine' | 'team' = 'mine'): Promise<WeeklyPlan[]> {
    const cid = companyId();
    const uid = userId();
    const kvKey =
      scope === 'team' ? MASTER_KV.weeklyPlansTeam : MASTER_KV.weeklyPlansMine(uid);
    try {
      const plans = await weeklyPlansApi.list({
        limit: 100,
        ...(scope === 'team' ? { scope: 'team' } : {}),
      });
      await masterCache.upsertWeeklyPlans(cid, uid, plans);
      await masterCache.setWeeklyPlansList(kvKey, plans);
      return plans;
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      const fromKv = await masterCache.getWeeklyPlansList(kvKey);
      if (fromKv?.length) return fromKv;
      return masterCache.listWeeklyPlans(cid);
    }
  },

  async planDetail(planId: string): Promise<WeeklyPlanDetail> {
    return withCache(
      () => weeklyPlansApi.getById(planId),
      () => masterCache.getPlanDetail(planId),
      async (detail) => masterCache.setPlanDetail(planId, detail)
    );
  },

  async planItemsToday(params?: { date?: string }): Promise<TodayBundle> {
    const uid = userId();
    try {
      const bundle = await planItemsApi.listToday(params);
      await masterCache.setTodayBundle(uid, bundle, companyId());
      return pendingSync.mergeTodayVisits(bundle);
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      const cached = await masterCache.getTodayBundle(uid, params?.date);
      if (cached) return pendingSync.mergeTodayVisits(cached);
      throw err;
    }
  },

  async territoriesTree(): Promise<TerritoryTreeResponse> {
    return withCache(
      () => territoriesApi.tree(),
      () => masterCache.getTerritoriesTree(),
      async (tree) => masterCache.setTerritoriesTree(tree)
    );
  },
};
