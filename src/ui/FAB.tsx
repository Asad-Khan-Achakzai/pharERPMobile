import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { cn } from '@/utils/cn';

interface FABProps {
  onPress: () => void;
  icon?: React.ReactNode;
  className?: string;
  accessibilityLabel?: string;
}

export const FAB: React.FC<FABProps> = ({
  onPress,
  icon,
  className,
  accessibilityLabel,
}) => (
  <View pointerEvents="box-none" className="absolute right-4 bottom-6">
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
