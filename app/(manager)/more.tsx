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
} from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { ListRow, Divider } from '@/ui/ListRow';
import { Text, H2 } from '@/ui/Text';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { useAuthStore } from '@/state/authStore';
import { authApi } from '@/api/auth';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { OutboxFooter } from '@/features/sync/OutboxFooter';
import { hasAnyPermission } from '@/auth/rbac';
import type { User } from '@/domain/types';

interface MoreEntry {
  key: string;
  title: string;
  icon: React.ReactNode;
  route: string;
  /** Permission(s) gating the row; `undefined` means always visible. */
  permissionAny?: string[];
}

const ENTRIES_PRIMARY: MoreEntry[] = [
  {
    key: 'weekly',
    title: 'Weekly plans',
    icon: <Briefcase size={18} color="#0f172a" />,
    route: '/plan/weekly',
    permissionAny: ['weeklyPlans.view', 'weeklyPlans.review', 'weeklyPlans.approve'],
  },
  {
    key: 'kpi',
    title: 'Targets & KPI',
    icon: <Target size={18} color="#0f172a" />,
    route: '/kpi',
    permissionAny: ['targets.view', 'team.viewAllReports'],
  },
  {
    key: 'expenses',
    title: 'Expenses',
    icon: <Receipt size={18} color="#0f172a" />,
    route: '/expenses',
    permissionAny: ['expenses.view'],
  },
  {
    key: 'collections',
    title: 'Pharmacies & collections',
    icon: <Wallet size={18} color="#0f172a" />,
    route: '/pharmacy',
    permissionAny: ['payments.view', 'pharmacies.view'],
  },
  {
    key: 'team',
    title: 'My team',
    icon: <UsersIcon size={18} color="#0f172a" />,
    route: '/(manager)',
    permissionAny: ['team.view', 'team.viewAllReports'],
  },
];

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

export default function ManagerMore() {
  const router = useRouter();
  const pushWithReturn = usePushWithReturn();
  const { user, company, signOut } = useAuthStore();

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

      <OutboxFooter />

      {primary.length > 0 ? (
        <Card className="mx-4 mt-2" padded={false}>
          <View className="px-3">
            {primary.map((e, i) => (
              <React.Fragment key={e.key}>
                <ListRow
                  left={e.icon}
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
                left={e.icon}
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
          leftIcon={<LogOut size={18} color="#0f172a" />}
        >
          Sign out
        </Button>
      </View>
    </Screen>
  );
}
