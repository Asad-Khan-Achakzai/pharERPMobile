import * as React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Plus } from 'lucide-react-native';
import { cn } from '@/utils/cn';
import { useTabBarLayout } from '@/navigation/useTabBarLayout';

interface FABProps {
  onPress: () => void;
  icon?: React.ReactNode;
  className?: string;
  accessibilityLabel?: string;
  /** Extra offset when no tab bar is present (e.g. stack screens). */
  bottomOffset?: number;
}

export const FAB: React.FC<FABProps> = ({
  onPress,
  icon,
  className,
  accessibilityLabel,
  bottomOffset,
}) => {
  const { fabOffset } = useTabBarLayout();
  const bottom = bottomOffset ?? fabOffset;

  return (
  <View
    pointerEvents="box-none"
    style={{ position: 'absolute', right: 16, bottom } as ViewStyle}
  >
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Action'}
      onPress={onPress}
      className={cn(
        'h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg active:opacity-90',
        className,
      )}
    >
      {icon ?? <Plus size={24} color="#ffffff" />}
    </Pressable>
  </View>
  );
};
