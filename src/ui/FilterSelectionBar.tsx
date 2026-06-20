import * as React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '@/theme/ThemeProvider';

interface FilterSelectionBarProps {
  label: string;
  subtitle?: string;
  onClear: () => void;
}

/** Shows the currently selected filter value with a clear action. */
export const FilterSelectionBar: React.FC<FilterSelectionBarProps> = ({
  label,
  subtitle,
  onClear,
}) => {
  const { colors } = useTheme();

  return (
    <View
      className="flex-row items-center justify-between rounded-xl border px-3 py-2 mb-2"
      style={{
        backgroundColor: colors.inputBackground,
        borderColor: colors.border,
      }}
    >
      <View className="flex-1 pr-2">
        <Text size="sm" weight="medium" numberOfLines={subtitle ? 1 : 2}>
          {label}
        </Text>
        {subtitle ? (
          <Text size="xs" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Button variant="ghost" size="sm" onPress={onClear}>
        Clear
      </Button>
    </View>
  );
};
