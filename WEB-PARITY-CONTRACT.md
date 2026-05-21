# PharmaERP Mobile — Web Parity Contract

> **Final rule:** Mobile = Web ERP workflow execution layer with better UX, **NOT** a redesigned product.

This document binds every mobile screen / mutation to its web counterpart and
backend contract. Reviewers MUST treat any mismatch (missing field, different
enum value, different validation, different side effect) as a **bug**, not a
"mobile-specific simplification".

## Ground rules (non-negotiable)

1. **No mobile-only business logic.** If the backend or web supports a field /
   enum value / role check, mobile must support it.
2. **No hidden fields.** If a field exists in the web create/edit flow, the
   same field must exist in the mobile UI — even when it is optional.
3. **Same payload structure.** The body POST'd from mobile must structurally
   match what the web sends. Field names, types, enums, units.
4. **Role-based routing is decided AFTER bootstrap.** The rep/manager shell is
   chosen once per session in `app/_layout.tsx::RouterGuard` and frozen.
   No mid-render mutation.
5. **Permissions drive visibility.** The "More" tab and any action gate are
   derived from `user.permissions` (server-issued) via `src/auth/rbac.ts`.

## Source-of-truth files

| Concern | File |
|--|--|
| Backend Joi validators | `pharmaERPBackend/src/validators/*.validator.js` |
| Backend Mongoose models | `pharmaERPBackend/src/models/*.js` |
| Backend permission catalog | `pharmaERPBackend/src/constants/permissions.js` |
| Backend role codes | `pharmaERPBackend/src/constants/rbac.js` |
| Backend effective permission resolver | `pharmaERPBackend/src/utils/effectivePermissions.js` |
| Web FE screens (parity baseline) | `pharmaERPFE/src/views/**` |
| Mobile RBAC | `pharERPMobile/src/auth/rbac.ts` |
| Mobile router guard | `pharERPMobile/app/_layout.tsx` |

## Module map

### Orders

| Mobile | Web baseline | Backend endpoint | Validator |
|--|--|--|--|
| `app/order/new.tsx` | `pharmaERPFE/src/views/orders/CreateOrderPage.tsx` | `POST /api/v1/orders` | `createOrderSchema` |
| `app/order/[id].tsx` (read-only) | `pharmaERPFE/src/views/orders/OrderViewPage.tsx` | `GET /api/v1/orders/:id` | — |
| `app/(tabs)/orders.tsx` | `pharmaERPFE/src/views/orders/OrderListPage.tsx` | `GET /api/v1/orders` | — |

**Submitted fields (mobile → backend):**
`pharmacyId*`, `doctorId` (optional, with explicit "No doctor"),
`distributorId*`, `medicalRepId` (defaults to current user),
`items[].productId*`, `items[].quantity*`, `items[].distributorDiscount?`,
`items[].clinicDiscount?`, `items[].bonusQuantity?`, `notes?`,
`visitLogId?` (link to active visit).

**Behavior:** pharmacy-linked doctors auto-load; first one is selected by
default and the user can clear it. Bonus quantity recalculates from
`pharmacy.bonusScheme.{buyQty,getQty}` whenever paid qty changes unless the
rep has manually overridden the bonus field. Distributor and pharmacy
discount defaults are applied per line.

### Weekly plans

| Mobile | Web baseline | Backend endpoint | Validator |
|--|--|--|--|
| `app/plan/weekly.tsx` | `WeeklyPlansPage.tsx` | `GET /weekly-plans` (`scope=team`, status filter) | — |
| `app/plan/new.tsx` | `WeeklyPlansPage.tsx` create dialog | `POST /weekly-plans` | `createWeeklyPlanSchema` |
| `app/plan/[id].tsx` | `WeeklyPlanDetailPage.tsx` | `GET/PUT /weekly-plans/:id`, `POST .../plan-items`, `POST .../submit`, `PUT /plan-items/reorder`, `GET /reports/mrep/doctor-coverage` | `updateWeeklyPlanSchema`, `bulkPlanItemsSchema`, `reorderPlanItemsSchema` |

**Mobile-only UX (no web/API changes):** Doctor picker soft-priority (`DoctorPickerSheet` +
`useRecommendedDoctors`); local day-draft persistence (`usePlanDraftStorage` / SQLite kv);
per-day reorder via up/down on scheduled items.

