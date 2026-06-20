/**
 * Shared domain types used across mobile features. Names mirror the backend
 * Mongoose models in `pharmaERPBackend/src/models/*` but are flattened/relaxed
 * to be friendly for JSON over the wire.
 */

export type ID = string;

export type ISO = string;

export interface Company {
  _id: ID;
  name: string;
  status: 'ONBOARDING' | 'LIVE' | 'SUSPENDED' | 'INACTIVE';
  attendanceGeofenceEnabled?: boolean;
  doctorApprovalRequired?: boolean;
  liveTrackingEnabled?: boolean;
  mobileEnabled?: boolean;
  mobilePushEnabled?: boolean;
  featureFlags?: Record<string, boolean>;
}

export interface Role {
  _id: ID;
  code: string;
  name: string;
  permissions: string[];
}

export interface ResolvedRole {
  /** Authoritative role code (`DEFAULT_ADMIN`, `DEFAULT_MEDICAL_REP`, `DEFAULT_ASM`, `DEFAULT_RM`, or tenant-custom). */
  code: string | null;
  isSystem: boolean;
  name?: string;
}

export interface User {
  _id: ID;
  companyId: ID;
  email: string;
  name: string;
  phone?: string;
  roleId?: ID | { _id: ID; code?: string; name?: string; permissions?: string[]; isSystem?: boolean } | null;
  /**
   * Legacy enum (`SUPER_ADMIN` | `ADMIN` | `MEDICAL_REP`). Authoritative role code
   * for RBAC tier is `resolvedRole.code`; see `pharmaERPBackend/src/utils/authUserPayload.js`.
   */
  role?: string | null;
  resolvedRole?: ResolvedRole | null;
  userType: 'EMPLOYEE' | 'OWNER' | 'EXTERNAL' | string;
  /** Effective permissions resolved by the backend; this is the source of truth on mobile too. */
  permissions?: string[];
  territoryId?: ID | { _id: ID; name?: string } | null;
  coverageTerritoryIds?: Array<ID | { _id: ID; name?: string }>;
  managerId?: ID | null;
  activeCompanyId?: ID | null;
  tenantCompanyFlags?: {
    weeklyPlanApprovalRequired?: boolean;
    strictVisitSequence?: boolean;
    mrepMultiTerritory?: boolean;
    mrepOwnershipAudit?: boolean;
  };
  isActive: boolean;
}

