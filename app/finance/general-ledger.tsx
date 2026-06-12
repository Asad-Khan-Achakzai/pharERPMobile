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
import { accountingReportsApi, type GeneralLedgerEntry } from '@/api/accountingReports';
import { formatPkr } from '@/api/ledger';
import {
  GeneralLedgerFilterSheet,
  emptyGeneralLedgerFilters,
  countGeneralLedgerFilters,
  type GeneralLedgerFilters,
} from '@/features/finance/GeneralLedgerFilterSheet';

function GeneralLedgerImpl() {
  const [filters, setFilters] = React.useState<GeneralLedgerFilters>(emptyGeneralLedgerFilters);
  const [filterOpen, setFilterOpen] = React.useState(false);

  const { accountId, from, to } = filters;
  const activeFilterCount = countGeneralLedgerFilters(filters);

  const report = useQuery({
    queryKey: ['accounting', 'general-ledger', accountId, from, to],
    queryFn: () =>
      accountingReportsApi.generalLedger({
        accountId: accountId || undefined,
        from: from.trim() || undefined,
        to: to.trim() || undefined,
      }),
  });

  const selectedBucket = React.useMemo(
    () => (accountId ? report.data?.find((b) => b.account._id === accountId) : null),
    [accountId, report.data]
  );

  const entries: GeneralLedgerEntry[] = React.useMemo(() => {
    if (!report.data) return [];
    if (selectedBucket) return selectedBucket.entries;
    return report.data.flatMap((b) => b.entries);
  }, [report.data, selectedBucket]);

  return (
    <Screen padded={false} scroll={false}>
      <Header
        back
        title="General ledger"
        subtitle="Detailed history of money movement by account"
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

      {activeFilterCount > 0 ? (
        <View className="px-4 pb-2">
          <Text size="xs" tone="muted" numberOfLines={2}>
            {[
              filters.accountLabel ?? (filters.accountId ? 'Account selected' : 'All accounts'),
              filters.from.trim() ? `From ${filters.from.trim()}` : null,
              filters.to.trim() ? `To ${filters.to.trim()}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      ) : null}

      {selectedBucket && !report.isLoading ? (
        <View className="px-4 pb-2 flex-row flex-wrap gap-2">
          <Card className="flex-1 min-w-[140px]" padded>
            <Text size="xs" tone="muted">
              Opening balance
            </Text>
            <Text size="base" weight="semibold" className="mt-1">
              {formatPkr(selectedBucket.openingBalance)}
            </Text>
          </Card>
          <Card className="flex-1 min-w-[140px]" padded>
            <Text size="xs" tone="muted">
              Closing balance
            </Text>
            <Text size="base" weight="semibold" className="mt-1">
              {formatPkr(selectedBucket.closingBalance)}
            </Text>
          </Card>
        </View>
      ) : null}

      {report.isLoading ? (
        <View className="px-4">
          <SkeletonRow count={6} />
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No entries"
          description={
            activeFilterCount > 0
              ? 'Try changing filters.'
              : 'Open filters to narrow by account or date.'
          }
        />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e, i) => `${e.voucherId}-${i}`}
          contentContainerClassName="px-4 pt-1 pb-8"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => {
            const d = item.date && isValid(parseISO(item.date)) ? parseISO(item.date) : null;
            return (
              <Card padded>
                <View className="flex-row justify-between">
                  <View className="flex-1 pr-2">
                    <Text size="sm" weight="semibold">
                      {item.voucherNumber}
                    </Text>
                    <Text size="xs" tone="muted">
                      {d ? format(d, 'd MMM yyyy') : '—'} · {item.voucherType}
                    </Text>
                    {!accountId ? (
                      <Text size="xs" tone="muted" className="mt-0.5">
                        {item.accountCode} {item.accountName}
                      </Text>
                    ) : null}
                  </View>
                  <View className="items-end">
                    {item.debit > 0 ? (
                      <Text size="xs">Dr {formatPkr(item.debit)}</Text>
                    ) : null}
                    {item.credit > 0 ? (
                      <Text size="xs">Cr {formatPkr(item.credit)}</Text>
                    ) : null}
                    <Text size="sm" weight="semibold" className="mt-1">
                      {formatPkr(item.runningBalance)}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      <GeneralLedgerFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={setFilters}
      />
    </Screen>
  );
}

export default function GeneralLedgerScreen() {
  return (
    <PermissionGate anyOf={['reports.accounting', 'admin.access']} title="General ledger">
      <GeneralLedgerImpl />
    </PermissionGate>
  );
}
