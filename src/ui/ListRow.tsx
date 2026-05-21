import * as React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from './Text';
import { cn } from '@/utils/cn';

interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  className?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  meta,
  left,
  right,
  onPress,
  chevron,
  className,
}) => {
  const inner = (
    <>
      {left ? <View className="mr-3">{left}</View> : null}
      <View className="flex-1">
        <Text size="base" weight="medium" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text size="sm" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <View className="mt-1">{meta}</View> : null}
      </View>
      {right ? <View className="ml-3">{right}</View> : null}
      {chevron ? (
        <View className="ml-2">
          <ChevronRight size={18} color="#94a3b8" />
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View className={cn('flex-row items-center py-3', className)}>{inner}</View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#e2e8f0' }}
      className={cn('flex-row items-center py-3 active:bg-muted', className)}
    >
      {inner}
    </Pressable>
  );
};

export const Divider: React.FC<{ className?: string }> = ({ className }) => (
  <View className={cn('h-px bg-border', className)} />
);