export interface Doctor {
  _id: ID;
  companyId?: ID;
  name: string;
  /** Backend field name. */
  specialization?: string;
  qualification?: string;
  phone?: string;
  mobileNo?: string;
  email?: string;
  gender?: string;
  frequency?: string;
  patientCount?: number | null;
  /** Backend uses `locationName` (free-text clinic/location label) + `address`. */
  locationName?: string;
  address?: string;
  city?: string;
  zone?: string;
  doctorBrick?: string;
  doctorCode?: string;
  grade?: string;
  tier?: string;
  designation?: string;
  pmdcRegistration?: string;
  /** Populated by backend on some endpoints; falls back to raw id otherwise. */
  pharmacyId?: ID | { _id: ID; name?: string } | null;
  territoryId?: ID | { _id: ID; name?: string } | null;
  assignedRepId?: ID | { _id: ID; name?: string } | null;
  monthlyVisitTarget?: number | null;
  isActive?: boolean;
  isDeleted?: boolean;
  locationStatus?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PharmacyBonusScheme {
  buyQty: number;
  getQty: number;
}

export interface Pharmacy {
  _id: ID;
  companyId?: ID;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  /** % discount on TP applied to pharmacy bills (mirrors backend `discountOnTP`). */
  discountOnTP?: number;
  bonusScheme?: PharmacyBonusScheme;
  territoryId?: ID | null;
  isActive?: boolean;
  /** Derived from ledger summary; not a stored field on the Pharmacy doc. */
  outstanding?: number;
  isDeleted?: boolean;
}

export interface Distributor {
  _id: ID;
  companyId?: ID;
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  /** % default discount used to seed order lines and to estimate previews. */
  discountOnTP?: number;
  /** Backend `commissionPercentOnTP` (used by financial.service for snapshot). */
  commissionPercentOnTP?: number;
  isActive?: boolean;
}

export interface Product {
  _id: ID;
  companyId?: ID;
  name: string;
  sku?: string;
  packSize?: string;
  /** Backend `mrp` — MRP (Maximum Retail Price). */
  mrp?: number;
  /** Backend `tp` — Trade Price; the server uses this when snapshotting line totals. */
  tp?: number;
  /** Backend `casting` — manufacturing cost component used for company revenue math. */
  casting?: number;
  /** Legacy aliases retained for older callers; new code should use `tp`. */
  ptr?: number;
  pts?: number;
  category?: string;
  isActive?: boolean;
}

export interface VisitLog {
  _id: ID;
  companyId?: ID;
  doctorId: ID | Pick<Doctor, '_id' | 'name' | 'specialization'>;
  employeeId?: ID;
  planItemId?: ID | null;
  /** Legacy alias kept for older callers; new code should use `visitTime`. */
  date?: ISO;
  visitTime?: ISO;
  checkInTime?: ISO;
  checkOutTime?: ISO;
  status?: 'PENDING' | 'VISITED' | 'MISSED';
  isUnplanned?: boolean;
  notes?: string;
  orderTaken?: boolean;
  productsDiscussed?: ID[];
  primaryProductId?: ID | null;
  samplesQty?: number | null;
  samplesGiven?: string | null;
  followUpDate?: ISO | null;
  location?: { lat?: number; lng?: number };
}

/**
 * Status enum aligned with backend PLAN_ITEM_STATUS:
 * `PENDING` (planned, not yet visited), `VISITED`, `MISSED`.
 */
export type PlanItemStatus = 'PENDING' | 'VISITED' | 'MISSED';

export interface PlanItem {
  _id: ID;
  companyId?: ID;
  weeklyPlanId: ID | { _id: ID; weekStartDate?: ISO; weekEndDate?: ISO; status?: string };
  employeeId: ID;
  date: ISO;
  type: string;
  /**
   * Populated by the backend `populate('doctorId', 'name specialization')`.
   * Raw string when not populated, object when populated.
   */
  doctorId?: ID | Pick<Doctor, '_id' | 'name' | 'specialization'> | null;
  sequenceOrder?: number;
  plannedTime?: string;
  actualVisitTime?: ISO | null;
  isUnplanned?: boolean;
  status: PlanItemStatus;
  wasOutOfOrder?: boolean;
  outOfOrderReason?: string | null;
  unplannedReason?: 'EMERGENCY' | 'AVAILABLE_UNEXPECTEDLY' | 'OTHER' | null;
  visitLogId?: ID | VisitLog | null;
  title?: string;
  notes?: string;
}

export interface TodayBundle {
  date: string;
  summary: {
    total: number;
    pending: number;
    visited: number;
    missed: number;
  };
  dayExecutionState?: string;
  nextPlanItem?: PlanItem | null;
  endOfDayPreview?: {
    visited: number;
    missed: number;
    coveragePercent: number;
    outOfSequenceCount: number;
    unplannedCompletedCount: number;
    dayComplete: boolean;
  };
  coverageHints?: Array<{
    doctorId: ID;
    doctorName?: string;
    onTrack?: boolean;
    remaining?: number;
  }>;
  coverageAlert?: { severity: string; message: string; count: number } | null;
  items: PlanItem[];
}

/** Backend `Attendance.status` enum. */
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

/** Mirrors backend `ATTENDANCE_REQUEST_TYPE` enum in `enums.js`. */
export type AttendanceRequestType =
  | 'LATE_ARRIVAL'
  | 'MISSED_CHECKOUT'
  | 'TIME_CORRECTION'
  | 'MANUAL_EXCEPTION';

/** Mirrors backend `ATTENDANCE_REQUEST_STATUS` enum in `enums.js`. */
export type AttendanceRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ESCALATED';

/**
 * AttendanceRequest — mirrors the populated server payload from
 * `GET /attendance/requests/inbox`. `requesterId`, `currentApproverId`, and
 * `attendanceId` are populated on the inbox response (controller-level
 * `.populate(...)`) so callers receive the underlying user / attendance docs.
 */
export interface AttendanceRequestDecision {
  actorId?: ID | null;
  action?: string;
  comment?: string;
  at?: ISO;
  source?: 'USER' | 'SYSTEM' | 'POLICY';
}

/**
 * Governance envelope returned by `GET /attendance/governance/request-queue`
 * (see `attendanceWorkflowService.listGovernanceRequestQueue`). Includes the
 * SLA countdown, queue ownership, and viewer's ability to act.
 */
export interface AttendanceRequestGovernance {
  slaDueAt?: ISO | null;
  slaMinutesRemaining?: number | null;
  /** Request is held in the company admin pool (not assigned to one user). */
  isAdminQueue?: boolean;
  /** 1-indexed display position of the current approval step. */
  currentStepDisplay?: number;
  /** Total number of steps in the snapshot matrix. */
  stepTotal?: number;
  /** Whether the viewer can approve/reject/escalate this request right now. */
  viewerCanAct?: boolean;
  /** When `viewerCanAct === false`, a short reason explaining why. */
  viewerReadOnlyReason?: string | null;
}

/** Single workflow timeline entry returned by `attachWorkflowTimelines`. */
export interface AttendanceWorkflowTimelineEntry {
  at?: ISO;
  type?: string;
  actor?: { _id?: ID; name?: string; email?: string } | null;
  label?: string;
  comment?: string;
  source?: 'USER' | 'SYSTEM' | 'POLICY';
}

export interface AttendanceRequest {
  _id: ID;
  companyId?: ID;
  requesterId: ID | { _id: ID; name?: string; email?: string };
  currentApproverId?: ID | { _id: ID; name?: string; email?: string } | null;
  attendanceId?:
    | ID
    | { _id: ID; date?: ISO; checkInTime?: ISO | null; checkOutTime?: ISO | null }
    | null;
  type: AttendanceRequestType;
  status: AttendanceRequestStatus;
  reason?: string;
  payload?: Record<string, unknown>;
  /** Snapshot of the approval-matrix step structure at submit time. */
  stepsSnapshot?: unknown[];
  currentStepIndex?: number;
  slaDueAt?: ISO | null;
  decisions?: AttendanceRequestDecision[];
  /** True when request is held in the company admin pool. */
  adminPool?: boolean;
  /** Governance metadata — only present on the governance queue endpoint. */
  governance?: AttendanceRequestGovernance;
  /** Annotated decisions + lifecycle events for the timeline view. */
  workflowTimeline?: AttendanceWorkflowTimelineEntry[];
  createdAt?: ISO;
  updatedAt?: ISO;
}

/**
 * Backend `uiStatus` returned by `GET /attendance/me/today` — derived in
 * `attendance.service.js`. We surface it directly in the mobile UI so it
 * matches the web "My Attendance" screen.
 */
export type AttendanceUiStatus =
  | 'NOT_MARKED'
  | 'PRESENT'
  | 'CHECKED_OUT'
  | 'LATE_CHECKIN_PENDING'
  | 'LATE_CHECKIN_REJECTED'
  | 'SHIFT_CHECKIN_CLOSED';

/**
 * Attendance — field names match `pharmaERPBackend/src/models/Attendance.js`.
 * Note: `lat`/`lng` and `selfieMediaId` are NOT persisted on the backend yet;
 * they remain on the type for client convenience until storage is wired.
 */
export interface Attendance {
  _id?: ID;
  companyId?: ID;
  employeeId?: ID;
  date?: ISO;
  status?: AttendanceStatus | null;
  /** ISO timestamp of the check-in event. */
  checkInTime?: ISO | null;
  /** ISO timestamp of the check-out event. */
  checkOutTime?: ISO | null;
  checkInSource?: string;
  checkOutSource?: string;
  lateMinutes?: number;
  workShiftId?: ID | null;
  policyId?: ID | null;
  activeRequestId?: ID | null;
  lateCheckInApprovalStatus?: string | null;
  markedBy?: 'SELF' | 'ADMIN';
  notes?: string;
  /** Server-computed flags returned by `GET /attendance/me/today`. */
  canCheckIn?: boolean;
  canCheckOut?: boolean;
  uiStatus?: AttendanceUiStatus;
  businessDate?: string;
  shiftCheckInClosed?: boolean;
  shiftCheckInClosedMessage?: string;
  policySummary?: Record<string, unknown> | null;
  governance?: {
    attendanceGovernanceEnabled?: boolean;
    attendancePoliciesEnabled?: boolean;
    attendanceApprovalsEnabled?: boolean;
    strictLateBlocking?: boolean;
    allowCheckInWhenLate?: boolean;
    autoRequestOnLateCheckIn?: boolean;
    attendanceSystemMode?: AttendanceSystemMode;
  };
  /** V2 check-in zone metadata (informational only; server-authoritative). */
  attendanceLocationStatus?: AttendanceLocationStatus;
  distanceFromCheckInPoint?: number | null;
  requiredCheckInLocation?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  resolvedCheckInPolicy?: {
    type: string;
    locationName: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  checkInPolicyV2?: CheckInPolicyPreview;
  /** Client-only conveniences (not persisted yet on the Attendance model). */
  lat?: number;
  lng?: number;
  checkInLat?: number;
  checkInLng?: number;
  checkInAccuracy?: number | null;
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutAccuracy?: number | null;
  selfieMediaId?: ID | null;
  /** Client-only: offline shadow / sync visibility (Phase 2+). */
  _localPending?: boolean;
  _pendingCheckIn?: boolean;
  _pendingCheckOut?: boolean;
  _syncState?: 'synced' | 'pending' | 'failed';
}

export type CheckInPolicyType =
  | 'COMPANY_DEFAULT'
  | 'FIRST_PLANNED_VISIT'
  | 'SPECIFIC_DOCTOR'
  | 'CUSTOM_LOCATION';

export type AttendanceLocationStatus = 'WITHIN_ZONE' | 'OUT_OF_ZONE';

export type AttendanceSystemMode = 'LEGACY' | 'CHECKIN_POLICY_V2';

export interface CheckInConfiguration {
  policyType: CheckInPolicyType;
  doctorId?: ID | null;
  customLocation?: {
    locationName: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
}

export interface CheckInPolicyPreview {
  enabled: boolean;
  policyType?: CheckInPolicyType | null;
  source?: string | null;
  requiredCheckInLocation?: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
  } | null;
}

export interface WeeklyPlan {
  _id: ID;
  companyId?: ID;
  /** Backend field. */
  medicalRepId: ID | Pick<User, '_id' | 'name'>;
  weekStartDate: ISO;
  weekEndDate: ISO;
  status: 'DRAFT' | 'SUBMITTED' | 'ACTIVE' | 'COMPLETED' | 'REVIEWED';
  notes?: string;
  approvalRequired?: boolean;
  submittedAt?: ISO | null;
  approvedBy?: ID | null;
  approvedAt?: ISO | null;
  rejectedReason?: string | null;
  checkInConfiguration?: CheckInConfiguration | null;
  totalPlanItems?: number;
  plannedDoctorCount?: number;
  planItemsCount?: number;
}

/** `GET /weekly-plans/:id` — plan document plus embedded plan items. */
export interface WeeklyPlanDetail extends WeeklyPlan {
  planItems?: PlanItem[];
  executionMetrics?: Record<string, unknown>;
  attendanceSystemMode?: AttendanceSystemMode;
  editLock?: {
    beforePlanWeek?: boolean;
    businessTodayYmd?: string;
  };
}

export interface BulkPlanItemInput {
  date: string;
  type: 'DOCTOR_VISIT' | 'OTHER_TASK';
  doctorId?: string | null;
  title?: string;
  notes?: string;
  plannedTime?: string | null;
}

export interface Order {
  _id: ID;
  companyId?: ID;
  orderNumber?: string;
  pharmacyId: ID | Pick<Pharmacy, '_id' | 'name' | 'city'>;
  doctorId?: ID | Pick<Doctor, '_id' | 'name'>;
  distributorId: ID | Pick<Distributor, '_id' | 'name'>;
  medicalRepId?: ID;
  status: string;
  items: OrderItem[];
  totalOrderedAmount?: number;
  totalAmount?: number;
  pharmacyDiscountAmount?: number;
  amountAfterPharmacyDiscount?: number;
  distributorCommissionAmount?: number;
  finalCompanyRevenue?: number;
  totalBonusQuantity?: number;
  orderDate?: ISO;
  visitLogId?: ID | null;
  notes?: string;
  createdAt?: ISO;
  deliveries?: DeliveryRecord[];
}

export interface OrderItem {
  _id?: ID;
  productId: ID;
  productName?: string;
  quantity: number;
  deliveredQty?: number;
  returnedQty?: number;
  tpAtTime?: number;
  castingAtTime?: number;
  distributorDiscount?: number;
  clinicDiscount?: number;
  bonusScheme?: { buyQty?: number; getQty?: number };
  bonusQuantity?: number;
  grossAmount?: number;
  pharmacyDiscountAmount?: number;
  netAfterPharmacy?: number;
  distributorCommissionAmount?: number;
  finalCompanyAmount?: number;
}

/**
 * Mirrors backend `EXPENSE_CATEGORY` enum in
 * `pharmaERPBackend/src/constants/enums.js`. NEVER simplify on mobile.
 */
export type ExpenseCategory =
  | 'DOCTOR_INVESTMENT'
  | 'SALARY'
  | 'RENT'
  | 'LOGISTICS'
  | 'OFFICE'
  | 'OTHER';

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MoneyAccount {
  _id: ID;
  code?: string;
  name?: string;
  moneyAccountNature?: 'CASH' | 'BANK' | string;
  currentBalance?: number;
}

export interface Expense {
  _id: ID;
  companyId?: ID;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  date: ISO;
  distributorId?: ID | null;
  doctorId?: ID | null;
  employeeId?: ID | null | { _id?: ID; name?: string };
  approvedBy?: ID | null | { _id?: ID; name?: string };
  status?: ExpenseStatus;
  rejectionReason?: string | null;
  expenseAccountId?: ID | { _id: ID; code?: string; name?: string } | null;
  moneyAccountId?: ID | { _id: ID; code?: string; name?: string; moneyAccountNature?: string } | null;
  createdBy?: ID | null;
  createdAt?: ISO;
}

export type PaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI';

export type CollectorType = 'COMPANY' | 'DISTRIBUTOR';

export type SettlementDirection = 'DISTRIBUTOR_TO_COMPANY' | 'COMPANY_TO_DISTRIBUTOR';

export interface Collection {
  _id: ID;
  companyId?: ID;
  pharmacyId: ID | Pick<Pharmacy, '_id' | 'name'>;
  collectorType: CollectorType;
  distributorId?: ID | Pick<Distributor, '_id' | 'name'> | null;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  collectedBy?: ID;
  date?: ISO;
  notes?: string;
  createdAt?: ISO;
}

export interface Settlement {
  _id: ID;
  distributorId: ID | Pick<Distributor, '_id' | 'name'>;
  direction: SettlementDirection;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  date?: ISO;
  createdAt?: ISO;
}

export interface MediaAsset {
  _id: ID;
  companyId: ID;
  uploadedBy: ID;
  kind:
    | 'VISIT_PHOTO'
    | 'ATTENDANCE_SELFIE'
    | 'EXPENSE_RECEIPT'
    | 'PAYMENT_RECEIPT'
    | 'PRODUCT_VISUAL'
    | 'OTHER';
  bucket: string;
  key: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  status: 'PENDING_UPLOAD' | 'READY' | 'FAILED';
  linkedTo?: { resource: string; id: ID } | null;
  createdAt?: ISO;
}

export interface ServerConfig {
  serverTime: ISO;
  media: {
    enableMediaUpload: boolean;
    enableVisitPhotos: boolean;
    enableExpenseReceipts: boolean;
    enableProductMedia: boolean;
    maxFileSize: number;
    allowedMime: string[];
  };
  attendance: {
    geofenceEnabled: boolean;
    selfieEnabled: boolean;
    geofenceRadiusMeters?: number;
    systemMode?: AttendanceSystemMode;
    configVersion?: number;
    configUpdatedAt?: string | null;
  };
  doctors: {
    approvalRequired: boolean;
  };
  sync: {
    pageSize: number;
    pollIntervalMs: number;
  };
  push?: {
    enabled: boolean;
    /** True when backend has EXPO_ACCESS_TOKEN configured */
    backendReady?: boolean;
  };
  liveTracking?: {
    enabled: boolean;
    maxAccuracyMeters?: number;
    heartbeatIntervalMs?: number;
  };
  expenses?: {
    approvalRequired: boolean;
  };
  company: {
    id: ID;
    status: Company['status'];
    name: string;
    mobilePushEnabled?: boolean;
    liveTrackingEnabled?: boolean;
    expenseApprovalRequired?: boolean;
  };
}

export interface DeliveryRecord {
  _id: ID;
  orderId?: ID;
  invoiceNumber?: string;
  deliveredAt?: ISO;
  deliveredBy?: ID | { _id?: ID; name?: string };
  status?: string;
}

export type LiveAttendanceStatus = 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT' | 'LATE_CHECKIN_PENDING';

export type LiveLocationSource = 'heartbeat' | 'checkin' | null;

export interface LiveRepLocation {
  userId: ID;
  name: string;
  attendanceStatus: LiveAttendanceStatus;
  checkInTime: ISO | null;
  checkOutTime: ISO | null;
  lat: number | null;
  lng: number | null;
  accuracy?: number | null;
  capturedAt: ISO | null;
  ageSeconds: number | null;
  locationSource?: LiveLocationSource;
}

export interface DeviceSession {
  _id: ID;
  userId: ID;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  brand?: string;
  model?: string;
  appVersion?: string;
  osVersion?: string;
  pushToken?: string;
  lastSeenAt?: ISO;
  isCurrent?: boolean;
}
