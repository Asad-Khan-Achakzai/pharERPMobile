import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';

interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  disabled,
  className,
}) => {
  const decDisabled = disabled || value <= min;
  const incDisabled = disabled || value >= max;
  return (
    <View
      className={cn(
        'flex-row items-center rounded-xl border border-border bg-card overflow-hidden',
        className,
      )}
    >
      <Pressable
        accessibilityLabel="decrement"
        disabled={decDisabled}
        onPress={() => onChange(Math.max(min, value - step))}
        className={cn('h-10 w-10 items-center justify-center', decDisabled && 'opacity-40')}
      >
        <Minus size={16} color="#0f172a" />
      </Pressable>
      <View className="px-3 min-w-10 items-center">
        <Text size="base" weight="semibold">
          {value}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="increment"
        disabled={incDisabled}
        onPress={() => onChange(Math.min(max, value + step))}
        className={cn('h-10 w-10 items-center justify-center', incDisabled && 'opacity-40')}
      >
        <Plus size={16} color="#0f172a" />
      </Pressable>
    </View>
  );
};
