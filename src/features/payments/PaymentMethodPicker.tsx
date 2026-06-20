import * as React from 'react';
import { View } from 'react-native';
import { Label } from '@/ui/Text';
import { FilterChip } from '@/ui/FilterChip';
import { PAYMENT_METHODS } from './constants';
import type { PaymentMethod } from '@/domain/types';

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return (
    <View className="mb-3">
      <Label>Payment method *</Label>
      <View className="flex-row flex-wrap gap-2 mt-2">
        {PAYMENT_METHODS.map((m) => (
          <FilterChip
            key={m.key}
            label={m.label}
            selected={value === m.key}
            onPress={() => onChange(m.key)}
          />
        ))}
      </View>
    </View>
  );
}
