import * as React from 'react';
import { Pressable, PressableProps } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { cn } from '@/utils/cn';

interface FilterOptionProps extends Omit<PressableProps, 'children'> {
  selected?: boolean;
  label: string;
  description?: string;
  className?: string;
}

/** List-style selectable filter row — theme-aware selected/unselected colors. */
export const FilterOption: React.FC<FilterOptionProps> = ({
  selected = false,
  label,
  description,
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
        backgroundColor: selected ? colors.primaryMuted : colors.inputBackground,
      }}
      className={cn('rounded-xl px-3 py-2.5 mb-2', className)}
    >
      <Text size="sm" weight={selected ? 'semibold' : 'medium'} tone={selected ? 'primary' : 'default'}>
        {label}
      </Text>
      {description ? (
        <Text size="xs" tone="muted" className="mt-0.5">
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
};
