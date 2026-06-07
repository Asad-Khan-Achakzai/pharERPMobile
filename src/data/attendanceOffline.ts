import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';
import { attendanceApi, type CheckInInput, type CheckOutInput } from '@/api/attendance';
import { ApiError } from '@/api/client';
import { outbox } from '@/data/outbox';
import { flushOutbox } from '@/data/syncEngine';
import { isOfflineApiError } from '@/data/masterSync';
import { attendanceLocal, type LocalAttendanceRecord } from '@/data/attendanceLocal';
import { useAuthStore } from '@/state/authStore';
import type { Attendance } from '@/domain/types';

export interface AttendanceCapture {
  capturedAt: string;
  lat?: number;
  lng?: number;
  accuracy?: number | null;
}

/** Capture GPS + device timestamp at action time (never fabricated on sync). */
export async function captureAttendanceLocation(): Promise<AttendanceCapture> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { capturedAt: new Date().toISOString() };
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      capturedAt: new Date(pos.timestamp).toISOString(),
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    };
  } catch {
    return { capturedAt: new Date().toISOString() };
  }
}

function userId(): string {
  const id = useAuthStore.getState().user?._id;
  if (!id) throw new Error('Not signed in');
  return String(id);
}

function buildCheckInBody(
  capture: AttendanceCapture,
  input: Pick<CheckInInput, 'reason' | 'notes'> = {}
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    capturedAt: capture.capturedAt,
  };
  if (capture.lat != null) body.lat = capture.lat;
  if (capture.lng != null) body.lng = capture.lng;
  if (capture.accuracy != null) body.accuracy = capture.accuracy;
  if (input.reason?.trim()) body.reason = input.reason.trim();
  if (input.notes?.trim()) body.notes = input.notes.trim();
  return body;
}

function buildCheckOutBody(
  capture: AttendanceCapture,
  input: Pick<CheckOutInput, 'notes'> & { notes?: string } = {}
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    capturedAt: capture.capturedAt,
  };
  if (capture.lat != null) body.lat = capture.lat;
  if (capture.lng != null) body.lng = capture.lng;
  if (capture.accuracy != null) body.accuracy = capture.accuracy;
  if (input.notes?.trim()) body.notes = input.notes.trim();
  return body;
}

async function enqueueAttendanceMutation(args: {
  feature: string;
  action: string;
  path: string;
  body: Record<string, unknown>;
  clientUuid: string;
}): Promise<void> {
  await outbox.enqueueCore({
    feature: args.feature,
    action: args.action,
    method: 'POST',
    path: args.path,
    body: args.body,
    clientUuid: args.clientUuid,
  });
  void flushOutbox();
}

export const attendanceOffline = {
  async meToday(): Promise<LocalAttendanceRecord | null> {
    const uid = userId();
    try {
      const doc = await attendanceApi.meToday();
      if (doc) {
        await attendanceLocal.cacheMeToday(uid, doc);
        const local = await attendanceLocal.getLocal(uid, doc.businessDate);
        if (local?._localPending) return local;
        return { ...doc, _syncState: 'synced' };
      }
      return attendanceLocal.mergeForDisplay(uid, null);
    } catch (err) {
      if (!isOfflineApiError(err)) throw err;
      return attendanceLocal.mergeForDisplay(uid, null);
    }
  },

  async checkIn(input: CheckInInput = {}): Promise<LocalAttendanceRecord> {
    const uid = userId();
    const clientUuid = input.clientUuid ?? uuidv4();
    const capture = await captureAttendanceLocation();
    const body = buildCheckInBody(capture, input);

    const prev = await attendanceOffline.meToday();
    const shadow = attendanceLocal.buildAfterCheckIn(prev, {
      ...capture,
      reason: input.reason,
      notes: input.notes,
    });
    await attendanceLocal.saveLocal(uid, shadow);

    try {
      const doc = await attendanceApi.checkIn({
        reason: input.reason,
        notes: input.notes,
        clientUuid,
        capturedAt: capture.capturedAt,
        lat: capture.lat,
        lng: capture.lng,
        accuracy: capture.accuracy,
      });
      await attendanceLocal.cacheMeToday(uid, doc);
      await attendanceLocal.clearLocal(uid, doc.businessDate ?? shadow.businessDate);
      return { ...doc, _syncState: 'synced' };
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 400 || status === 403 || status === 409 || status === 422) {
        await attendanceLocal.clearLocal(uid, shadow.businessDate);
        throw err;
      }
      await enqueueAttendanceMutation({
        feature: 'attendance',
        action: 'check-in',
        path: '/attendance/checkin',
        body,
        clientUuid,
      });
      return shadow;
    }
  },

  async checkOut(input: CheckOutInput & { notes?: string } = {}): Promise<LocalAttendanceRecord> {
    const uid = userId();
    const clientUuid = input.clientUuid ?? uuidv4();
    const capture = await captureAttendanceLocation();
    const body = buildCheckOutBody(capture, input);

    const prev = await attendanceOffline.meToday();
    if (!prev?.checkInTime) {
      throw new Error('Check in before checking out');
    }
    const shadow = attendanceLocal.buildAfterCheckOut(prev, { ...capture, notes: input.notes });
    await attendanceLocal.saveLocal(uid, shadow);

    try {
      const doc = await attendanceApi.checkOut({
        clientUuid,
        notes: input.notes,
        capturedAt: capture.capturedAt,
        lat: capture.lat,
        lng: capture.lng,
        accuracy: capture.accuracy,
      });
      await attendanceLocal.cacheMeToday(uid, doc as Attendance);
      await attendanceLocal.clearLocal(uid, doc.businessDate ?? shadow.businessDate);
      return { ...(doc as Attendance), _syncState: 'synced' };
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 400 || status === 403 || status === 409 || status === 422) {
        await attendanceLocal.clearLocal(uid, shadow.businessDate);
        throw err;
      }
      await enqueueAttendanceMutation({
        feature: 'attendance',
        action: 'check-out',
        path: '/attendance/checkout',
        body,
        clientUuid,
      });
      return shadow;
    }
  },

  async updateNotes(notes: string): Promise<LocalAttendanceRecord> {
    const uid = userId();
    const clientUuid = uuidv4();
    const prev = await attendanceOffline.meToday();
    if (!prev?.checkInTime) {
      throw new Error('Check in before adding notes');
    }
    const shadow: LocalAttendanceRecord = {
      ...prev,
      notes: notes.trim(),
      _localPending: true,
      _syncState: 'pending',
    };
    await attendanceLocal.saveLocal(uid, shadow);

    const body = { notes: notes.trim() };

    try {
      await attendanceApi.updateNotes(notes.trim());
      const fresh = await attendanceApi.meToday();
      if (fresh) {
        await attendanceLocal.cacheMeToday(uid, fresh);
        await attendanceLocal.clearLocal(uid, fresh.businessDate);
        return { ...fresh, _syncState: 'synced' };
      }
      return shadow;
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 400 || status === 403 || status === 422) {
        throw err;
      }
      await enqueueAttendanceMutation({
        feature: 'attendance',
        action: 'notes',
        path: '/attendance/mark',
        body,
        clientUuid,
      });
      return shadow;
    }
  },
};
