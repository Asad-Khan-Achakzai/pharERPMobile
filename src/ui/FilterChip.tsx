import * as React from 'react';
import { Pressable, PressableProps } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { cn } from '@/utils/cn';

interface FilterChipProps extends Omit<PressableProps, 'children'> {
  selected?: boolean;
  label: string;
  className?: string;
}

/** Pill-shaped filter toggle — theme-aware selected/unselected colors. */
export const FilterChip: React.FC<FilterChipProps> = ({
  selected = false,
  label,
  className,
  ...rest
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.inputBackground,
      }}
      className={cn('rounded-full px-3 py-1.5', className)}
    >
      <Text size="xs" weight={selected ? 'semibold' : 'medium'} tone={selected ? 'inverse' : 'default'}>
        {label}
      </Text>
    </Pressable>
  );
};
