import * as React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';

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
  const content = items.map((item) => {
    const active = item.key === value;
    return (
      <Pressable
        key={item.key}
        onPress={() => onChange(item.key)}
        className={cn(
          'px-3 py-2 rounded-full mr-2 flex-row items-center',
          active ? 'bg-primary' : 'bg-muted',
        )}
      >
        <Text
          size="sm"
          weight="medium"
          tone={active ? 'inverse' : 'default'}
        >
          {item.label}
        </Text>
        {typeof item.count === 'number' ? (
          <View
            className={cn(
              'ml-1.5 rounded-full px-1.5 py-0.5',
              active ? 'bg-white/20' : 'bg-slate-200',
            )}
          >
            <Text
              size="xs"
              weight="medium"
              tone={active ? 'inverse' : 'default'}
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
