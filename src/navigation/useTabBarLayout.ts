import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Icon + label row height (excluding system bottom inset). */
export const TAB_BAR_BODY_HEIGHT = 56;

/**
 * Bottom tab metrics for edge-to-edge Android (and iOS home indicator).
 * `edgeToEdgeEnabled` draws behind the system nav bar — tab bar must pad by `insets.bottom`.
 */
export function useTabBarLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return {
    bottomInset,
    totalHeight: TAB_BAR_BODY_HEIGHT + bottomInset,
    /** Position floating actions above the tab bar. */
    fabOffset: TAB_BAR_BODY_HEIGHT + bottomInset + 16,
    /** Stack screens without a tab bar. */
    stackFabOffset: bottomInset + 16,
  };
}
