/**
 * Mobile permission map — single source of truth for every gated mobile
 * route and action. Keep this aligned with:
 *
 *  - Backend catalog: `pharmaERPBackend/src/constants/permissions.js`
 *  - Web menu:        `pharmaERPFE/src/data/navigation/verticalMenuData.tsx`
 *  - Web actions:     `useAuth().hasPermission(...)` inside each web view
 *
 * Rules (Web Parity Contract):
 *  1. NEVER invent permission keys here. Every key must exist in the
 *     backend `PERMISSIONS` catalog.
 *  2. NEVER gate by role name. Always gate by permission key. Admin auto-
 *     grant is handled inside `hasPermission`.
 *  3. Use `anyOf` when multiple keys satisfy the same UI (matches web's
 *     `hasPermission(a) || hasPermission(b)` patterns).
 *  4. Adding a new screen / action does NOT require code changes anywhere
 *     except (a) this map and (b) the screen that reads from it.
 */

/** Any-of permission spec — passes if the user has at least one of the keys. */
export interface PermissionRequirement {
  anyOf: string[];
}

/* ------------------------------------------------------------------ */
/* Screen permissions — applied to route guards (`<PermissionGate>`)  */
/* and to the tab-bar visibility logic.                                */
/* ------------------------------------------------------------------ */

export const SCREEN_PERMISSIONS = {
  /* Rep shell ----------------------------------------------------- */
  /**
   * Home / dashboard tab — check-in, daily summary, route widgets.
   * Web menu: `verticalMenuData` → `/home` requires `dashboard.view`.
   * Field users without dashboard still see Home when they can mark attendance.
   */
  rep_home: { anyOf: ['dashboard.view', 'attendance.view', 'attendance.mark'] },
  rep_visits: { anyOf: ['weeklyPlans.markVisit', 'weeklyPlans.view'] },
  rep_doctors: { anyOf: ['doctors.view'] },
  rep_orders: { anyOf: ['orders.view'] },
  /** "More" tab itself is always visible; rows are gated individually. */
  rep_more: null,

  /* Manager shell ------------------------------------------------- */
  manager_home: { anyOf: ['team.view', 'team.viewAllReports', 'admin.access'] },
  manager_attendance: {
    anyOf: [
      'attendance.viewTeam',
      'attendance.viewCompany',
      'attendance.viewEscalations',
      'attendance.governance.view',
      'admin.access',
    ],
  },
  manager_approvals: {
    anyOf: [
      'attendance.approve',
      'attendance.approve.direct',
      'attendance.approve.escalated',
      'attendance.governance.view',
      'weeklyPlans.review',
      'weeklyPlans.approve',
      'expenses.approve',
      'admin.access',
    ],
  },
  manager_live: {
    anyOf: ['team.view', 'team.viewAllReports', 'attendance.viewTeam', 'admin.access'],
  },
  manager_more: null,

  /* Detail / form screens ---------------------------------------- */
  order_new: { anyOf: ['orders.create'] },
  order_view: { anyOf: ['orders.view'] },
  doctor_new: { anyOf: ['doctors.create'] },
  doctor_edit: { anyOf: ['doctors.edit'] },
  doctor_view: { anyOf: ['doctors.view'] },
  pharmacy_new: { anyOf: ['pharmacies.create'] },
  pharmacy_view: { anyOf: ['pharmacies.view'] },
  expense_new: { anyOf: ['expenses.create'] },
  expense_view: { anyOf: ['expenses.view', 'expenses.create'] },
  visit_unplanned: { anyOf: ['weeklyPlans.markVisit'] },
  visit_active: { anyOf: ['weeklyPlans.markVisit'] },
  weekly_plan: { anyOf: ['weeklyPlans.view', 'weeklyPlans.edit', 'weeklyPlans.create'] },
  weekly_plan_detail: { anyOf: ['weeklyPlans.view'] },
  weekly_plan_new: { anyOf: ['weeklyPlans.create'] },
  /** Web parity: `MrepCommandCenterPage` + `/targets` for managers. */
  kpi: {
    anyOf: [
      'targets.view',
      'team.viewAllReports',
      'weeklyPlans.view',
      'weeklyPlans.markVisit',
    ],
  },
} satisfies Record<string, PermissionRequirement | null>;

export type ScreenKey = keyof typeof SCREEN_PERMISSIONS;

/* ------------------------------------------------------------------ */
/* Action permissions — applied to buttons / FABs / list-row actions. */
/* ------------------------------------------------------------------ */

export const ACTION_PERMISSIONS = {
  order_create: { anyOf: ['orders.create'] },
  order_edit: { anyOf: ['orders.edit'] },
  doctor_create: { anyOf: ['doctors.create'] },
  doctor_edit: { anyOf: ['doctors.edit'] },
  doctor_delete: { anyOf: ['doctors.delete'] },
  doctor_assign: { anyOf: ['doctors.assign'] },
  pharmacy_create: { anyOf: ['pharmacies.create'] },
  pharmacy_edit: { anyOf: ['pharmacies.edit'] },
  expense_create: { anyOf: ['expenses.create'] },
  expense_edit: { anyOf: ['expenses.edit'] },
  expense_delete: { anyOf: ['expenses.delete'] },
  expense_approve: { anyOf: ['expenses.approve', 'admin.access'] },
  /** Mobile rep collections — backend uses `payments.create`. */
  collection_create: { anyOf: ['payments.create'] },
  visit_start_planned: { anyOf: ['weeklyPlans.markVisit'] },
  visit_start_unplanned: { anyOf: ['weeklyPlans.markVisit'] },
  weekly_plan_create: { anyOf: ['weeklyPlans.create', 'weeklyPlans.edit'] },
  weekly_plan_review: { anyOf: ['weeklyPlans.review', 'weeklyPlans.approve'] },
  attendance_approve: {
    anyOf: [
      'attendance.approve',
      'attendance.approve.direct',
      'attendance.approve.escalated',
      'attendance.governance.view',
      'admin.access',
    ],
  },
} satisfies Record<string, PermissionRequirement>;

export type ActionKey = keyof typeof ACTION_PERMISSIONS;
