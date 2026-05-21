import * as React from 'react';
import { getKvJSON, setKvJSON } from '@/data/kvStore';
import type { Doctor } from '@/domain/types';

export type StoredOtherTask = { title: string; notes: string };

export type VisitDraft = {
  doctor: Doctor;
  plannedTime: string;
  notes: string;
};

export type StoredVisitDraft = {
  doctor: Pick<Doctor, '_id' | 'name' | 'specialization' | 'city'>;
  plannedTime: string;
  notes: string;
};

/** @deprecated legacy shape — migrated on read */
type LegacyStoredDayDraft = {
  date: string;
  doctors?: Pick<Doctor, '_id' | 'name' | 'specialization' | 'city'>[];
  doctorNotes?: string;
  plannedTime?: string;
  otherTasks?: StoredOtherTask[];
};

export type StoredDayDraft = {
  date: string;
  visits: StoredVisitDraft[];
  otherTasks: StoredOtherTask[];
};

export type DayDraftState = {
  date: string;
  visits: VisitDraft[];
  otherTasks: StoredOtherTask[];
};

export function planDraftStorageKey(planId: string): string {
  return `weekly-plan-draft:${planId}`;
}

export function emptyDayDraft(date: string): DayDraftState {
  return { date, visits: [], otherTasks: [] };
}

function toStored(drafts: DayDraftState[]): StoredDayDraft[] {
  return drafts.map((d) => ({
    date: d.date,
    visits: d.visits.map((v) => ({
      doctor: {
        _id: v.doctor._id,
        name: v.doctor.name,
        specialization: v.doctor.specialization,
        city: v.doctor.city,
      },
      plannedTime: v.plannedTime,
      notes: v.notes,
    })),
    otherTasks: d.otherTasks,
  }));
}

function migrateLegacy(row: LegacyStoredDayDraft & StoredDayDraft): DayDraftState {
  if (row.visits?.length) {
    return {
      date: row.date,
      visits: row.visits.map((v) => ({
        doctor: {
          _id: v.doctor._id,
          name: v.doctor.name,
          specialization: v.doctor.specialization,
          city: v.doctor.city,
        },
        plannedTime: v.plannedTime ?? '',
        notes: v.notes ?? '',
      })),
      otherTasks: row.otherTasks ?? [],
    };
  }
  const legacyDocs = row.doctors ?? [];
  return {
    date: row.date,
    visits: legacyDocs.map((doc) => ({
      doctor: {
        _id: doc._id,
        name: doc.name,
        specialization: doc.specialization,
        city: doc.city,
      },
      plannedTime: row.plannedTime ?? '',
      notes: row.doctorNotes ?? '',
    })),
    otherTasks: row.otherTasks ?? [],
  };
}

function fromStored(rows: Array<StoredDayDraft | LegacyStoredDayDraft>): DayDraftState[] {
  return rows.map((r) => migrateLegacy(r as LegacyStoredDayDraft & StoredDayDraft));
}

export function usePlanDraftStorage(planId: string | undefined, enabled: boolean) {
  const [hydrated, setHydrated] = React.useState(false);
  const [drafts, setDrafts] = React.useState<DayDraftState[]>([]);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!planId || !enabled) {
      setHydrated(true);
      setDrafts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const stored = await getKvJSON<Array<StoredDayDraft | LegacyStoredDayDraft>>(
        planDraftStorageKey(planId)
      );
      if (!cancelled) {
        setDrafts(stored?.length ? fromStored(stored) : []);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, enabled]);

  React.useEffect(() => {
    if (!planId || !enabled || !hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void setKvJSON(planDraftStorageKey(planId), toStored(drafts));
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [drafts, planId, enabled, hydrated]);

  const clearDrafts = React.useCallback(async () => {
    setDrafts([]);
    if (planId) await setKvJSON(planDraftStorageKey(planId), []);
  }, [planId]);

  function getDayDraft(date: string): DayDraftState {
    return drafts.find((d) => d.date === date) ?? emptyDayDraft(date);
  }

  function updateDayDraft(date: string, patch: Partial<DayDraftState>) {
    setDrafts((prev) => {
      const idx = prev.findIndex((d) => d.date === date);
      const base = idx >= 0 ? prev[idx] : emptyDayDraft(date);
      const next = { ...base, ...patch, date };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [...prev, next];
    });
  }

  return {
    drafts,
    setDrafts,
    hydrated,
    clearDrafts,
    getDayDraft,
    updateDayDraft,
  };
}