**Permissions:** `weeklyPlans.view` (list/detail), `weeklyPlans.create` (new plan),
`weeklyPlans.edit` (notes, add visits, submit, copy week, reorder). `weeklyPlans.review` /
`weeklyPlans.approve` on `(manager)/approvals` and plan detail when `SUBMITTED`.
Team list requires `team.view` / `team.viewAllReports` / `admin.access` (same as web `TeamScopeToggle`).

### Visits

| Mobile | Web baseline | Backend endpoint | Validator |
|--|--|--|--|
| `app/(tabs)/visits.tsx` | `pharmaERPFE/src/views/visits/TodayVisitsPage.tsx` | `GET /api/v1/plan-items/today` | `listTodayQuerySchema` |
| `app/visit/[id].tsx` (planned) | `TodayVisitsPage.tsx` — Mark Visit dialog | `POST /api/v1/plan-items/:id/mark-visit` | `markVisitSchema` |
| `app/visit/unplanned.tsx` | `TodayVisitsPage.tsx` — Unplanned dialog | `POST /api/v1/visits/unplanned` | `unplannedVisitSchema` |

**Submitted fields (planned):** `notes?`, `orderTaken`, `visitTime`,
`checkInTime`, `checkOutTime`, `location?`, `productsDiscussed[]`,
`primaryProductId?`, `samplesQty?`, `samplesGiven?`, `followUpDate?`,
`outOfOrderReason?` (required ≥3 chars when not next-in-sequence).

**Submitted fields (unplanned):** same as planned + `doctorId*` +
`unplannedReason ∈ {EMERGENCY, AVAILABLE_UNEXPECTEDLY, OTHER}`.

The "Wrap up" tab carries `orderTaken`, `followUpDate`, `unplannedReason`,
and the out-of-sequence reason field; mobile uses `TodayBundle.nextPlanItem`
to decide if the visit is out-of-sequence.

### Doctors

| Mobile | Web baseline | Backend endpoint | Validator |
|--|--|--|--|
| `app/doctor/new.tsx` | `DoctorListPage.tsx` create dialog | `POST /api/v1/doctors` | `createDoctorSchema` |
| `app/doctor/[id]/edit.tsx` | `DoctorListPage.tsx` edit dialog | `PUT /api/v1/doctors/:id` | `updateDoctorSchema` |
| `app/doctor/[id]/index.tsx` | `DoctorListPage.tsx` profile dialog | `GET /api/v1/doctors/:id` | — |

**Fields:** `name*`, `specialization`, `qualification`, `designation`,
`gender`, `mobileNo`, `phone`, `email`, `zone`, `doctorBrick`, `doctorCode`,
`frequency`, `grade`, `locationName`, `city`, `address`, `pmdcRegistration`,
`patientCount`. `isActive` toggle on edit.

Assignment fields (`territoryId`, `assignedRepId`, `monthlyVisitTarget`,
`tier`) live on the dedicated Assign flow (`PATCH /doctors/:id/assign`),
mirroring web.

### Pharmacy

| Mobile | Web baseline | Backend endpoint | Validator |
|--|--|--|--|
| `app/pharmacy/index.tsx` | `PharmacyListPage.tsx` list | `GET /api/v1/pharmacies` | — |
| `app/pharmacy/new.tsx` | `PharmacyListPage.tsx` create dialog | `POST /api/v1/pharmacies` | `createPharmacySchema` |
| `app/pharmacy/[id].tsx` | `PharmacyListPage.tsx` profile | `GET /api/v1/pharmacies/:id` | — |

**Fields:** `name*`, `address`, `city`, `state`, `phone`, `email`,
`discountOnTP` (0–100%), `bonusScheme.{buyQty,getQty}`.

### Expenses

| Mobile | Web baseline | Backend endpoint | Validator |
|--|--|--|--|
| `app/expenses/index.tsx` | `ExpenseListPage.tsx` | `GET /api/v1/expenses` | — |
| `app/expenses/new.tsx` | `ExpenseListPage.tsx` dialog | `POST /api/v1/expenses` | `createExpenseSchema` |

**Categories (canonical):** `DOCTOR_INVESTMENT`, `SALARY`, `RENT`, `LOGISTICS`,
`OFFICE`, `OTHER`. **No PENDING/APPROVED/REJECTED status exists** in the
backend — expenses are auto-marked `approvedBy = currentUser` on create. We
do not surface a phantom approval status anywhere on mobile.

### Collections

