import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  height = 16,
  width = '100%',
  radius = 8,
}) => {
  const opacity = useSharedValue(0.5);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[aStyle, { height, width, borderRadius: radius }]}
      className={cn('bg-muted', className)}
    />
  );
};

export const SkeletonRow: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} className="mb-3">
        <Skeleton height={18} width={'60%'} />
        <View className="h-1.5" />
        <Skeleton height={12} width={'40%'} />
      </View>
    ))}
  </View>
);
