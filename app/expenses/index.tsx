import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Plus } from 'lucide-react-native';
import { format } from 'date-fns';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { Text } from '@/ui/Text';
import { FAB } from '@/ui/FAB';
import { useTabBarLayout } from '@/navigation/useTabBarLayout';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { EmptyState, ThemedEmptyIcon } from '@/ui/EmptyState';
import { expensesQueries } from '@/data/expensesQueries';
import { SyncStatusBadge } from '@/ui/SyncStatusBadge';
import type { SyncUiState } from '@/data/localEntities';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/auth/PermissionGate';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';

const CATEGORY_LABEL: Record<string, string> = {
  LOGISTICS: 'Logistics',
  OFFICE: 'Office',
  RENT: 'Rent',
  SALARY: 'Salary',
  OTHER: 'Other',
};

const STATUS_TONE: Record<string, 'warning' | 'success' | 'danger' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

function expenseStatusLabel(status?: string): string {
  if (status === 'PENDING') return 'Pending approval';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'APPROVED') return 'Approved';
  return 'Approved';
}

function safeDate(value: string | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ExpensesImpl() {
  const pushWithReturn = usePushWithReturn();
  const { canDo } = usePermissions();
  const canCreate = canDo('expense_create');
  const { stackFabOffset } = useTabBarLayout();
  const list = useQuery({
    queryKey: ['expenses', 'list'],
    queryFn: () => expensesQueries.list({ limit: 50 }),
  });

  return (
    <Screen padded={false} scroll={false}>
      <Header back title="Expenses" />
      {list.isLoading ? (
        <ListSkeletonList count={5} variant="expense" />
      ) : (list.data?.items ?? []).length === 0 ? (
        <EmptyState
          icon={<ThemedEmptyIcon Icon={Receipt} />}
          title="No expenses yet"
          description={
            canCreate
              ? 'Add field expenses for your manager to review.'
              : 'You do not have permission to create expenses.'
          }
          actionLabel={canCreate ? 'Add expense' : undefined}
          onAction={canCreate ? () => pushWithReturn('/expenses/new') : undefined}
        />
      ) : (
        <FlatList
          data={list.data!.items}
          keyExtractor={(e) => e._id}
          contentContainerClassName="px-4 pt-2 pb-24"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => {
            const dateObj = safeDate(item.date);
            const status = item.status ?? 'APPROVED';
            return (
              <Card padded>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text size="base" weight="semibold" numberOfLines={1}>
                      {CATEGORY_LABEL[item.category] ?? item.category ?? 'Expense'}
                    </Text>
                    <Text size="xs" tone="muted" numberOfLines={1}>
                      {item.description ??
                        (dateObj ? format(dateObj, 'd MMM yyyy') : '')}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text size="base" weight="semibold">
                      Rs {item.amount.toLocaleString()}
                    </Text>
                    <Badge tone={STATUS_TONE[status] ?? 'muted'} className="mt-1">
                      {expenseStatusLabel(status)}
                    </Badge>
                    <SyncStatusBadge
                      state={(item as { _syncState?: SyncUiState })._syncState}
                      className="mt-1"
                    />
                    {dateObj ? (
                      <Text size="xs" tone="muted" className="mt-1">
                        {format(dateObj, 'd MMM')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
      {canCreate ? (
        <FAB
          onPress={() => pushWithReturn('/expenses/new')}
          icon={<Plus size={22} color="#fff" />}
          bottomOffset={stackFabOffset}
        />
      ) : null}
    </Screen>
  );
}

export default function Expenses() {
  return (
    <PermissionGate screen="expense_view" title="Expenses">
      <ExpensesImpl />
    </PermissionGate>
  );
}
