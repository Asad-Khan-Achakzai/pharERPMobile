import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorsApi } from '@/api/doctors';
import { territoriesApi } from '@/api/territories';
import type { Doctor, ID, User } from '@/domain/types';
import {
  idOf,
  isRecommendedDoctor,
  resolveRepBrickIds,
  type RecommendedReason,
} from '@/utils/repBrickIds';
import { findNodeById } from '@/utils/territoryTree';

export interface RecommendedDoctorMeta {
  reason: RecommendedReason;
  brickName?: string;
  name: string;
  specialization?: string;
  city?: string;
}

export interface PartitionedDoctorRows {
  recommended: Array<Doctor & { _recommended?: RecommendedReason }>;
  others: Doctor[];
}

const PREFETCH_STALE_MS = 30 * 60 * 1000;

function brickLabel(doctor: Doctor): string | undefined {
  const territoryId = doctor.territoryId;
  if (territoryId && typeof territoryId === 'object' && 'name' in territoryId) {
    return (territoryId as { name?: string }).name;
  }
  return doctor.doctorBrick ?? undefined;
}

function dedupeDoctors(rows: Doctor[]): Doctor[] {
  const seen = new Set<string>();
  const out: Doctor[] = [];
  for (const d of rows) {
    const id = String(d._id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(d);
  }
  return out;
}

const LOOKUP_PREFETCH_LIMIT = 100;

/**
 * Uses `/doctors/lookup` (auth-only) — same as web weekly plan picker.
 * `GET /doctors` requires `doctors.view`, which field reps often lack.
 */
async function prefetchRecommendedDoctors(
  userId: string,
  brickIdSet: Set<string>,
  anchorId: string | null,
  roots: Awaited<ReturnType<typeof territoriesApi.tree>>['roots']
): Promise<Doctor[]> {
  const batches: Promise<Doctor[]>[] = [];

  batches.push(
    doctorsApi.lookup({
      assignedRepId: userId,
      isActive: 'true',
      limit: LOOKUP_PREFETCH_LIMIT,
    })
  );

  const anchorNode = anchorId ? findNodeById(roots, anchorId) : null;
  const anchorIsSubtree =
    anchorNode && (anchorNode.kind === 'AREA' || anchorNode.kind === 'ZONE');

  if (anchorId) {
    batches.push(
      doctorsApi.lookup({
        underTerritoryId: anchorId,
        isActive: 'true',
        limit: LOOKUP_PREFETCH_LIMIT,
      })
    );
  }

  if (!anchorIsSubtree) {
    for (const brickId of brickIdSet) {
      if (brickId === anchorId) continue;
      batches.push(
        doctorsApi.lookup({
          territoryId: brickId,
          isActive: 'true',
          limit: LOOKUP_PREFETCH_LIMIT,
        })
      );
    }
  }

  const results = await Promise.allSettled(batches);
  const rows: Doctor[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') rows.push(...r.value);
  }
  return dedupeDoctors(rows);
}

/**
 * Soft-priority doctor recommendation for weekly plan picker (mobile only).
 * Does not restrict selection — only ranks and labels.
 */
export function useRecommendedDoctors(
  user: User | null | undefined,
  options?: { enabled?: boolean }
) {
  const userId = user?._id ? String(user._id) : null;
  const enabled = options?.enabled !== false;

  const treeQ = useQuery({
    queryKey: ['territories', 'tree'],
    queryFn: () => territoriesApi.tree(),
    staleTime: PREFETCH_STALE_MS,
    enabled,
  });

  const brickIdSet = useMemo(
    () => resolveRepBrickIds(user ?? undefined, treeQ.data?.roots ?? []),
    [user, treeQ.data?.roots]
  );

  const anchorId = idOf(user?.territoryId ?? null);

  const prefetchQ = useQuery({
    queryKey: ['doctors', 'recommended-prefetch', userId, [...brickIdSet].sort().join(',')],
    enabled: enabled && !!userId,
    staleTime: PREFETCH_STALE_MS,
    queryFn: () =>
      prefetchRecommendedDoctors(
        userId!,
        brickIdSet,
        anchorId,
        treeQ.data?.roots ?? []
      ),
  });

  const recommendedMeta = useMemo(() => {
    const map = new Map<string, RecommendedDoctorMeta>();
    if (!userId) return map;
    for (const doc of prefetchQ.data ?? []) {
      const id = String(doc._id);
      const reason =
        isRecommendedDoctor(doc, userId, brickIdSet) ??
        ('brick' as RecommendedReason);
      map.set(id, {
        reason,
        brickName: brickLabel(doc),
        name: doc.name,
        specialization: doc.specialization,
        city: doc.city,
      });
    }
    return map;
  }, [prefetchQ.data, userId, brickIdSet]);

  const prefetchDoctors = useMemo(() => {
    const rows: Doctor[] = [];
    for (const doc of prefetchQ.data ?? []) {
      if (recommendedMeta.has(String(doc._id))) rows.push(doc);
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [prefetchQ.data, recommendedMeta]);

  function partitionLookupResults(lookupRows: Doctor[]): PartitionedDoctorRows {
    const recommended: PartitionedDoctorRows['recommended'] = [];
    const others: Doctor[] = [];
    const seen = new Set<string>();

    for (const d of lookupRows) {
      const id = String(d._id);
      const meta = recommendedMeta.get(id);
      if (meta) {
        recommended.push({ ...d, _recommended: meta.reason });
        seen.add(id);
      } else {
        others.push(d);
      }
    }

    for (const d of prefetchDoctors) {
      const id = String(d._id);
      if (seen.has(id)) continue;
      const meta = recommendedMeta.get(id);
      if (!meta) continue;
      recommended.push({ ...d, _recommended: meta.reason });
      seen.add(id);
    }

    recommended.sort((a, b) => a.name.localeCompare(b.name));
    others.sort((a, b) => a.name.localeCompare(b.name));

    return { recommended, others };
  }

  function filterPrefetchBySearch(q: string): Doctor[] {
    const term = q.trim().toLowerCase();
    if (!term) return prefetchDoctors;
    return prefetchDoctors.filter((d) => {
      const hay = [d.name, d.specialization, d.city, d.doctorCode, d.doctorBrick]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }

  const doctorsByBrick = useMemo(() => {
    const map = new Map<string, { brickName: string; doctors: Doctor[] }>();
    for (const doc of prefetchQ.data ?? []) {
      const meta = recommendedMeta.get(String(doc._id));
      if (!meta || meta.reason !== 'brick') continue;
      const brickName = meta.brickName ?? 'Territory';
      const key = brickName;
      const entry = map.get(key) ?? { brickName, doctors: [] };
      entry.doctors.push(doc);
      map.set(key, entry);
    }
    return [...map.values()]
      .map((g) => ({
        ...g,
        doctors: g.doctors.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.brickName.localeCompare(b.brickName));
  }, [prefetchQ.data, recommendedMeta]);

  const suggestedDoctors = useMemo(() => {
    return (prefetchQ.data ?? [])
      .filter((d) => recommendedMeta.has(String(d._id)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [prefetchQ.data, recommendedMeta]);

  return {
    brickIdSet,
    recommendedMeta,
    prefetchDoctors,
    suggestedDoctors,
    doctorsByBrick,
    prefetchLoading: prefetchQ.isLoading,
    prefetchError: prefetchQ.error,
    refetchPrefetch: prefetchQ.refetch,
    partitionLookupResults,
    filterPrefetchBySearch,
    isRecommended: (doctorId: ID) => recommendedMeta.get(String(doctorId)) ?? null,
  };
}
