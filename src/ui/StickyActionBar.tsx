import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/utils/cn';

interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  children,
  className,
}) => (
  <SafeAreaView
    edges={['bottom']}
    className={cn(
      'absolute bottom-0 inset-x-0 bg-background border-t border-border',
      className,
    )}
  >
    <View className="px-4 py-3">{children}</View>
  </SafeAreaView>
);
