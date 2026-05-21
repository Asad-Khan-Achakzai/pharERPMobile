import { api, unwrap } from './client';
import type { Attendance } from '@/domain/types';

/**
 * Attendance mobile client — matches backend `attendance.routes.js`
 * and validators in `pharmaERPBackend/src/validators/attendance.validator.js`.
 *
 *  - `meToday()` returns the augmented attendance doc with `canCheckIn`,
 *    `canCheckOut`, `uiStatus`, `policySummary`, etc.
 *  - `checkIn({ reason })` mirrors `checkinBodySchema`. Lat/lng are accepted
 *    by the controller but not persisted today; we still send them so they
 *    light up once backend support lands without a mobile change.
 *  - `checkOut()` takes no body (no validator).
 */
export interface CheckInInput {
  reason?: string;
  lat?: number;
  lng?: number;
  clientUuid?: string;
}

export interface CheckOutInput {
  clientUuid?: string;
}

export const attendanceApi = {
  async meToday(): Promise<Attendance | null> {
    try {
      const resp = await api.get('/attendance/me/today');
      return unwrap<Attendance>(resp);
    } catch {
      return null;
    }
  },
  async checkIn(input: CheckInInput = {}): Promise<Attendance> {
    const { clientUuid, reason, lat, lng } = input;
    const body: Record<string, unknown> = {};
    if (reason) body.reason = reason;
    if (lat != null) body.lat = lat;
    if (lng != null) body.lng = lng;
    const resp = await api.post('/attendance/checkin', body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
    return unwrap<Attendance>(resp);
  },
  async checkOut(input: CheckOutInput = {}): Promise<Attendance> {
    const resp = await api.post(
      '/attendance/checkout',
      {},
      { headers: input.clientUuid ? { 'X-Client-Uuid': input.clientUuid } : undefined }
    );
    return unwrap<Attendance>(resp);
  },
};
