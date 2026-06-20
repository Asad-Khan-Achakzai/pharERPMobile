/**
 * Manager More tab — Web Parity Contract §4
 *
 * Mirrors the rep More tab pattern: all entries are derived from
 * `user.permissions` and frozen for the session via `useMemo([user._id])`.
 * Permission keys must exist in the backend catalog
 * (`pharmaERPBackend/src/constants/permissions.js`).
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BellRing,
  Briefcase,
  CloudUpload,
  KeyRound,
  LogOut,
  Receipt,
  Smartphone,
  Target,
  Users as UsersIcon,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { ListRow, Divider } from '@/ui/ListRow';
import { Text, H2 } from '@/ui/Text';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { useAuthStore } from '@/state/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { authApi } from '@/api/auth';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { hasAnyPermission } from '@/auth/rbac';
import type { User } from '@/domain/types';

interface MoreEntry {
  key: string;
  title: string;
  Icon: LucideIcon;
  route: string;
  /** Permission(s) gating the row; `undefined` means always visible. */
  permissionAny?: string[];
}

const ENTRIES_PRIMARY: MoreEntry[] = [
  {
    key: 'weekly',
    title: 'Weekly plans',
    Icon: Briefcase,
    route: '/plan/weekly',
    permissionAny: ['weeklyPlans.view', 'weeklyPlans.review', 'weeklyPlans.approve'],
  },
  {
    key: 'kpi',
    title: 'Targets & KPI',
    Icon: Target,
    route: '/kpi',
    permissionAny: [
      'targets.view',
      'team.viewAllReports',
      'weeklyPlans.view',
      'weeklyPlans.markVisit',
    ],
  },
  {
    key: 'expenses',
    title: 'Expenses',
    Icon: Receipt,
    route: '/expenses',
    permissionAny: ['expenses.view'],
  },
  {
    key: 'collections',
    title: 'Pharmacies & collections',
    Icon: Wallet,
    route: '/payments',
    permissionAny: ['payments.view', 'pharmacies.view'],
  },
  {
    key: 'team',
    title: 'My team',
    Icon: UsersIcon,
    route: '/(manager)',
    permissionAny: ['team.view', 'team.viewAllReports'],
  },
];

const ENTRIES_UTILS: MoreEntry[] = [
  {
    key: 'notifications',
    title: 'Notifications',
    Icon: BellRing,
    route: '/notifications',
  },
  {
    key: 'outbox',
    title: 'Outbox & sync',
    Icon: CloudUpload,
    route: '/outbox',
  },
  {
    key: 'devices',
    title: 'Devices',
    Icon: Smartphone,
    route: '/devices',
  },
  {
    key: 'change-password',
    title: 'Change password',
    Icon: KeyRound,
    route: '/change-password',
  },
];

function filterEntries(user: User | null | undefined, entries: MoreEntry[]) {
  return entries.filter((e) => {
    if (!e.permissionAny) return true;
    return hasAnyPermission(user, e.permissionAny);
  });
}

export default function ManagerMore() {
  const router = useRouter();
  const pushWithReturn = usePushWithReturn();
  const { user, company, signOut } = useAuthStore();
  const { colors } = useTheme();

  const primary = React.useMemo(
    () => filterEntries(user, ENTRIES_PRIMARY),
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
      /* ignore — local revocation below is the source of truth */
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

      {primary.length > 0 ? (
        <Card className="mx-4 mt-2" padded={false}>
          <View className="px-3">
            {primary.map((e, i) => (
              <React.Fragment key={e.key}>
                <ListRow
                  left={<e.Icon size={18} color={colors.foreground} />}
                  title={e.title}
                  chevron
                  onPress={() => pushWithReturn(e.route)}
                />
                {i < primary.length - 1 ? <Divider /> : null}
              </React.Fragment>
            ))}
          </View>
        </Card>
      ) : null}

      <Card className="mx-4 mt-2" padded={false}>
        <View className="px-3">
          {utils.map((e, i) => (
            <React.Fragment key={e.key}>
              <ListRow
                left={<e.Icon size={18} color={colors.foreground} />}
                title={e.title}
                chevron
                onPress={() => pushWithReturn(e.route)}
              />
              {i < utils.length - 1 ? <Divider /> : null}
            </React.Fragment>
          ))}
        </View>
      </Card>

      <View className="px-4 mt-3 mb-8">
        <Button
          variant="outline"
          onPress={onLogout}
          leftIcon={<LogOut size={18} color={colors.foreground} />}
        >
          Sign out
        </Button>
      </View>
    </Screen>
  );
}
