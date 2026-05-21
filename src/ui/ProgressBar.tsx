import * as React from 'react';
import { View } from 'react-native';
import { cn } from '@/utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const trackTone = {
  primary: 'bg-primary-600',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
} as const;

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  tone = 'primary',
  className,
}) => {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  return (
    <View className={cn('h-2 w-full bg-muted rounded-full overflow-hidden', className)}>
      <View
        className={cn('h-full rounded-full', trackTone[tone])}
        style={{ width: `${pct}%` }}
      />
    </View>
  );
};
