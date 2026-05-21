/**
 * RBAC parity tests — pin the mobile `hasPermission` behavior to web's
 * `useAuth().hasPermission` (see `pharmaERPFE/src/contexts/AuthContext.tsx`).
 *
 * Any change to mobile's admin auto-grant / role-code semantics that breaks
 * these tests is a Web Parity Contract violation by definition.
 */
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoleCode,
  isManagerUser,
} from '@/auth/rbac';
import {
  canSeeScreen,
  landingRouteForUser,
  FIELD_SHELL,
} from '@/auth/navigation';
import { ACTION_PERMISSIONS, SCREEN_PERMISSIONS } from '@/auth/mobilePermissionMap';
import type { User } from '@/domain/types';

const makeUser = (overrides: Partial<User>): User =>
  ({
    _id: 'u1',
    name: 'Test',
    email: 't@example.com',
    role: 'MEDICAL_REP',
    permissions: [],
    companyId: 'c1',
    ...overrides,
  }) as User;

describe('rbac.hasPermission — web parity', () => {
  test('null user → false', () => {
    expect(hasPermission(null, 'orders.create')).toBe(false);
  });

  test('SUPER_ADMIN → always true', () => {
    const u = makeUser({ role: 'SUPER_ADMIN' });
    expect(hasPermission(u, 'orders.create')).toBe(true);
    expect(hasPermission(u, 'nonexistent.key')).toBe(true);
  });

  test('legacy ADMIN role → always true', () => {
    const u = makeUser({ role: 'ADMIN' });
    expect(hasPermission(u, 'orders.create')).toBe(true);
    expect(hasPermission(u, 'attendance.governance.view')).toBe(true);
  });

  test('admin.access in permissions → always true', () => {
    const u = makeUser({ permissions: ['admin.access'] });
    expect(hasPermission(u, 'orders.create')).toBe(true);
    expect(hasPermission(u, 'attendance.governance.view')).toBe(true);
  });

  test('resolvedRole.code === DEFAULT_ADMIN → always true', () => {
    const u = makeUser({
      permissions: [],
      resolvedRole: { code: 'DEFAULT_ADMIN', isSystem: true, name: 'Administrator' },
    });
    expect(hasPermission(u, 'orders.create')).toBe(true);
  });

  test('exact permission match', () => {
    const u = makeUser({ permissions: ['orders.view', 'orders.create'] });
    expect(hasPermission(u, 'orders.create')).toBe(true);
    expect(hasPermission(u, 'orders.delete')).toBe(false);
  });

  test('no admin grant by role name alone (parity with web)', () => {
    /** Web does NOT grant admin-level access by role-code === ASM/RM. */
    const u = makeUser({
      permissions: ['team.view'],
      resolvedRole: { code: 'DEFAULT_ASM', isSystem: true, name: 'ASM' },
    });
    expect(hasPermission(u, 'orders.create')).toBe(false);
    expect(hasPermission(u, 'team.view')).toBe(true);
  });
});

describe('rbac.isManagerUser', () => {
  test('admin role code', () => {
    expect(
      isManagerUser(
        makeUser({ resolvedRole: { code: 'DEFAULT_ADMIN', isSystem: true, name: 'Admin' } })
      )
    ).toBe(true);
  });
  test('ASM role code', () => {
    expect(
      isManagerUser(
        makeUser({ resolvedRole: { code: 'DEFAULT_ASM', isSystem: true, name: 'ASM' } })
      )
    ).toBe(true);
  });
  test('plain rep with no manager perms', () => {
    expect(isManagerUser(makeUser({ permissions: ['orders.create'] }))).toBe(false);
  });
  test('rep granted weeklyPlans.review acts as manager', () => {
    expect(isManagerUser(makeUser({ permissions: ['weeklyPlans.review'] }))).toBe(true);
  });
  test('team.view alone does not imply manager shell (field-first)', () => {
    expect(isManagerUser(makeUser({ permissions: ['team.view'] }))).toBe(true);
    expect(landingRouteForUser(makeUser({ permissions: ['team.view'] }))).toBe(FIELD_SHELL);
  });
});

describe('navigation.field shell', () => {
  const mrepPerms = [
    'dashboard.view',
    'attendance.view',
    'attendance.mark',
    'orders.view',
    'orders.create',
    'doctors.view',
    'doctors.create',
    'weeklyPlans.view',
    'weeklyPlans.markVisit',
    'targets.view',
    'pharmacies.view',
  ];

  test('medical rep lands on field shell', () => {
    const u = makeUser({
      permissions: mrepPerms,
      resolvedRole: { code: 'DEFAULT_MEDICAL_REP', isSystem: true, name: 'Medical Representative' },
    });
    expect(landingRouteForUser(u)).toBe(FIELD_SHELL);
  });

  test('medical rep sees Home tab (dashboard.view)', () => {
    const u = makeUser({ permissions: mrepPerms });
    expect(canSeeScreen(u, 'rep_home')).toBe(true);
    expect(canSeeScreen(u, 'rep_visits')).toBe(true);
    expect(canSeeScreen(u, 'rep_doctors')).toBe(true);
    expect(canSeeScreen(u, 'rep_orders')).toBe(true);
    expect(canSeeScreen(u, 'manager_approvals')).toBe(false);
  });
});

