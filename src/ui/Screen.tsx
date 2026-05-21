import * as React from 'react';
import {
  View,
  ScrollView,
  ScrollViewProps,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopInsetConsumedContext } from './topInsetContext';
import { cn } from '@/utils/cn';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  padded?: boolean;
  background?: 'background' | 'muted';
  keyboardAvoid?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollProps?: Omit<ScrollViewProps, 'children'>;
  testID?: string;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  className,
  contentClassName,
  scroll = true,
  edges = ['top'],
  padded = true,
  background = 'background',
  keyboardAvoid = false,
  refreshing,
  onRefresh,
  scrollProps,
  testID,
}) => {
  const surfaceClass = background === 'muted' ? 'bg-muted' : 'bg-background';
  const contentClass = cn(padded && 'px-4', 'pb-8', contentClassName);

  const inner = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerClassName={contentClass}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1', contentClass)}>{children}</View>
  );

  const body = keyboardAvoid ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  );

  const topConsumed = edges.includes('top');
  return (
    <SafeAreaView
      edges={edges}
      className={cn('flex-1', surfaceClass, className)}
      testID={testID}
    >
      <TopInsetConsumedContext.Provider value={topConsumed}>
        {body}
      </TopInsetConsumedContext.Provider>
    </SafeAreaView>
  );
};
