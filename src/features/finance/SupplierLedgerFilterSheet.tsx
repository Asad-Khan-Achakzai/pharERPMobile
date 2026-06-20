import * as React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { format, isValid, parse } from 'date-fns';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { DatePickerField } from '@/ui/DatePickerField';
import { SearchField } from '@/ui/SearchField';
import { Button } from '@/ui/Button';
import { FilterSelectionBar } from '@/ui/FilterSelectionBar';
import { useTheme } from '@/theme/ThemeProvider';
import { suppliersApi, type Supplier } from '@/api/suppliers';
import type { ID } from '@/domain/types';

function normalizeDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = parse(trimmed, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : '';
}

function applySupplierLedgerFilters(draft: SupplierLedgerFilters): SupplierLedgerFilters {
  return {
    ...draft,
    from: normalizeDateInput(draft.from),
    to: normalizeDateInput(draft.to),
  };
}

export interface SupplierLedgerFilters {
  supplierId?: ID;
  supplierName?: string;
  supplierCity?: string;
  from: string;
  to: string;
}

export const emptySupplierLedgerFilters: SupplierLedgerFilters = {
  from: '',
  to: '',
};

export function countSupplierLedgerFilters(filters: SupplierLedgerFilters): number {
  let n = 0;
  if (filters.supplierId) n += 1;
  if (filters.from.trim()) n += 1;
  if (filters.to.trim()) n += 1;
  return n;
}

interface SupplierLedgerFilterSheetProps {
  open: boolean;
  onClose: () => void;
  value: SupplierLedgerFilters;
  onApply: (next: SupplierLedgerFilters) => void;
}

export const SupplierLedgerFilterSheet: React.FC<SupplierLedgerFilterSheetProps> = ({
  open,
  onClose,
  value,
  onApply,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = React.useState<SupplierLedgerFilters>(value);
  const [search, setSearch] = React.useState('');
  const [hits, setHits] = React.useState<Supplier[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  React.useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    void suppliersApi
      .lookup(search.trim())
      .then((rows) => {
        if (!cancel) setHits(rows);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [open, search]);

  const footer = (
    <View className="flex-row gap-2">
      <Button
        variant="outline"
        className="flex-1"
        onPress={() => {
          setSearch('');
          setHits([]);
          onApply(emptySupplierLedgerFilters);
          onClose();
        }}
      >
        Reset
      </Button>
      <Button
        className="flex-1"
        onPress={() => {
          onApply(applySupplierLedgerFilters(draft));
          onClose();
        }}
      >
        Apply
      </Button>
    </View>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter supplier ledger"
      subtitle="Supplier and date range"
      snapPoints={['50%', '85%']}
      initialSnapIndex={-1}
      scrollable
      footer={footer}
    >
      <Text size="xs" weight="semibold" tone="muted" className="mb-2 uppercase tracking-wide">
        Supplier
      </Text>
      {draft.supplierId ? (
        <FilterSelectionBar
          label={draft.supplierName ?? 'Supplier'}
          subtitle={draft.supplierCity}
          onClear={() =>
            setDraft((d) => ({
              ...d,
              supplierId: undefined,
              supplierName: undefined,
              supplierCity: undefined,
            }))
          }
        />
      ) : null}
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Search supplier…"
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} className="my-3" />
      ) : (
        hits.map((s) => (
          <Pressable
            key={s._id}
            onPress={() => {
              setDraft((d) => ({
                ...d,
                supplierId: s._id,
                supplierName: s.name,
                supplierCity: s.city,
              }));
              setSearch('');
              setHits([]);
            }}
            className="py-2 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Text size="sm" weight="medium">
              {s.name}
            </Text>
            {s.city ? (
              <Text size="xs" tone="muted">
                {s.city}
              </Text>
            ) : null}
          </Pressable>
        ))
      )}

      <Text size="xs" weight="semibold" tone="muted" className="mb-2 mt-4 uppercase tracking-wide">
        Date range
      </Text>
      <View className="flex-row gap-2">
        <DatePickerField
          label="From"
          value={draft.from}
          onChange={(from) => setDraft((d) => ({ ...d, from }))}
          className="flex-1"
        />
        <DatePickerField
          label="To"
          value={draft.to}
          onChange={(to) => setDraft((d) => ({ ...d, to }))}
          minimumDate={
            draft.from.trim()
              ? parse(draft.from.trim(), 'yyyy-MM-dd', new Date())
              : undefined
          }
          className="flex-1"
        />
      </View>
    </Sheet>
  );
};
