import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  children,
  className,
}) => {
  const { colors } = useTheme();
  const keyboardInset = useKeyboardInset();

  return (
    <SafeAreaView
      edges={['bottom']}
      style={{
        position: 'absolute',
        bottom: keyboardInset,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
      className={cn(className)}
    >
      <View className="px-4 py-3">{children}</View>
    </SafeAreaView>
  );
};
