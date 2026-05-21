import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { cn } from '@/utils/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  /** Snap index on open; `-1` = highest snap point. */
  initialSnapIndex?: number;
  title?: string;
  subtitle?: string;
  scrollable?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  snapPoints = ['50%', '85%'],
  initialSnapIndex = 0,
  title,
  subtitle,
  scrollable,
  footer,
  children,
  className,
}) => {
  const ref = React.useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const snapKey = snapPoints.join('|');
  const memoSnapPoints = React.useMemo(() => snapPoints, [snapKey]);
  const snapIndex =
    initialSnapIndex < 0
      ? Math.max(0, memoSnapPoints.length + initialSnapIndex)
      : Math.min(initialSnapIndex, Math.max(0, memoSnapPoints.length - 1));

  React.useEffect(() => {
    if (open) {
      ref.current?.snapToIndex(snapIndex);
    } else {
      ref.current?.close();
    }
  }, [open, snapIndex]);

  const handleSheetClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderFooter = React.useCallback(
    (props: BottomSheetFooterProps) =>
      footer ? (
        <BottomSheetFooter {...props} bottomInset={insets.bottom}>
          <View className="px-4 pt-2 pb-2 bg-background border-t border-border">
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer, insets.bottom],
  );

  const header =
    title || subtitle ? (
      <View className="px-4 pt-1 pb-2">
        {title ? (
          <Text size="lg" weight="semibold">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text size="xs" tone="muted" className={title ? 'mt-1' : undefined}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    ) : null;

  const scrollPadding = footer ? 'pb-4' : 'pb-8';

  return (
    <View style={styles.host} pointerEvents={open ? 'box-none' : 'none'}>
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={memoSnapPoints}
        enablePanDownToClose
        onClose={handleSheetClose}
        backdropComponent={renderBackdrop}
        footerComponent={footer ? renderFooter : undefined}
        backgroundStyle={{ backgroundColor: '#ffffff' }}
        handleIndicatorStyle={{ backgroundColor: '#cbd5e1' }}
      >
        {header}
        {scrollable ? (
          <BottomSheetScrollView
            contentContainerClassName={cn('px-4', scrollPadding, className)}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetView className={cn('px-4 flex-1', scrollPadding, className)}>
            {children}
          </BottomSheetView>
        )}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
});