describe('rbac helpers', () => {
  test('hasAnyPermission', () => {
    const u = makeUser({ permissions: ['orders.view'] });
    expect(hasAnyPermission(u, ['orders.view', 'doctors.view'])).toBe(true);
    expect(hasAnyPermission(u, ['products.view', 'doctors.view'])).toBe(false);
  });
  test('hasAllPermissions', () => {
    const u = makeUser({ permissions: ['orders.view', 'orders.create'] });
    expect(hasAllPermissions(u, ['orders.view', 'orders.create'])).toBe(true);
    expect(hasAllPermissions(u, ['orders.view', 'orders.delete'])).toBe(false);
  });
  test('getRoleCode prefers resolvedRole over populated roleId', () => {
    const u = makeUser({
      resolvedRole: { code: 'DEFAULT_ASM', isSystem: true, name: 'ASM' },
      roleId: { _id: 'r1', code: 'CUSTOM_OTHER', name: 'Other', permissions: [] } as never,
    });
    expect(getRoleCode(u)).toBe('DEFAULT_ASM');
  });
});

describe('mobilePermissionMap — catalog hygiene', () => {
  /**
   * Backend catalog snapshot — keep aligned with
   * `pharmaERPBackend/src/constants/permissions.js`.
   * Any new permission key referenced by mobile must exist here OR be a
   * known platform / admin grant. Drift in either direction is a bug.
   */
  const BACKEND_CATALOG = new Set([
    'admin.access',
    'roles.manage',
    'dashboard.view',
    'products.view',
    'products.create',
    'products.edit',
    'products.delete',
    'products.viewCostPrice',
    'distributors.view',
    'distributors.create',
    'distributors.edit',
    'distributors.delete',
    'inventory.view',
    'inventory.transfer',
    'pharmacies.view',
    'pharmacies.create',
    'pharmacies.edit',
    'pharmacies.delete',
    'doctors.view',
    'doctors.create',
    'doctors.edit',
    'doctors.delete',
    'doctors.assign',
    'orders.view',
    'orders.create',
    'orders.edit',
    'orders.deliver',
    'orders.return',
    'payments.view',
    'payments.create',
    'ledger.view',
    'targets.view',
    'targets.create',
    'targets.edit',
    'weeklyPlans.view',
    'weeklyPlans.create',
    'weeklyPlans.edit',
    'weeklyPlans.markVisit',
    'weeklyPlans.review',
    'weeklyPlans.approve',
    'expenses.view',
    'expenses.create',
    'expenses.edit',
    'expenses.delete',
    'payroll.view',
    'payroll.create',
    'payroll.edit',
    'payroll.pay',
    'attendance.view',
    'attendance.mark',
    'attendance.viewTeam',
    'attendance.viewCompany',
    'attendance.request.create',
    'attendance.approve',
    'attendance.approve.direct',
    'attendance.approve.escalated',
    'attendance.viewEscalations',
    'attendance.override',
    'attendance.matrix.manage',
    'attendance.governance.view',
    'reports.view',
    'suppliers.view',
    'suppliers.manage',
    'procurement.view',
    'procurement.create',
    'procurement.approve',
    'procurement.receive',
    'procurement.invoicePost',
    'procurement.return',
    'procurement.grnReverse',
    'procurement.cancelPo',
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'team.view',
    'team.manage',
    'team.viewAllReports',
    'territories.view',
    'territories.manage',
    'onboarding.view',
    'onboarding.manage',
    'onboarding.import',
    'onboarding.approveGoLive',
    'onboarding.rollback',
    'platform.dashboard.view',
    'platform.companies.manage',
  ]);

  test('every ACTION_PERMISSIONS key exists in backend catalog', () => {
    const offenders: string[] = [];
    for (const [name, req] of Object.entries(ACTION_PERMISSIONS)) {
      for (const k of req.anyOf) {
        if (!BACKEND_CATALOG.has(k)) offenders.push(`${name}: ${k}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('every SCREEN_PERMISSIONS key exists in backend catalog', () => {
    const offenders: string[] = [];
    for (const [name, req] of Object.entries(SCREEN_PERMISSIONS)) {
      if (!req) continue;
      for (const k of req.anyOf) {
        if (!BACKEND_CATALOG.has(k)) offenders.push(`${name}: ${k}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
