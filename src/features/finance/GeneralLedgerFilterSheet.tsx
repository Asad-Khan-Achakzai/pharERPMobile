import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { DatePickerField } from '@/ui/DatePickerField';
import { Button } from '@/ui/Button';
import { FilterOption } from '@/ui/FilterOption';
import { FilterSelectionBar } from '@/ui/FilterSelectionBar';
import { useTheme } from '@/theme/ThemeProvider';
import { accountsApi } from '@/api/accounts';

function normalizeDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = parse(trimmed, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : '';
}

function applyGeneralLedgerFilters(draft: GeneralLedgerFilters): GeneralLedgerFilters {
  return {
    ...draft,
    from: normalizeDateInput(draft.from),
    to: normalizeDateInput(draft.to),
  };
}

export interface GeneralLedgerFilters {
  accountId: string;
  accountLabel?: string;
  from: string;
  to: string;
}

export const emptyGeneralLedgerFilters: GeneralLedgerFilters = {
  accountId: '',
  from: '',
  to: '',
};

export function countGeneralLedgerFilters(filters: GeneralLedgerFilters): number {
  let n = 0;
  if (filters.accountId) n += 1;
  if (filters.from.trim()) n += 1;
  if (filters.to.trim()) n += 1;
  return n;
}

interface GeneralLedgerFilterSheetProps {
  open: boolean;
  onClose: () => void;
  value: GeneralLedgerFilters;
  onApply: (next: GeneralLedgerFilters) => void;
}

export const GeneralLedgerFilterSheet: React.FC<GeneralLedgerFilterSheetProps> = ({
  open,
  onClose,
  value,
  onApply,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = React.useState<GeneralLedgerFilters>(value);

  const accounts = useQuery({
    queryKey: ['accounts', 'posting', 'filter-sheet'],
    queryFn: () => accountsApi.listPostingAccounts(),
    enabled: open,
  });

  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const footer = (
    <View className="flex-row gap-2">
      <Button
        variant="outline"
        className="flex-1"
        onPress={() => {
          onApply(emptyGeneralLedgerFilters);
          onClose();
        }}
      >
        Reset
      </Button>
      <Button
        className="flex-1"
        onPress={() => {
          onApply(applyGeneralLedgerFilters(draft));
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
      title="Filter general ledger"
      subtitle="Date range and account"
      snapPoints={['50%', '85%']}
      initialSnapIndex={-1}
      scrollable
      footer={footer}
    >
      <Text size="xs" weight="semibold" tone="muted" className="mb-2 uppercase tracking-wide">
        Date range
      </Text>
      <View className="flex-row gap-2 mb-4">
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

      <Text size="xs" weight="semibold" tone="muted" className="mb-2 uppercase tracking-wide">
        Account
      </Text>
      {draft.accountId ? (
        <FilterSelectionBar
          label={draft.accountLabel ?? 'Account'}
          onClear={() =>
            setDraft((d) => ({ ...d, accountId: '', accountLabel: undefined }))
          }
        />
      ) : null}

      <FilterOption
        label="All accounts"
        selected={!draft.accountId}
        onPress={() => setDraft((d) => ({ ...d, accountId: '', accountLabel: undefined }))}
      />

      {accounts.isLoading ? (
        <ActivityIndicator color={colors.primary} className="my-3" />
      ) : (
        (accounts.data ?? []).map((a) => {
          const selected = draft.accountId === a._id;
          const label = `${a.code} · ${a.name}`;
          return (
            <FilterOption
              key={a._id}
              label={label}
              selected={selected}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  accountId: a._id,
                  accountLabel: label,
                }))
              }
            />
          );
        })
      )}
    </Sheet>
  );
};
