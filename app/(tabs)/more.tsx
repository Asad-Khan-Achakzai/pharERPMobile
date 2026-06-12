/**
 * More tab (rep shell) — Web Parity Contract §4
 *
 *  The list of entries is fully derived from `user.permissions` at first
 *  render and frozen for the rest of the session via `useMemo([user._id])`.
 *  Behavior:
 *   - We never hide a row mid-session because of partial auth state.
 *   - We never show a row the user lacks permission for.
 *   - When permissions change (logout → login as a different user), the
 *     identity key changes and the list rebuilds.
 */
import * as React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  BellRing,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  CloudUpload,
  KeyRound,
  LogOut,
  Receipt,
  Smartphone,
  Target,
  Users,
  MapPin,
  Moon,
  Sun,
  Monitor,
  Wallet,
  Landmark,
  BookOpen,
  Truck,
} from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { ListRow, Divider } from '@/ui/ListRow';
import { Text, H2 } from '@/ui/Text';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { useAuthStore } from '@/state/authStore';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { authApi } from '@/api/auth';
import { OutboxFooter } from '@/features/sync/OutboxFooter';
import { hasAnyPermission, hasPermission } from '@/auth/rbac';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import type { User } from '@/domain/types';

interface MoreEntry {
  key: string;
  title: string;
  icon: React.ReactNode;
  route: string;
  /** Permission(s) gating the row; `undefined` means always visible. */
  permissionAny?: string[];
}

/**
 * Permission keys here MUST exist in the backend catalog
 * (`pharmaERPBackend/src/constants/permissions.js`). Mobile-specific keys
 * are forbidden — the web menu reads from the same catalog.
 */
const ENTRIES_PRIMARY: MoreEntry[] = [
  {
    key: 'kpi',
    title: 'My targets & KPI',
    icon: <Target size={18} color="#0f172a" />,
    route: '/kpi',
    /** Web `verticalMenuData`: `targets.view` for `/targets`. */
    permissionAny: ['targets.view', 'team.viewAllReports'],
  },
  {
    key: 'expenses',
    title: 'Expenses',
    icon: <Receipt size={18} color="#0f172a" />,
    route: '/expenses',
    permissionAny: ['expenses.view', 'expenses.create'],
  },
  {
    key: 'collections',
    title: 'Collections',
    icon: <Wallet size={18} color="#0f172a" />,
    route: '/pharmacy',
    /** Web pairs `payments.view` (list) + `payments.create` (record). */
    permissionAny: ['payments.view', 'payments.create'],
  },
  {
    key: 'weekly',
    title: 'Weekly plan',
    icon: <Briefcase size={18} color="#0f172a" />,
    route: '/plan/weekly',
    permissionAny: ['weeklyPlans.view', 'weeklyPlans.edit'],
  },
];

/** Finance & accounting — mirrors web `verticalMenuData` Finance group (admin / accountant). */
const ENTRIES_FINANCE: MoreEntry[] = [
  {
    key: 'finance-expenses',
    title: 'Expenses',
    icon: <Receipt size={18} color="#0f172a" />,
    route: '/expenses',
    permissionAny: ['expenses.view', 'expenses.create'],
  },
  {
    key: 'finance-collections',
    title: 'Payments & collections',
    icon: <Wallet size={18} color="#0f172a" />,
    route: '/pharmacy',
    permissionAny: ['payments.view', 'payments.create', 'pharmacies.view'],
  },
  {
    key: 'customer-balances',
    title: 'Customer balances',
    icon: <Landmark size={18} color="#0f172a" />,
    route: '/finance/customer-balances',
    permissionAny: ['ledger.view', 'admin.access'],
  },
  {
    key: 'general-ledger',
    title: 'General ledger',
    icon: <BookOpen size={18} color="#0f172a" />,
    route: '/finance/general-ledger',
    permissionAny: ['reports.accounting', 'admin.access'],
  },
  {
    key: 'supplier-ledger',
    title: 'Supplier ledger',
    icon: <Truck size={18} color="#0f172a" />,
    route: '/finance/supplier-ledger',
    permissionAny: ['ledger.view', 'admin.access'],
  },
];

