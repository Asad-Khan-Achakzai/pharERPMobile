import { useAuthStore } from '@/state/authStore';
import {
  getResolvedRole,
  getRoleCode,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isManagerUser,
} from '@/auth/rbac';
import {
  ACTION_PERMISSIONS,
  SCREEN_PERMISSIONS,
  type ActionKey,
  type PermissionRequirement,
  type ScreenKey,
} from '@/auth/mobilePermissionMap';

/**
 * Mobile equivalent of web's `useAuth().hasPermission`. Permission decisions
 * are made entirely against the server-issued `permissions` array; we never
 * derive permissions from role codes on the client.
 *
 * In addition to the raw `can` / `canAny` / `canAll` predicates, this hook
 * also exposes:
 *   - `canDo(action)`     — gate an action button by `ActionKey`
 *   - `canSee(screen)`    — gate a route or tab by `ScreenKey`
 *   - `meets(requirement)`— gate by ad-hoc `PermissionRequirement` (e.g. for
 *                          per-row inline gates that don't deserve a map
 *                          entry yet).
 *
 * All three resolve through the same `hasPermission` semantics, so the
 * admin auto-grant (SUPER_ADMIN / ADMIN / `admin.access` / DEFAULT_ADMIN
 * role code) applies uniformly.
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const meets = (requirement: PermissionRequirement | null | undefined): boolean => {
    if (!requirement) return true;
    return hasAnyPermission(user, requirement.anyOf);
  };

  return {
    user,
    roleCode: getRoleCode(user),
    resolvedRole: getResolvedRole(user),
    isManager: isManagerUser(user),
    can: (key: string) => hasPermission(user, key),
    canAny: (keys: string[]) => hasAnyPermission(user, keys),
    canAll: (keys: string[]) => hasAllPermissions(user, keys),
    canDo: (action: ActionKey) => meets(ACTION_PERMISSIONS[action]),
    canSee: (screen: ScreenKey) => meets(SCREEN_PERMISSIONS[screen]),
    meets,
  };
}
