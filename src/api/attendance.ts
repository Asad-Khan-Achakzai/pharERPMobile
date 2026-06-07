import { api, unwrap } from './client';
import type { Attendance } from '@/domain/types';

/**
 * Attendance mobile client — matches backend `attendance.routes.js`
 * and validators in `pharmaERPBackend/src/validators/attendance.validator.js`.
 */
export interface CheckInInput {
  reason?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  accuracy?: number | null;
  /** Device time when the rep tapped check-in (preserved through offline sync). */
  capturedAt?: string;
  clientUuid?: string;
}

export interface CheckOutInput {
  notes?: string;
  lat?: number;
  lng?: number;
  accuracy?: number | null;
  capturedAt?: string;
  clientUuid?: string;
}

export interface TeamTodayBoard {
  businessDate?: string;
  employees?: Array<{
    employeeId: string;
    name: string;
    status: string;
  }>;
  summary?: {
    presentPayroll?: number;
    present?: number;
    notMarked?: number;
    absent?: number;
    pendingLateApproval?: number;
    totalEmployees?: number;
  };
}

export const attendanceApi = {
  async teamToday(): Promise<TeamTodayBoard | null> {
    try {
      const resp = await api.get('/attendance/today');
      return unwrap<TeamTodayBoard>(resp);
    } catch {
      return null;
    }
  },
  async meToday(): Promise<Attendance | null> {
    try {
      const resp = await api.get('/attendance/me/today');
      return unwrap<Attendance>(resp);
    } catch {
      return null;
    }
  },
  async checkIn(input: CheckInInput = {}): Promise<Attendance> {
    const { clientUuid, reason, notes, lat, lng, accuracy, capturedAt } = input;
    const body: Record<string, unknown> = {};
    if (reason) body.reason = reason;
    if (notes) body.notes = notes;
    if (lat != null) body.lat = lat;
    if (lng != null) body.lng = lng;
    if (accuracy != null) body.accuracy = accuracy;
    if (capturedAt) body.capturedAt = capturedAt;
    const resp = await api.post('/attendance/checkin', body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
    return unwrap<Attendance>(resp);
  },
  async checkOut(input: CheckOutInput = {}): Promise<Attendance> {
    const { clientUuid, notes, lat, lng, accuracy, capturedAt } = input;
    const body: Record<string, unknown> = {};
    if (notes) body.notes = notes;
    if (lat != null) body.lat = lat;
    if (lng != null) body.lng = lng;
    if (accuracy != null) body.accuracy = accuracy;
    if (capturedAt) body.capturedAt = capturedAt;
    const resp = await api.post('/attendance/checkout', body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
    return unwrap<Attendance>(resp);
  },

  /** Updates notes on today's open attendance (`POST /attendance/mark`). */
  async updateNotes(notes: string): Promise<Attendance> {
    const resp = await api.post('/attendance/mark', { notes });
    return unwrap<Attendance>(resp);
  },

  async heartbeat(input: {
    lat: number;
    lng: number;
    accuracy?: number | null;
    capturedAt?: string;
    clientUuid?: string;
  }): Promise<void> {
    const { clientUuid, ...body } = input;
    await api.post('/attendance/heartbeat', body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
  },

  async live(): Promise<import('@/domain/types').LiveRepLocation[]> {
    try {
      const resp = await api.get('/attendance/live');
      return unwrap<import('@/domain/types').LiveRepLocation[]>(resp);
    } catch {
      return [];
    }
  },
};