/** Keys moved under Finance when the user has accountant/admin finance access. */
const FINANCE_PRIMARY_KEYS = new Set(['expenses', 'collections']);

const FINANCE_SECTION_PERMISSIONS = [
  'ledger.view',
  'reports.view',
  'reports.accounting',
  'accounts.view',
  'vouchers.view',
  'admin.access',
] as const;

/**
 * Manager workflows — shown only when the user has approval / team permissions.
 * These are NOT primary tabs; they open stack screens under `(manager)/*`.
 */
const ENTRIES_MANAGER: MoreEntry[] = [
  {
    key: 'approvals',
    title: 'Approvals',
    icon: <ClipboardList size={18} color="#0f172a" />,
    route: '/(manager)/approvals',
    permissionAny: [
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
  {
    key: 'live',
    title: 'Live tracking',
    icon: <MapPin size={18} color="#0f172a" />,
    route: '/(manager)/live',
    permissionAny: ['team.view', 'team.viewAllReports', 'attendance.viewTeam', 'admin.access'],
  },
  {
    key: 'team',
    title: 'Team overview',
    icon: <Users size={18} color="#0f172a" />,
    route: '/(manager)',
    permissionAny: ['team.view', 'team.viewAllReports', 'admin.access'],
  },
  {
    key: 'team-attendance',
    title: 'Team attendance',
    icon: <ClipboardCheck size={18} color="#0f172a" />,
    route: '/(manager)/attendance',
    permissionAny: [
      'attendance.viewTeam',
      'attendance.viewCompany',
      'attendance.viewEscalations',
      'attendance.governance.view',
      'admin.access',
    ],
  },
];

/**
 * App-level utilities — always available to any authenticated user.
 */
const ENTRIES_UTILS: MoreEntry[] = [
  {
    key: 'notifications',
    title: 'Notifications',
    icon: <BellRing size={18} color="#0f172a" />,
    route: '/notifications',
  },
  {
    key: 'outbox',
    title: 'Outbox & sync',
    icon: <CloudUpload size={18} color="#0f172a" />,
    route: '/outbox',
  },
  {
    key: 'devices',
    title: 'Devices',
    icon: <Smartphone size={18} color="#0f172a" />,
    route: '/devices',
  },
  {
    key: 'change-password',
    title: 'Change password',
    icon: <KeyRound size={18} color="#0f172a" />,
    route: '/change-password',
  },
];

function filterEntries(user: User | null | undefined, entries: MoreEntry[]) {
  return entries.filter((e) => {
    if (!e.permissionAny) return true;
    return hasAnyPermission(user, e.permissionAny);
  });
}

export default function MoreScreen() {
  const router = useRouter();
  const pushWithReturn = usePushWithReturn();
  const { user, company, signOut } = useAuthStore();
  const { preference, setPreference, colors } = useTheme();

  const themeOptions: { key: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { key: 'system', label: 'System', icon: <Monitor size={16} color={colors.mutedForeground} /> },
    { key: 'light', label: 'Light', icon: <Sun size={16} color={colors.mutedForeground} /> },
    { key: 'dark', label: 'Dark', icon: <Moon size={16} color={colors.mutedForeground} /> },
  ];

  function onThemeSelect(next: ThemePreference) {
    if (next === preference) return;
    void Haptics.selectionAsync();
    setPreference(next);
  }

  /**
   * Lock the menu shape per session identity. The dependency is `user?._id`
   * so a re-fetched permissions array on the same user does NOT cause the
   * tab list to mutate mid-session.
   */
  const primary = React.useMemo(() => {
    const financeCapable = hasAnyPermission(user, [...FINANCE_SECTION_PERMISSIONS]);
    const finance = filterEntries(user, ENTRIES_FINANCE);
    const base = filterEntries(user, ENTRIES_PRIMARY);
    if (!financeCapable || finance.length === 0) return base;
    return base.filter((e) => !FINANCE_PRIMARY_KEYS.has(e.key));
  }, [user?._id]);
  const finance = React.useMemo(
    () => {
      if (!hasAnyPermission(user, [...FINANCE_SECTION_PERMISSIONS])) return [];
      return filterEntries(user, ENTRIES_FINANCE);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?._id]
  );
  const manager = React.useMemo(
    () => filterEntries(user, ENTRIES_MANAGER),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?._id]
  );
  const utils = React.useMemo(
    () => filterEntries(user, ENTRIES_UTILS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?._id]
  );

  async function onLogout() {
    try {
      await authApi.logout();
    } catch {
      /* ignore - we revoke locally anyway */
    }
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <Screen padded={false}>
      <Header title="More" />
      <Card className="mx-4 mt-2">
        <View className="flex-row items-center">
          <Avatar name={user?.name} size="lg" />
          <View className="ml-3 flex-1">
            <H2 numberOfLines={1}>{user?.name ?? '—'}</H2>
            <Text size="xs" tone="muted" numberOfLines={1}>
              {user?.email}
            </Text>
            <Text size="xs" tone="muted" numberOfLines={1}>
              {company?.name}
            </Text>
          </View>
        </View>
      </Card>

      <OutboxFooter />

      {primary.length > 0 ? (
        <Card className="mx-4 mt-2" padded={false}>
          <View className="px-3">
            {primary.map((e, i) => (
              <React.Fragment key={e.key}>
                <ListRow left={e.icon} title={e.title} chevron onPress={() => pushWithReturn(e.route)} />
                {i < primary.length - 1 ? <Divider /> : null}
              </React.Fragment>
            ))}
          </View>
        </Card>
      ) : null}

      {finance.length > 0 ? (
        <Card className="mx-4 mt-2" padded={false}>
          <View className="px-3 py-2">
            <Text size="xs" tone="muted" weight="medium">
              Finance
            </Text>
          </View>
          <Divider />
          <View className="px-3">
            {finance.map((e, i) => (
              <React.Fragment key={e.key}>
                <ListRow left={e.icon} title={e.title} chevron onPress={() => pushWithReturn(e.route)} />
                {i < finance.length - 1 ? <Divider /> : null}
              </React.Fragment>
            ))}
          </View>
        </Card>
      ) : null}

      {manager.length > 0 ? (
        <Card className="mx-4 mt-2" padded={false}>
          <View className="px-3 py-2">
            <Text size="xs" tone="muted" weight="medium">
              Manager
            </Text>
          </View>
          <Divider />
          <View className="px-3">
            {manager.map((e, i) => (
              <React.Fragment key={e.key}>
                <ListRow left={e.icon} title={e.title} chevron onPress={() => pushWithReturn(e.route)} />
                {i < manager.length - 1 ? <Divider /> : null}
              </React.Fragment>
            ))}
          </View>
        </Card>
      ) : null}

      <Card className="mx-4 mt-2" padded={false}>
        <View className="px-3">
          {utils.map((e, i) => (
            <React.Fragment key={e.key}>
              <ListRow left={e.icon} title={e.title} chevron onPress={() => pushWithReturn(e.route)} />
              {i < utils.length - 1 ? <Divider /> : null}
            </React.Fragment>
          ))}
        </View>
      </Card>

      <Card className="mx-4 mt-2" padded={false}>
        <View className="px-3 py-2">
          <Text size="xs" tone="muted" weight="medium">
            Appearance
          </Text>
        </View>
        <Divider />
        <View className="px-3 py-3 flex-row gap-2">
          {themeOptions.map((opt) => {
            const selected = preference === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onThemeSelect(opt.key)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.muted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 8,
                  paddingVertical: 10,
                }}
              >
                <View className="flex-row items-center">
                  {opt.icon}
                  <Text
                    size="sm"
                    weight={selected ? 'semibold' : 'medium'}
                    style={{ marginLeft: 6, color: selected ? colors.primaryForeground : colors.foreground }}
                  >
                    {opt.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View className="px-4 mt-3 mb-8">
        <Button variant="outline" onPress={onLogout} leftIcon={<LogOut size={18} color="#0f172a" />}>
          Sign out
        </Button>
      </View>
    </Screen>
  );
}

// Re-export the gate helper so any module diff tooling can confirm it's used.
export { hasPermission };
