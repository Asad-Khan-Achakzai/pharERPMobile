/**
 * `<PermissionGate>` — wrap a screen or section to require a screen-level
 * permission (or an ad-hoc `anyOf` set). When the requirement isn't met
 * we render a friendly "access denied" panel that matches the web's
 * `403 / Insufficient permissions` UX.
 *
 * Web Parity Contract:
 *   - We do NOT navigate the user away on a permission miss; we render
 *     the same shell with a denial message, so deep-linking to a screen
 *     they can't access produces a stable, predictable UI.
 *   - The check uses `hasPermission` semantics (admin auto-grant
 *     included).
 */
import * as React from 'react';
import { ShieldOff } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { EmptyState } from '@/ui/EmptyState';
import { usePermissions } from '@/hooks/usePermissions';
import {
  SCREEN_PERMISSIONS,
  type PermissionRequirement,
  type ScreenKey,
} from '@/auth/mobilePermissionMap';

interface BaseProps {
  /** Rendered when the user satisfies the requirement. */
  children: React.ReactNode;
  /** Optional custom fallback. Defaults to a shell-style denial screen. */
  fallback?: React.ReactNode;
  /** Optional title on the default denial header. */
  title?: string;
  /** Optional back chevron on the default denial header. Defaults `true`. */
  back?: boolean;
}

type GateProps =
  | (BaseProps & { screen: ScreenKey; requirement?: never; anyOf?: never })
  | (BaseProps & { requirement: PermissionRequirement; screen?: never; anyOf?: never })
  | (BaseProps & { anyOf: string[]; screen?: never; requirement?: never });

export const PermissionGate: React.FC<GateProps> = (props) => {
  const { meets, canSee } = usePermissions();

  let allowed: boolean;
  if ('screen' in props && props.screen) {
    allowed = canSee(props.screen);
  } else if ('requirement' in props && props.requirement) {
    allowed = meets(props.requirement);
  } else if ('anyOf' in props && props.anyOf) {
    allowed = meets({ anyOf: props.anyOf });
  } else {
    /** No constraint provided — pass through. */
    allowed = true;
  }

  if (allowed) return <>{props.children}</>;

  if (props.fallback !== undefined) return <>{props.fallback}</>;

  /** Resolve a friendly screen label for the denial message when possible. */
  const screenLabel =
    'screen' in props && props.screen
      ? SCREEN_PERMISSIONS[props.screen]?.anyOf?.[0] ?? null
      : null;

  return (
    <Screen padded={false} scroll={false}>
      <Header back={props.back ?? true} title={props.title ?? 'Access denied'} />
      <EmptyState
        icon={<ShieldOff size={28} color="#94a3b8" />}
        title="You don't have access"
        description={
          screenLabel
            ? `This screen requires the “${screenLabel}” permission. Ask your administrator to update your role.`
            : 'Your role does not permit this screen. Ask your administrator to update your permissions.'
        }
      />
    </Screen>
  );
};
