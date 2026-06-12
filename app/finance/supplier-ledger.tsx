import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { SlidersHorizontal } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { SkeletonRow } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { PermissionGate } from '@/auth/PermissionGate';
import { ledgerApi, formatPkr } from '@/api/ledger';
import {
  SupplierLedgerFilterSheet,
  emptySupplierLedgerFilters,
  countSupplierLedgerFilters,
  type SupplierLedgerFilters,
} from '@/features/finance/SupplierLedgerFilterSheet';

function entryLabel(description?: string, category?: string, referenceType?: string): string {
  if (description?.trim()) return description.trim();
  if (category) return category.replace(/_/g, ' ');
  return (referenceType ?? 'Entry').replace(/_/g, ' ');
}

function SupplierLedgerImpl() {
  const [filters, setFilters] = React.useState<SupplierLedgerFilters>(emptySupplierLedgerFilters);
  const [filterOpen, setFilterOpen] = React.useState(false);

  const activeFilterCount = countSupplierLedgerFilters(filters);
  const hasSupplier = !!filters.supplierId;

  const statement = useQuery({
    queryKey: ['ledger', 'supplier', filters.supplierId, filters.from, filters.to],
    queryFn: () =>
      ledgerApi.supplierStatement({
        supplierId: filters.supplierId!,
        from: filters.from.trim() || undefined,
        to: filters.to.trim() || undefined,
      }),
    enabled: hasSupplier,
  });

  return (
    <Screen padded={false} scroll={false}>
      <Header
        back
        title="Supplier ledger"
        subtitle="Payable history — positive balance = amount owed"
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

      {hasSupplier ? (
        <View className="px-4 pb-2">
          <Card padded>
            <Text size="base" weight="semibold">
              {filters.supplierName}
            </Text>
            {filters.supplierCity ? (
              <Text size="xs" tone="muted">
                {filters.supplierCity}
              </Text>
            ) : null}
            {filters.from.trim() || filters.to.trim() ? (
              <Text size="xs" tone="muted" className="mt-1">
                {[filters.from.trim() ? `From ${filters.from.trim()}` : null, filters.to.trim() ? `To ${filters.to.trim()}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </Card>
        </View>
      ) : null}

      {!hasSupplier ? (
        <EmptyState
          title="Select a supplier"
          description="Open filters to choose a supplier and optional date range."
          actionLabel="Open filters"
          onAction={() => setFilterOpen(true)}
        />
      ) : statement.isLoading ? (
        <View className="px-4">
          <SkeletonRow count={5} />
        </View>
      ) : statement.data ? (
        <>
          <View className="px-4 pb-2 flex-row flex-wrap gap-2">
            <Card className="flex-1 min-w-[140px]" padded>
              <Text size="xs" tone="muted">
                Opening payable
              </Text>
              <Text size="base" weight="semibold" className="mt-1">
                {formatPkr(statement.data.openingBalance)}
              </Text>
            </Card>
            <Card className="flex-1 min-w-[140px]" padded>
              <Text size="xs" tone="muted">
                Closing payable
              </Text>
              <Text size="base" weight="semibold" className="mt-1">
                {formatPkr(statement.data.closingBalance)}
              </Text>
            </Card>
          </View>
          <FlatList
            data={statement.data.entries}
            keyExtractor={(e) => e._id}
            contentContainerClassName="px-4 pt-1 pb-8"
            ItemSeparatorComponent={() => <View className="h-2" />}
            ListEmptyComponent={
              <Text size="sm" tone="muted" className="py-4">
                No transactions in this period.
              </Text>
            }
            renderItem={({ item }) => {
              const d = item.date && isValid(parseISO(item.date)) ? parseISO(item.date) : null;
              return (
                <Card padded>
                  <View className="flex-row justify-between">
                    <View className="flex-1 pr-2">
                      <Text size="sm" weight="semibold" numberOfLines={2}>
                        {entryLabel(item.description, item.category, item.referenceType)}
                      </Text>
                      <Text size="xs" tone="muted" className="mt-0.5">
                        {d ? format(d, 'd MMM yyyy') : '—'}
                      </Text>
                    </View>
                    <View className="items-end">
                      {item.debit > 0 ? <Text size="xs">Dr {formatPkr(item.debit)}</Text> : null}
                      {item.credit > 0 ? <Text size="xs">Cr {formatPkr(item.credit)}</Text> : null}
                      <Text size="sm" weight="semibold" className="mt-1">
                        {formatPkr(item.runningBalance)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            }}
          />
        </>
      ) : null}

      <SupplierLedgerFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={setFilters}
      />
    </Screen>
  );
}

export default function SupplierLedgerScreen() {
  return (
    <PermissionGate anyOf={['ledger.view', 'admin.access']} title="Supplier ledger">
      <SupplierLedgerImpl />
    </PermissionGate>
  );
}
