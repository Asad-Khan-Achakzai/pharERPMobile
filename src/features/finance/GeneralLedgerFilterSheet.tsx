import * as React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { DatePickerField } from '@/ui/DatePickerField';
import { Button } from '@/ui/Button';
import { accountsApi } from '@/api/accounts';
import { cn } from '@/utils/cn';

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
        <View className="flex-row items-center justify-between rounded-xl border border-border bg-muted px-3 py-2 mb-2">
          <Text size="sm" className="flex-1 pr-2" numberOfLines={2}>
            {draft.accountLabel ?? 'Account'}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={() =>
              setDraft((d) => ({ ...d, accountId: '', accountLabel: undefined }))
            }
          >
            Clear
          </Button>
        </View>
      ) : null}

      <Pressable
        onPress={() => setDraft((d) => ({ ...d, accountId: '', accountLabel: undefined }))}
        className={cn(
          'rounded-xl border px-3 py-2.5 mb-2',
          !draft.accountId ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        <Text size="sm" weight={!draft.accountId ? 'semibold' : 'medium'}>
          All accounts
        </Text>
      </Pressable>

      {accounts.isLoading ? (
        <ActivityIndicator className="my-3" />
      ) : (
        (accounts.data ?? []).map((a) => {
          const selected = draft.accountId === a._id;
          const label = `${a.code} · ${a.name}`;
          return (
            <Pressable
              key={a._id}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  accountId: a._id,
                  accountLabel: label,
                }))
              }
              className={cn(
                'rounded-xl border px-3 py-2.5 mb-2',
                selected ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <Text size="sm" weight={selected ? 'semibold' : 'medium'}>
                {label}
              </Text>
            </Pressable>
          );
        })
      )}
    </Sheet>
  );
};
