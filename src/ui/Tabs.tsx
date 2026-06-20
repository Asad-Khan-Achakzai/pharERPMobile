import * as React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';

interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  value: string;
  onChange: (key: string) => void;
  items: TabItem[];
  className?: string;
  scrollable?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onChange,
  items,
  className,
  scrollable,
}) => {
  const { colors } = useTheme();

  const content = items.map((item) => {
    const active = item.key === value;
    return (
      <Pressable
        key={item.key}
        onPress={() => onChange(item.key)}
        className="px-3 py-2 rounded-full mr-2 flex-row items-center"
        style={{
          backgroundColor: active ? colors.primary : colors.muted,
        }}
      >
        <Text
          size="sm"
          weight="medium"
          style={{ color: active ? colors.primaryForeground : colors.foreground }}
        >
          {item.label}
        </Text>
        {typeof item.count === 'number' ? (
          <View
            className="ml-1.5 rounded-full px-1.5 py-0.5"
            style={{
              backgroundColor: active ? 'rgba(255,255,255,0.2)' : colors.border,
            }}
          >
            <Text
              size="xs"
              weight="medium"
              style={{ color: active ? colors.primaryForeground : colors.foreground }}
            >
              {item.count}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="py-2 px-4"
        className={cn(className)}
      >
        {content}
      </ScrollView>
    );
  }
  return <View className={cn('flex-row py-2 px-4', className)}>{content}</View>;
};