| Mobile | Web baseline | Backend endpoint | Validator |
|--|--|--|--|
| `app/pharmacy/[id].tsx` (Record Collection sheet) | `RecordPaymentPage.tsx` | `POST /api/v1/collections` | `createCollectionSchema` |

**Fields:** `pharmacyId*`, `collectorType ∈ {COMPANY, DISTRIBUTOR}*`,
`distributorId` (required when `collectorType === DISTRIBUTOR`), `amount*`,
`paymentMethod ∈ {CASH, CHEQUE, BANK_TRANSFER, UPI}*`, `referenceNumber?`,
`date?`, `notes?`.

Mobile only books `collectorType: 'COMPANY'` collections (rep collecting on
behalf of the company). Distributor settlements happen from the web admin
panel.

### Attendance

| Mobile | Web baseline | Backend endpoint | Validator |
|--|--|--|--|
| `src/features/attendance/CheckInCard.tsx` | `MyAttendanceView.tsx` | `GET /attendance/me/today`, `POST /attendance/checkin`, `POST /attendance/checkout` | `checkinBodySchema` |
| `app/(manager)/approvals.tsx` (Attendance tab) — governance branch | `views/attendance/governance/AttendanceGovernanceQueueView.tsx` | `GET /attendance/governance/request-queue` | `governanceQueueQuerySchema` |
| `app/(manager)/approvals.tsx` (Attendance tab) — inbox branch | `views/attendance/team/TeamAttendanceView.tsx` (inbox) | `GET /attendance/requests/inbox` | `inboxQuerySchema` |
| Approve / reject / escalate buttons | Same buttons in both web views | `POST /attendance/requests/:id/approve \| /reject \| /escalate` | `requestCommentSchema` |

**Field names match the backend exactly:** `checkInTime`, `checkOutTime`,
`status ∈ {PRESENT, ABSENT, HALF_DAY, LEAVE}`, plus the server-derived
`canCheckIn`, `canCheckOut`, `uiStatus`, `lateMinutes`,
`shiftCheckInClosedMessage`. Late check-in pending / rejected and shift-
closed states are surfaced in the UI.

**Manager Approvals — endpoint selection (matches web):**

The mobile Approvals screen mirrors web's
`getAttendancePermissionFlags(user, hasPermission)`:

- If the viewer has `admin.access` OR `attendance.governance.view` →
  hit the **governance queue** (`/attendance/governance/request-queue`),
  same as `AttendanceGovernanceQueueView`. This returns the full company-
  wide pool of pending requests with a `governance` envelope
  (`viewerCanAct`, `slaMinutesRemaining`, `isAdminQueue`,
  `currentStepDisplay`, `stepTotal`, `viewerReadOnlyReason`). The UI
  exposes the same "All open / Needs my action / Monitor only" scope
  filter and "Higher approval" escalation that the web does.
- Otherwise, plain approvers (`attendance.approve` /
  `attendance.approve.direct` / `attendance.approve.escalated`) hit the
  personal **inbox** (`/attendance/requests/inbox`).

The Approvals tab badge in `app/(manager)/_layout.tsx` polls the same
endpoint the screen will read, so the count cannot drift from the
visible list. Reject requires a ≥ 10-character note, matching
`REJECT_NOTE_MIN` in `AttendanceGovernanceQueueView`.

### Navigation & shell

| File | Behavior |
|--|--|
| `app/_layout.tsx` | Locks every tenant user to `/(tabs)` (field shell). `(manager)/*` routes are stack screens only (approvals, team attendance, team overview). Redirects `(manager)` root when opened without permission. |
| `app/(auth)/login.tsx` | Only sets the session; never calls `router.replace`. |
| `app/(tabs)/more.tsx` | Visible rows filtered by `hasAnyPermission(user, [...])` and frozen per `user._id`. Stable per session. |

### RBAC

| Concept | Mobile |
|--|--|
| Authoritative role code | `getRoleCode(user)` → `resolvedRole.code` → populated `roleId.code` |
| Permission check | `hasPermission(user, key)` mirrors web `useAuth().hasPermission` |
| Manager detection | `isManagerUser(user)` — same heuristic as web (`team.viewAllReports`, `weeklyPlans.review/approve`, or `DEFAULT_ADMIN/ASM/RM` role code) |
| `landingRouteForUser` | Always `'/(tabs)'` — field-first shell for every tenant user |
| Manager workflows | Stack routes under `(manager)/approvals`, `(manager)/attendance`, `(manager)/index` (team); opened from More when permitted — never the root tab tree |

