/**
 * Local plan-item shadows after offline visit completion (Phase 3).
 */
import { format } from 'date-fns';
import { masterCache } from './masterCache';
import { useAuthStore } from '@/state/authStore';
import type { Doctor, PlanItem, TodayBundle } from '@/domain/types';

export const visitLocal = {
  async applyPlannedVisitComplete(args: {
    planItem: PlanItem;
    visitTime: string;
    clientUuid: string;
    notes?: string;
  }): Promise<void> {
    const userId = useAuthStore.getState().user?._id;
    const companyId = useAuthStore.getState().company?._id;
    if (!userId || !companyId) return;

    const updated: PlanItem = {
      ...args.planItem,
      status: 'VISITED',
      actualVisitTime: args.visitTime,
      notes: args.notes ?? args.planItem.notes,
    };

    await masterCache.upsertPlanItems(String(companyId), String(userId), [updated]);

    const date = args.planItem.date ?? format(new Date(), 'yyyy-MM-dd');
    const bundle = await masterCache.getTodayBundle(String(userId), date);
    if (bundle?.items?.length) {
      const items = bundle.items.map((item) =>
        item._id === args.planItem._id ? updated : item
      );
      const summary = {
        total: items.length,
        pending: items.filter((i) => i.status === 'PENDING').length,
        visited: items.filter((i) => i.status === 'VISITED').length,
        missed: items.filter((i) => i.status === 'MISSED').length,
      };
      await masterCache.setTodayBundle(String(userId), { ...bundle, items, summary }, String(companyId));
    }
  },

  buildPlannedVisitDisplay(args: {
    planItem: PlanItem;
    doctor?: Doctor | null;
    visitTime: string;
    clientUuid: string;
    notes?: string;
  }): Record<string, unknown> {
    const doctor =
      args.doctor ??
      (typeof args.planItem.doctorId === 'object' ? args.planItem.doctorId : null);
    return {
      _id: `local:${args.clientUuid}`,
      clientUuid: args.clientUuid,
      planItemId: args.planItem._id,
      status: 'VISITED',
      date: args.planItem.date,
      visitTime: args.visitTime,
      doctorName: doctor && typeof doctor === 'object' ? doctor.name : 'Doctor',
      specialization:
        doctor && typeof doctor === 'object' ? doctor.specialization : undefined,
      notes: args.notes,
      isUnplanned: false,
    };
  },

  buildUnplannedVisitDisplay(args: {
    doctor: Doctor;
    visitTime: string;
    clientUuid: string;
    unplannedReason: string;
    notes?: string;
  }): Record<string, unknown> {
    return {
      _id: `local:${args.clientUuid}`,
      clientUuid: args.clientUuid,
      status: 'VISITED',
      date: format(new Date(args.visitTime), 'yyyy-MM-dd'),
      visitTime: args.visitTime,
      doctorName: args.doctor.name,
      specialization: args.doctor.specialization,
      notes: args.notes,
      isUnplanned: true,
      unplannedReason: args.unplannedReason,
    };
  },
};
