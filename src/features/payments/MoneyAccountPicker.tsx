import * as React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text, Label } from '@/ui/Text';
import { FilterChip } from '@/ui/FilterChip';
import { accountsApi, moneyAccountLabel } from '@/api/accounts';
import type { ID } from '@/domain/types';

interface MoneyAccountPickerProps {
  value: ID | '';
  onChange: (id: ID) => void;
  required?: boolean;
  label?: string;
  helperText?: string;
}

export function MoneyAccountPicker({
  value,
  onChange,
  required,
  label = 'Deposit to (cash/bank account)',
  helperText = 'Which account received this money',
}: MoneyAccountPickerProps) {
  const q = useQuery({
    queryKey: ['accounts', 'money'],
    queryFn: () => accountsApi.listMoneyAccounts(),
  });

  React.useEffect(() => {
    if (value || !q.data?.length) return;
    const cash = q.data.find((a) => a.moneyAccountNature === 'CASH');
    onChange((cash ?? q.data[0])._id);
  }, [value, q.data, onChange]);

  return (
    <View className="mb-3">
      <Label>
        {label}
        {required ? ' *' : ''}
      </Label>
      <Text size="xs" tone="muted" className="mb-2">
        {helperText}
      </Text>
      {q.isLoading ? (
        <Text size="sm" tone="muted">
          Loading accounts…
        </Text>
      ) : (q.data ?? []).length === 0 ? (
        <Text size="sm" tone="danger">
          No money accounts configured. Ask your admin to set up cash/bank accounts.
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {(q.data ?? []).map((account) => (
            <FilterChip
              key={account._id}
              label={moneyAccountLabel(account)}
              selected={value === account._id}
              onPress={() => onChange(account._id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