**Permission resolution contract (line-for-line match with web's `useAuth().hasPermission`):**

```
mobile (src/auth/rbac.ts hasPermission)        web (contexts/AuthContext.tsx hasPermission)
-------------------------------------------    ------------------------------------------
1. if !user → false                            if !user → false
2. if user.role === 'SUPER_ADMIN' → true       if user.role === 'SUPER_ADMIN' → true
3. if user.role === 'ADMIN'       → true       if user.role === 'ADMIN'       → true
4. if 'admin.access' in perms     → true       if 'admin.access' in perms     → true
5. if resolvedRole.code === DEFAULT_ADMIN→true if resolvedRole.code === DEFAULT_ADMIN→true
6. otherwise → perms.includes(key)             otherwise → perms.includes(key)
```

The full payload (`user.permissions`, `resolvedRole`, `tenantCompanyFlags`, etc.)
is the SAME shape on both clients because both consume
`pharmaERPBackend/src/utils/authUserPayload.formatUserForClient` via the
`/auth/login`, `/auth/me`, and `/auth/switch-company` endpoints. The backend
resolves perms exactly once per request (`effectivePermissions.js`); mobile
never re-derives perms from role codes.

**Single source of truth for mobile gating:** `src/auth/mobilePermissionMap.ts`

  - `SCREEN_PERMISSIONS` — every gated route / tab. Drives `<PermissionGate>`
    and tab `href: null` visibility in `app/(tabs)/_layout.tsx` and
    `app/(manager)/_layout.tsx`.
  - `ACTION_PERMISSIONS` — every button / FAB / list-row action. Drives
    `usePermissions().canDo(key)`.
  - `usePermissions()` (`src/hooks/usePermissions.ts`) exposes `can`,
    `canAny`, `canAll`, `canDo`, `canSee`, and `meets`. All routes through
    the same `hasPermission` (admin auto-grant included).

**Tab visibility (driven by `SCREEN_PERMISSIONS`):**

| Tab | `ScreenKey` | Required (anyOf) |
|--|--|--|
| Rep `Home` | `rep_home` | `dashboard.view`, `attendance.view`, `attendance.mark` |
| Rep `Visits` | `rep_visits` | `weeklyPlans.markVisit`, `weeklyPlans.view` |
| Rep `Doctors` | `rep_doctors` | `doctors.view` |
| Rep `Orders` | `rep_orders` | `orders.view` |
| Rep `More` | `rep_more` | (always visible, rows gated individually) |
| Mgr `Team` | `manager_home` | `team.view`, `team.viewAllReports`, `admin.access` |
| Mgr `Attendance` | `manager_attendance` | `attendance.viewTeam/Company/Escalations/governance.view`, `admin.access` |
| Mgr `Approvals` | `manager_approvals` | `attendance.approve(*)`, `attendance.governance.view`, `weeklyPlans.review/approve`, `admin.access` |
| Mgr `More` | `manager_more` | (always visible) |

**Route guards:** every "new"/"edit" screen wraps its impl in
`<PermissionGate screen="...">`. Deep-linking to a screen the user can't access
renders a `403`-style denial inside the locked shell instead of navigating
away — same behavior as web's "Insufficient permissions" response surface.

**Drift defence:** `src/auth/__tests__/rbac.test.ts` pins:
  - The 6-rule decision table above.
  - Every key referenced by `ACTION_PERMISSIONS` and `SCREEN_PERMISSIONS`
    exists in the backend `pharmaERPBackend/src/constants/permissions.js`
    catalog (the snapshot in the test is the contract).

  Adding a new role on web requires NO mobile changes — the backend issues
  the new role's `permissions[]` on login, mobile reads them through the
  same `hasPermission` resolver, and every gate updates automatically.

## Validation rule (per module)

Before marking any module's parity work done, verify:

1. Can the **same record** be created on web and mobile with the same data?
2. Are **all fields** structurally identical (names, types, enums)?
3. Are **side effects** identical (ledger, KPI, weekly plan, audit)?

If any mismatch exists, fix before proceeding.

## Acceptance gate

The mobile build is only considered correct when:

- [x] Web and mobile produce identical backend data.
- [x] No missing fields compared to web.
- [x] No difference in business logic.
- [x] Role behavior matches web ERP exactly.
- [x] Navigation is stable and non-flickering.
- [x] Mobile is only UX optimized, not logically different.
