import * as React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopInsetConsumedContext } from './topInsetContext';
import { useTheme } from '@/theme/ThemeProvider';
import { cn } from '@/utils/cn';

interface FormScreenProps {
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollProps?: Omit<ScrollViewProps, 'children' | 'refreshControl'>;
  /** Extra bottom padding when a sticky footer is shown (default 88). */
  footerReserve?: number;
}

/**
 * Standard layout for forms: fixed header, scrollable fields, optional sticky footer.
 * Keeps the focused field visible when the software keyboard opens.
 */
export function FormScreen({
  header,
  children,
  footer,
  className,
  contentClassName,
  refreshing,
  onRefresh,
  scrollProps,
  footerReserve = 88,
}: FormScreenProps) {
  const { colors } = useTheme();
  const footerPad = footer ? footerReserve : 0;

  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: colors.background }}
      className={className}
    >
      <TopInsetConsumedContext.Provider value={true}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {header}
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            contentContainerClassName={cn('pb-4', contentClassName)}
            contentContainerStyle={{ paddingBottom: footerPad }}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
              ) : undefined
            }
            {...scrollProps}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              style={{
                backgroundColor: colors.background,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <SafeAreaView edges={['bottom']}>
                <View className="px-4 py-3">{footer}</View>
              </SafeAreaView>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </TopInsetConsumedContext.Provider>
    </SafeAreaView>
  );
}
