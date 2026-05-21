/**
 * Mobile RBAC helpers — mirrors web FE behavior (`useAuth().hasPermission` +
 * `verticalMenuData.tsx` permission gating). Backend source of truth lives in
 * `pharmaERPBackend/src/utils/effectivePermissions.js`.
 *
 * Rule: mobile NEVER invents permissions. We always check `user.permissions`
 * returned by `/auth/login` / `formatUserForClient`.
 */
import type { ResolvedRole, User } from '@/domain/types';

/** System-seeded role codes — keep in sync with `pharmaERPBackend/src/constants/rbac.js`. */
export const ROLE_CODES = {
  DEFAULT_ADMIN: 'DEFAULT_ADMIN',
  DEFAULT_ASM: 'DEFAULT_ASM',
  DEFAULT_RM: 'DEFAULT_RM',
  DEFAULT_MEDICAL_REP: 'DEFAULT_MEDICAL_REP',
} as const;

/** Legacy `User.role` enum — only relevant for SUPER_ADMIN / ADMIN fallbacks. */
export const LEGACY_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MEDICAL_REP: 'MEDICAL_REP',
} as const;

/** Returns the populated role document if `roleId` was populated by the server. */
function populatedRole(
  user: User | null | undefined
): { code?: string; permissions?: string[] } | null {
  if (!user) return null;
  const roleId = user.roleId;
  if (roleId && typeof roleId === 'object') return roleId;
  return null;
}

/**
 * Authoritative role code for the logged-in user.
 * Order of preference: `resolvedRole.code` → populated `roleId.code` → null.
 */
export function getRoleCode(user: User | null | undefined): string | null {
  if (!user) return null;
  if (user.resolvedRole && user.resolvedRole.code) return user.resolvedRole.code;
  const role = populatedRole(user);
  if (role && role.code) return role.code;
  return null;
}

export function getResolvedRole(user: User | null | undefined): ResolvedRole | null {
  return user?.resolvedRole ?? null;
}

/**
 * `hasPermission` mirrors the web `useAuth().hasPermission` semantics:
 *  - SUPER_ADMIN → all
 *  - Legacy ADMIN → all
 *  - `admin.access` permission → all
 *  - `resolvedRole.code === DEFAULT_ADMIN` → all
 *  - otherwise → permissions array membership.
 *
 * See `pharmaERPFE/src/hooks/useAuth.ts` for the web equivalent.
 */
export function hasPermission(user: User | null | undefined, key: string): boolean {
  if (!user) return false;
  if (user.role === LEGACY_ROLES.SUPER_ADMIN) return true;
  if (user.role === LEGACY_ROLES.ADMIN) return true;
  const perms = user.permissions ?? [];
  if (perms.includes('admin.access')) return true;
  if (getRoleCode(user) === ROLE_CODES.DEFAULT_ADMIN) return true;
  return perms.includes(key);
}

export function hasAnyPermission(user: User | null | undefined, keys: string[]): boolean {
  return keys.some((k) => hasPermission(user, k));
}

export function hasAllPermissions(user: User | null | undefined, keys: string[]): boolean {
  return keys.every((k) => hasPermission(user, k));
}

/**
 * Manager-capability hint for More-menu rows / badges — NOT for choosing a
 * separate navigation shell. See `navigation.ts` (`hasManagerCapabilities`).
 */
export { hasManagerCapabilities as isManagerUser, landingRouteForUser } from '@/auth/navigation';
