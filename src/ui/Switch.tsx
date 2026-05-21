import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '@/utils/cn';

interface SwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled,
  className,
}) => {
  const offset = useSharedValue(value ? 18 : 2);
  React.useEffect(() => {
    offset.value = withTiming(value ? 18 : 2, { duration: 160 });
  }, [value, offset]);
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      className={cn(
        'h-6 w-10 rounded-full px-0.5 justify-center',
        value ? 'bg-primary' : 'bg-slate-300',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Animated.View
        style={knobStyle}
        className="h-5 w-5 rounded-full bg-white shadow-sm"
      />
    </Pressable>
  );
};

export const Checkbox: React.FC<{
  value: boolean;
  onValueChange: (v: boolean) => void;
  className?: string;
}> = ({ value, onValueChange, className }) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: value }}
    className={cn(
      'h-5 w-5 rounded-md border items-center justify-center',
      value ? 'bg-primary border-primary' : 'bg-card border-slate-300',
      className,
    )}
  >
    {value ? <View className="h-2.5 w-2.5 bg-white rounded-sm" /> : null}
  </Pressable>
);
