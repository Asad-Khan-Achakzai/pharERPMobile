/**
 * Local shadow attendance for offline check-in/out.
 * Preserves device timestamps and GPS until outbox sync succeeds.
 */
import { format } from 'date-fns';
import { getDb } from './db';
import { getKvJSON, setKvJSON } from './kvStore';
import type { Attendance } from '@/domain/types';

export type AttendanceSyncState = 'synced' | 'pending' | 'failed';

export interface LocalAttendanceRecord extends Attendance {
  /** True when any attendance mutation is still in outbox. */
  _localPending?: boolean;
  _pendingCheckIn?: boolean;
  _pendingCheckOut?: boolean;
  _syncState?: AttendanceSyncState;
}

function todayYmd(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export const ATTENDANCE_KV = {
  cachedMeToday: (userId: string, date: string) => `sync.attendance.meToday.${userId}.${date}`,
} as const;

export const attendanceLocal = {
  async cacheMeToday(userId: string, doc: Attendance): Promise<void> {
    const date = doc.businessDate ?? todayYmd();
    await setKvJSON(ATTENDANCE_KV.cachedMeToday(userId, date), doc);
  },

  async getCachedMeToday(userId: string, date = todayYmd()): Promise<Attendance | null> {
    return getKvJSON<Attendance>(ATTENDANCE_KV.cachedMeToday(userId, date));
  },

  async getLocal(userId: string, date = todayYmd()): Promise<LocalAttendanceRecord | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ json: string }>(
      'SELECT json FROM attendance_local WHERE user_id = ? AND business_date = ?',
      [userId, date]
    );
    return row ? (JSON.parse(row.json) as LocalAttendanceRecord) : null;
  },

  async saveLocal(userId: string, record: LocalAttendanceRecord): Promise<void> {
    const db = await getDb();
    const date = record.businessDate ?? todayYmd();
    await db.runAsync(
      `INSERT INTO attendance_local (user_id, business_date, json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, business_date) DO UPDATE SET
         json = excluded.json,
         updated_at = excluded.updated_at`,
      [userId, date, JSON.stringify(record), Date.now()]
    );
  },

  async clearLocal(userId: string, date = todayYmd()): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'DELETE FROM attendance_local WHERE user_id = ? AND business_date = ?',
      [userId, date]
    );
  },

  async mergeForDisplay(
    userId: string,
    network: Attendance | null,
    date = todayYmd()
  ): Promise<LocalAttendanceRecord | null> {
    const local = await attendanceLocal.getLocal(userId, date);
    if (local) return local;
    if (network) return { ...network, _syncState: 'synced' };
    const cached = await attendanceLocal.getCachedMeToday(userId, date);
    return cached ? { ...cached, _syncState: 'synced' } : null;
  },

  buildAfterCheckIn(
    prev: Attendance | null,
    capture: {
      capturedAt: string;
      lat?: number;
      lng?: number;
      accuracy?: number | null;
      reason?: string;
      notes?: string;
    }
  ): LocalAttendanceRecord {
    const businessDate = format(new Date(capture.capturedAt), 'yyyy-MM-dd');
    return {
      ...(prev ?? {}),
      businessDate,
      checkInTime: capture.capturedAt,
      checkOutTime: null,
      status: 'PRESENT',
      canCheckIn: false,
      canCheckOut: true,
      uiStatus: capture.reason?.trim() ? 'LATE_CHECKIN_PENDING' : 'PRESENT',
      lat: capture.lat,
      lng: capture.lng,
      notes: capture.notes?.trim() || prev?.notes,
      _localPending: true,
      _pendingCheckIn: true,
      _syncState: 'pending',
    };
  },

  buildAfterCheckOut(
    prev: LocalAttendanceRecord | Attendance,
    capture: {
      capturedAt: string;
      lat?: number;
      lng?: number;
      accuracy?: number | null;
      notes?: string;
    }
  ): LocalAttendanceRecord {
    return {
      ...prev,
      checkOutTime: capture.capturedAt,
      canCheckIn: false,
      canCheckOut: false,
      uiStatus: 'CHECKED_OUT',
      status: prev.status ?? 'PRESENT',
      notes: capture.notes?.trim() || prev.notes,
      _localPending: true,
      _pendingCheckOut: true,
      _pendingCheckIn: false,
      _syncState: 'pending',
    };
  },
};
