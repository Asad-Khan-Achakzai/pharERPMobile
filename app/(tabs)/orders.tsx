import * as React from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus, ShoppingBag, SlidersHorizontal } from 'lucide-react-native';
import { format, isValid, parseISO } from 'date-fns';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { SearchField } from '@/ui/SearchField';
import { PressableCard } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { SkeletonRow } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { FAB } from '@/ui/FAB';
import { ordersQueries } from '@/data/ordersQueries';
import { SyncStatusBadge } from '@/ui/SyncStatusBadge';
import type { SyncUiState } from '@/data/localEntities';
import { usePermissions } from '@/hooks/usePermissions';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import {
  OrdersFilterSheet,
  emptyOrderFilters,
  type OrderListFilters,
} from '@/features/orders/OrdersFilterSheet';

const PAGE_SIZE = 20;

function refName(
  ref: string | { _id?: string; name?: string } | null | undefined,
  fallback = '',
): string {
  if (!ref) return fallback;
  if (typeof ref === 'string') return fallback;
  return ref.name ?? fallback;
}

const statusTone: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'muted'> = {
  DRAFT: 'muted',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  INVOICED: 'success',
  DELIVERED: 'success',
  PARTIALLY_DELIVERED: 'warning',
  PARTIALLY_RETURNED: 'warning',
  RETURNED: 'danger',
  CANCELLED: 'muted',
};

function countActiveFilters(filters: OrderListFilters): number {
  let n = filters.status !== '' ? 1 : 0;
  if (filters.pharmacyId) n += 1;
  if (filters.medicalRepId) n += 1;
  return n;
}

export default function OrdersScreen() {
  const { canDo, can } = usePermissions();
  const canCreate = canDo('order_create');
  const canFilterByRep = can('team.viewAllReports') || can('admin.access');
  const pushWithReturn = usePushWithReturn();
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filters, setFilters] = React.useState<OrderListFilters>(emptyOrderFilters);
  const [filterOpen, setFilterOpen] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteQuery({
    queryKey: ['orders', 'list', debouncedSearch, filters, canFilterByRep],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      ordersQueries.list({
        page: pageParam,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        pharmacyId: filters.pharmacyId,
        medicalRepId: canFilterByRep ? filters.medicalRepId : undefined,
      }),
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.limit;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;
  const activeFilterCount = countActiveFilters(filters);

  return (
    <Screen padded={false} scroll={false}>
      <Header
        title="Orders"
        right={
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setFilterOpen(true)}
            leftIcon={<SlidersHorizontal size={16} color="#0f172a" />}
          >
            {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
          </Button>
        }
      />
      <View className="px-4 pb-2">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search pharmacy or order #…"
        />
      </View>
      {list.isLoading ? (
        <View className="px-4">
          <SkeletonRow count={6} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={28} color="#94a3b8" />}
          title="No orders yet"
          description={
            debouncedSearch || activeFilterCount > 0
              ? 'Try changing search or filters.'
              : canCreate
                ? 'Book your first order for a pharmacy.'
                : 'You do not have permission to create orders.'
          }
          actionLabel={canCreate && !debouncedSearch && activeFilterCount === 0 ? 'New order' : undefined}
          onAction={
            canCreate && !debouncedSearch && activeFilterCount === 0
              ? () => pushWithReturn('/order/new')
              : undefined
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o._id}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={() => list.refetch()}
          contentContainerClassName="px-4 pt-2 pb-24"
          ItemSeparatorComponent={() => <View className="h-2" />}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) {
              void list.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <ActivityIndicator className="my-4" />
            ) : items.length < total ? (
              <Text size="xs" tone="muted" className="text-center my-3">
                Showing {items.length} of {total}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const createdAtDate = item.createdAt ? parseISO(item.createdAt) : null;
            const createdAtLabel =
              createdAtDate && isValid(createdAtDate)
                ? ` · ${format(createdAtDate, 'd MMM, HH:mm')}`
                : '';
            const totalAmount =
              item.amountAfterPharmacyDiscount ?? item.totalAmount ?? item.totalOrderedAmount ?? 0;
            return (
              <PressableCard onPress={() => pushWithReturn(`/order/${item._id}`)}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text size="base" weight="semibold" numberOfLines={1}>
                      {refName(item.pharmacyId, 'Pharmacy')}
                    </Text>
                    <Text size="xs" tone="muted" numberOfLines={1}>
                      {refName(item.distributorId, '')}
                      {createdAtLabel}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text size="base" weight="semibold">
                      Rs {Math.round(totalAmount).toLocaleString()}
                    </Text>
                    <Badge tone={statusTone[item.status] ?? 'default'} className="mt-1">
                      {item.status}
                    </Badge>
                    <SyncStatusBadge
                      state={(item as { _syncState?: SyncUiState })._syncState}
                      className="mt-1"
                    />
                  </View>
                </View>
              </PressableCard>
            );
          }}
        />
      )}
      {canCreate ? (
        <FAB
          onPress={() => pushWithReturn('/order/new')}
          icon={<Plus size={22} color="#fff" />}
          accessibilityLabel="New order"
        />
      ) : null}
      <OrdersFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={setFilters}
        canFilterByRep={canFilterByRep}
      />
    </Screen>
  );
}
