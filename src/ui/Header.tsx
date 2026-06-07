import * as React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from './Text';
import { TopInsetConsumedContext } from './topInsetContext';
import { cn } from '@/utils/cn';
import { useAppBack } from '@/navigation/useAppBack';
import { useTheme } from '@/theme/ThemeProvider';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  className?: string;
  /**
   * Override the auto-detected safe-area behavior. By default the Header
   * reads `TopInsetConsumedContext` (set by `<Screen edges={['top']} />`)
   * and only pads itself with the status-bar inset when that context is
   * `false` (i.e. it's the topmost element on the screen).
   */
  insideSafeArea?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  back,
  onBack,
  right,
  className,
  insideSafeArea,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const topConsumedByParent = React.useContext(TopInsetConsumedContext);
  const appBack = useAppBack();

  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    appBack();
  }, [onBack, appBack]);
  /**
   * Push the chrome down past the status bar / notch when this Header is
   * the topmost element on the screen. Otherwise the back button can
   * render behind the clock and be impossible to tap.
   */
  const consumed = insideSafeArea ?? topConsumedByParent;
  const topPad = consumed ? 0 : insets.top;
  return (
    <View
      style={{
        paddingTop: topPad,
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}
      className={cn('flex-row items-center px-2 py-3', className)}
    >
      {back ? (
        <Pressable
          accessibilityLabel="back"
          onPress={handleBack}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center"
        >
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>
      ) : (
        <View className="w-2" />
      )}
      <View className="flex-1 px-1">
        {title ? (
          <Text size="lg" weight="semibold" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text size="xs" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="ml-2">{right}</View> : null}
    </View>
  );
};
