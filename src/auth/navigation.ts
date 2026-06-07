/**
 * Mobile navigation resolution — field-first shell with manager modules as
 * stack screens (not a separate tab tree).
 *
 * Web does not split "rep vs manager" navigators; it uses one menu filtered
 * by permissions. Mobile mirrors that: every tenant user lands in `(tabs)` and
 * manager workflows (approvals, team attendance) are reached from More or deep
 * links when the user has the matching permission keys.
 */
import type { User } from '@/domain/types';
import { getRoleCode, hasAnyPermission, ROLE_CODES, LEGACY_ROLES } from '@/auth/rbac';
import {
  ACTION_PERMISSIONS,
  SCREEN_PERMISSIONS,
  type ActionKey,
  type PermissionRequirement,
  type ScreenKey,
} from '@/auth/mobilePermissionMap';

/** Primary authenticated shell — always the field tab bar. */
export const FIELD_SHELL = '/(tabs)' as const;

/** Legacy manager group — stack-only routes, never the locked home shell. */
export const MANAGER_GROUP = '(manager)' as const;

/** Leaf routes inside `(manager)` that may be opened from the field shell. */
export const MANAGER_STACK_LEAVES = new Set(['approvals', 'attendance', 'live', 'index']);

const APPROVAL_PERMISSIONS = SCREEN_PERMISSIONS.manager_approvals!.anyOf;
const TEAM_PERMISSIONS = SCREEN_PERMISSIONS.manager_home!.anyOf;
const TEAM_ATTENDANCE_PERMISSIONS = SCREEN_PERMISSIONS.manager_attendance!.anyOf;

export function meetsRequirement(
  user: User | null | undefined,
  requirement: PermissionRequirement | null | undefined
): boolean {
  if (!requirement) return true;
  return hasAnyPermission(user, requirement.anyOf);
}

export function canSeeScreen(user: User | null | undefined, screen: ScreenKey): boolean {
  return meetsRequirement(user, SCREEN_PERMISSIONS[screen]);
}

export function canDoAction(user: User | null | undefined, action: ActionKey): boolean {
  return meetsRequirement(user, ACTION_PERMISSIONS[action]);
}

/**
 * Whether this user should see manager-oriented entries (Approvals, Team, etc.).
 * Does NOT switch the primary shell — only drives More rows and stack routes.
 */
export function hasManagerCapabilities(user: User | null | undefined): boolean {
  if (!user) return false;
  const code = getRoleCode(user);
  if (
    code === ROLE_CODES.DEFAULT_ADMIN ||
    code === ROLE_CODES.DEFAULT_ASM ||
    code === ROLE_CODES.DEFAULT_RM
  ) {
    return true;
  }
  if (user.role === LEGACY_ROLES.ADMIN || user.role === LEGACY_ROLES.SUPER_ADMIN) {
    return true;
  }
  return (
    hasAnyPermission(user, APPROVAL_PERMISSIONS) ||
    hasAnyPermission(user, TEAM_PERMISSIONS) ||
    hasAnyPermission(user, TEAM_ATTENDANCE_PERMISSIONS)
  );
}

/**
 * @deprecated Use `hasManagerCapabilities` for UI; shell is always `FIELD_SHELL`.
 * Kept for tests and gradual migration — no longer includes `team.view` alone
 * (that permission can appear on customized rep roles and must not force the
 * manager shell).
 */
export function isManagerUser(user: User | null | undefined): boolean {
  return hasManagerCapabilities(user);
}

/** Post-auth landing route — field shell for all tenant users. */
export function landingRouteForUser(_user: User | null | undefined): typeof FIELD_SHELL {
  return FIELD_SHELL;
}

export function canOpenManagerLeaf(
  user: User | null | undefined,
  leaf: string | undefined
): boolean {
  if (!leaf || !MANAGER_STACK_LEAVES.has(leaf)) return false;
  if (leaf === 'approvals') return canSeeScreen(user, 'manager_approvals');
  if (leaf === 'attendance') return canSeeScreen(user, 'manager_attendance');
  if (leaf === 'live') return canSeeScreen(user, 'manager_live');
  /** `(manager)/index` — team overview dashboard. */
  if (leaf === 'index') return canSeeScreen(user, 'manager_home');
  return false;
}
