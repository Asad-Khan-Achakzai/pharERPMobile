import * as React from 'react';
import {
  View,
  ScrollView,
  ScrollViewProps,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopInsetConsumedContext } from './topInsetContext';
import { cn } from '@/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  padded?: boolean;
  background?: 'background' | 'muted';
  /** @deprecated Keyboard handling is enabled automatically when scroll=true. */
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
  keyboardAvoid: _keyboardAvoid,
  refreshing,
  onRefresh,
  scrollProps,
  testID,
}) => {
  const { colors } = useTheme();
  const contentClass = cn(padded && 'px-4', 'pb-8', contentClassName);

  const inner = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      contentContainerClassName={contentClass}
      contentContainerStyle={scrollProps?.contentContainerStyle}
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

  const topConsumed = edges.includes('top');
  const surfaceColor = background === 'muted' ? colors.muted : colors.background;
  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: surfaceColor }}
      className={cn(className)}
      testID={testID}
    >
      <TopInsetConsumedContext.Provider value={topConsumed}>
        {inner}
      </TopInsetConsumedContext.Provider>
    </SafeAreaView>
  );
};
