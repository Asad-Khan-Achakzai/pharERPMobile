/**
 * Offline-aware visit submission — preserves timestamps & GPS (Phase 3).
 */
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';
import { planItemsApi, visitsApi, type MarkVisitInput, type UnplannedVisitInput } from '@/api/planItems';
import { ApiError } from '@/api/client';
import { outbox } from '@/data/outbox';
import { flushOutbox } from '@/data/syncEngine';
import { isOfflineApiError } from '@/data/masterSync';
import { localEntities } from '@/data/localEntities';
import { visitLocal } from '@/data/visitLocal';
import { useAuthStore } from '@/state/authStore';
import { hasPermission } from '@/auth/rbac';
import type { Doctor, PlanItem } from '@/domain/types';

export interface VisitSubmitPayload {
  mode: 'planned' | 'unplanned';
  planItem?: PlanItem;
  doctor?: Doctor | null;
  doctorId?: string;
  unplannedReason?: string;
  startedAt: Date;
  body: Record<string, unknown>;
  clientUuid?: string;
}

async function captureVisitLocation(): Promise<{ lat: number; lng: number; accuracy?: number | null } | undefined> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return undefined;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const accuracy = pos.coords.accuracy ?? null;
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy };
  } catch {
    return undefined;
  }
}

function isRetriableVisitError(err: unknown): boolean {
  if (isOfflineApiError(err)) return true;
  const status = err instanceof ApiError ? err.status : 0;
  return status >= 500 || status === 408;
}

function buildTimedBody(
  startedAt: Date,
  base: Record<string, unknown>,
  location?: { lat: number; lng: number; accuracy?: number | null }
): Record<string, unknown> {
  const visitTime = new Date().toISOString();
  return {
    ...base,
    visitTime,
    checkInTime: startedAt.toISOString(),
    checkOutTime: visitTime,
    ...(location
      ? {
          location: {
            lat: location.lat,
            lng: location.lng,
            ...(location.accuracy != null ? { accuracy: location.accuracy } : {}),
          },
        }
      : {}),
  };
}

export const visitOffline = {
  async submit(
    payload: VisitSubmitPayload,
  ): Promise<{ queued: boolean; clientUuid: string; visitId?: string }> {
    const user = useAuthStore.getState().user;
    if (!hasPermission(user, 'weeklyPlans.markVisit')) {
      throw new ApiError({
        status: 403,
        message:
          'Insufficient permissions — your role is missing weeklyPlans.markVisit. Ask your administrator to update your role, then sign out and back in.',
      });
    }

    const clientUuid = payload.clientUuid ?? uuidv4();
    const location = await captureVisitLocation();
    const body = buildTimedBody(payload.startedAt, payload.body, location);

    try {
      let visitId: string | undefined;
      if (payload.mode === 'planned' && payload.planItem?._id) {
        const res = await planItemsApi.markVisit(payload.planItem._id, {
          ...(body as unknown as MarkVisitInput),
          clientUuid,
        });
        const r = res as unknown as { visitLogId?: string; visitLog?: { _id?: string } };
        visitId = r.visitLogId ?? r.visitLog?._id;
      } else {
        const res = await visitsApi.unplanned({
          ...(body as unknown as UnplannedVisitInput),
          doctorId: payload.doctorId!,
          unplannedReason: payload.unplannedReason as UnplannedVisitInput['unplannedReason'],
          clientUuid,
        });
        visitId = (res as unknown as { _id?: string })._id;
      }
      return { queued: false, clientUuid, visitId };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) throw err;
      if (!isRetriableVisitError(err)) throw err;

      const path =
        payload.mode === 'planned' && payload.planItem?._id
          ? `/plan-items/${payload.planItem._id}/mark-visit`
          : '/visits/unplanned';

      const queueBody: Record<string, unknown> = { ...body };
      if (payload.mode === 'unplanned') {
        queueBody.doctorId = payload.doctorId;
        queueBody.unplannedReason = payload.unplannedReason;
      }

      await outbox.enqueueCore({
        feature: 'visit',
        action: payload.mode === 'planned' ? 'mark-visit' : 'unplanned-visit',
        method: 'POST',
        path,
        body: queueBody,
        clientUuid,
      });

      const visitTime = String(body.visitTime);
      if (payload.mode === 'planned' && payload.planItem) {
        await visitLocal.applyPlannedVisitComplete({
          planItem: payload.planItem,
          visitTime,
          clientUuid,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
        });
        await localEntities.upsert({
          clientUuid,
          feature: 'visit',
          entityType: 'plan_visit',
          display: visitLocal.buildPlannedVisitDisplay({
            planItem: payload.planItem,
            doctor: payload.doctor,
            visitTime,
            clientUuid,
            notes: typeof body.notes === 'string' ? body.notes : undefined,
          }),
        });
      } else if (payload.doctor) {
        await localEntities.upsert({
          clientUuid,
          feature: 'visit',
          entityType: 'unplanned_visit',
          display: visitLocal.buildUnplannedVisitDisplay({
            doctor: payload.doctor,
            visitTime,
            clientUuid,
            unplannedReason: payload.unplannedReason ?? 'OTHER',
            notes: typeof body.notes === 'string' ? body.notes : undefined,
          }),
        });
      }

      void flushOutbox();
      return { queued: true, clientUuid };
    }
  },
};
