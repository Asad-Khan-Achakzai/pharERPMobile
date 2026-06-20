import { resolveAttendanceUiStatus, isLateCheckInPending } from '@/utils/attendanceStatus';

describe('attendanceStatus', () => {
  test('uses server uiStatus when present', () => {
    expect(resolveAttendanceUiStatus({ uiStatus: 'PRESENT' })).toBe('PRESENT');
  });

  test('derives LATE_CHECKIN_PENDING from lateCheckInApprovalStatus', () => {
    const doc = {
      lateCheckInApprovalStatus: 'PENDING',
      checkInTime: '2026-06-17T09:15:00.000Z',
      checkOutTime: null,
      lateMinutes: 15,
    };
    expect(resolveAttendanceUiStatus(doc)).toBe('LATE_CHECKIN_PENDING');
    expect(isLateCheckInPending(doc)).toBe(true);
  });

  test('late minutes alone does not imply pending', () => {
    const doc = {
      checkInTime: '2026-06-17T09:15:00.000Z',
      checkOutTime: null,
      lateMinutes: 15,
    };
    expect(resolveAttendanceUiStatus(doc)).toBe('PRESENT');
    expect(isLateCheckInPending(doc)).toBe(false);
  });
});
