/**
 * Attendance approval workflow — Web Parity Contract
 *
 *  Web reference:
 *    - `pharmaERPFE/src/services/attendance.service.ts`
 *      (`attendanceInbox`, `governanceRequestQueue`,
 *       `approveAttendanceRequest`, `rejectAttendanceRequest`,
 *       `escalateAttendanceRequest`)
 *    - `pharmaERPFE/src/views/attendance/governance/AttendanceGovernanceQueueView.tsx`
 *      (admin / company-wide queue — what admins actually see on web)
 *    - `pharmaERPFE/src/views/attendance/team/TeamAttendanceView.tsx`
 *      (direct approvers' personal inbox)
 *
 *  Backend routes (`pharmaERPBackend/src/routes/v1/attendance.routes.js`):
 *    - `GET  /attendance/requests/inbox`              (assigned-to-me queue)
 *    - `GET  /attendance/governance/request-queue`    (company-wide queue)
 *    - `GET  /attendance/requests/mine`               (my own requests)
 *    - `POST /attendance/requests/:id/approve | /reject | /escalate`
 *
 *  Permission gates (matches web `getAttendancePermissionFlags`):
 *    - Inbox / approve / reject / escalate:
 *        `admin.access | attendance.approve | attendance.approve.direct
 *         | attendance.approve.escalated`
 *    - Governance queue:
 *        `admin.access | attendance.governance.view`
 */
import { api, unwrap } from './client';
import type { AttendanceRequest, ID } from '@/domain/types';

export interface InboxParams {
  limit?: number;
  skip?: number;
  sort?: 'newest' | 'oldest';
}

export interface DecisionInput {
  comment?: string;
}

export const attendanceRequestsApi = {
  /**
   * "My inbox" — only returns requests where the viewer is the current
   * approver (or has been delegated to). An admin who isn't sitting on the
   * matrix step will see an empty list here; use `governanceQueue` instead.
   */
  async inbox(params: InboxParams = {}): Promise<AttendanceRequest[]> {
    const resp = await api.get('/attendance/requests/inbox', { params });
    return unwrap<AttendanceRequest[]>(resp);
  },
  /**
   * Company-wide queue used by admins / `attendance.governance.view`
   * holders. Returns the same rows as `inbox` PLUS every other pending
   * request in the company, each annotated with a `governance` envelope
   * (`viewerCanAct`, `slaMinutesRemaining`, `isAdminQueue`, etc.).
   */
  async governanceQueue(params: InboxParams = {}): Promise<AttendanceRequest[]> {
    const resp = await api.get('/attendance/governance/request-queue', { params });
    return unwrap<AttendanceRequest[]>(resp);
  },
  async mine(): Promise<AttendanceRequest[]> {
    const resp = await api.get('/attendance/requests/mine');
    return unwrap<AttendanceRequest[]>(resp);
  },
  async approve(id: ID, input: DecisionInput = {}): Promise<AttendanceRequest> {
    const resp = await api.post(`/attendance/requests/${id}/approve`, input);
    return unwrap<AttendanceRequest>(resp);
  },
  async reject(id: ID, input: DecisionInput = {}): Promise<AttendanceRequest> {
    const resp = await api.post(`/attendance/requests/${id}/reject`, input);
    return unwrap<AttendanceRequest>(resp);
  },
  async escalate(id: ID, input: DecisionInput = {}): Promise<AttendanceRequest> {
    const resp = await api.post(`/attendance/requests/${id}/escalate`, input);
    return unwrap<AttendanceRequest>(resp);
  },
};
