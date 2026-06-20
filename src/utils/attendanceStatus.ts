import type { Attendance, AttendanceUiStatus } from '@/domain/types';

type AttendanceLike = Pick<
  Attendance,
  | 'uiStatus'
  | 'lateCheckInApprovalStatus'
  | 'checkInTime'
  | 'checkOutTime'
  | 'shiftCheckInClosed'
>;

/**
 * Mirrors backend `getMeToday` uiStatus derivation when the caller only has a raw
 * attendance document (e.g. immediately after POST /attendance/checkin).
 */
export function resolveAttendanceUiStatus(
  doc: AttendanceLike | null | undefined
): AttendanceUiStatus {
  if (!doc) return 'NOT_MARKED';
  if (doc.uiStatus) return doc.uiStatus;

  const pendingLate =
    doc.lateCheckInApprovalStatus === 'PENDING' &&
    !!doc.checkInTime &&
    !doc.checkOutTime;
  if (pendingLate) return 'LATE_CHECKIN_PENDING';

  if (doc.lateCheckInApprovalStatus === 'REJECTED' && !doc.checkInTime) {
    return 'LATE_CHECKIN_REJECTED';
  }
  if (doc.shiftCheckInClosed && !doc.checkInTime) return 'SHIFT_CHECKIN_CLOSED';
  if (doc.checkInTime && !doc.checkOutTime) return 'PRESENT';
  if (doc.checkOutTime) return 'CHECKED_OUT';
  return 'NOT_MARKED';
}

export function isLateCheckInPending(doc: Attendance | null | undefined): boolean {
  return resolveAttendanceUiStatus(doc) === 'LATE_CHECKIN_PENDING';
}

/** Team today board status labels — mirrors web `employeeStatusLabel`. */
export function employeeTeamStatusLabel(status: string): string {
  switch (status) {
    case 'PRESENT':
      return 'Present';
    case 'LATE_CHECKIN_PENDING':
      return 'Late check-in (pending)';
    case 'ABSENT':
      return 'Absent';
    case 'HALF_DAY':
      return 'Half day';
    case 'LEAVE':
      return 'Leave';
    case 'NOT_MARKED':
      return 'Not marked';
    default:
      return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
}

export function teamStatusBadgeTone(
  status: string,
): 'success' | 'warning' | 'danger' | 'muted' | 'info' {
  if (status === 'PRESENT') return 'success';
  if (status === 'LATE_CHECKIN_PENDING') return 'warning';
  if (status === 'ABSENT' || status === 'NOT_MARKED') return 'danger';
  if (status === 'HALF_DAY') return 'info';
  return 'muted';
}
