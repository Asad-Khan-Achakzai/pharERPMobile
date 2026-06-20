import { useTheme } from '@/theme/ThemeProvider';

/** Common icon colors — use instead of hardcoded hex values in screens. */
export function useThemedIcons() {
  const { colors } = useTheme();
  return {
    foreground: colors.foreground,
    muted: colors.mutedForeground,
    primary: colors.primary,
    border: colors.border,
    card: colors.card,
    success: colors.success,
    destructive: colors.destructive,
  };
}
