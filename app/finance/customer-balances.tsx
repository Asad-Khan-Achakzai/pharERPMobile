import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { EmptyState } from '@/ui/EmptyState';
import { PermissionGate } from '@/auth/PermissionGate';
import { ledgerApi } from '@/api/ledger';

function CustomerBalancesImpl() {
  const list = useQuery({
    queryKey: ['ledger', 'customer-balances'],
    queryFn: () => ledgerApi.list({ limit: 100 }),
  });

  return (
    <Screen padded={false} scroll={false}>
      <Header back title="Customer balances" subtitle="Pharmacy ledger summary" />
      {list.isLoading ? (
        <ListSkeletonList count={6} variant="ledger" />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="No ledger entries" description="Customer balances will appear here." />
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={(row) => row._id}
          contentContainerClassName="px-4 pt-2 pb-8"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => {
            const pharmacy =
              item.pharmacyId && typeof item.pharmacyId === 'object'
                ? item.pharmacyId.name
                : null;
            const d = item.date && isValid(parseISO(item.date)) ? parseISO(item.date) : null;
            return (
              <Card padded>
                <Text size="base" weight="semibold" numberOfLines={1}>
                  {pharmacy ?? item.description ?? 'Ledger entry'}
                </Text>
                <Text size="xs" tone="muted" className="mt-1">
                  {d ? format(d, 'd MMM yyyy') : '—'}
                  {item.type ? ` · ${item.type}` : ''}
                </Text>
                {item.balance != null ? (
                  <Text size="sm" weight="medium" className="mt-1">
                    Balance Rs {Math.round(item.balance).toLocaleString()}
                  </Text>
                ) : item.amount != null ? (
                  <Text size="sm" weight="medium" className="mt-1">
                    Rs {Math.round(item.amount).toLocaleString()}
                  </Text>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

export default function CustomerBalancesScreen() {
  return (
    <PermissionGate anyOf={['ledger.view', 'admin.access']} title="Customer balances">
      <CustomerBalancesImpl />
    </PermissionGate>
  );
}
