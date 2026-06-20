import type { semantic, semanticDark } from '@/theme/tokens';

export type ThemeColors = typeof semantic | typeof semanticDark;

/** Maps semantic tokens to NativeWind CSS variables for className-based surfaces. */
export function themeVars(colors: ThemeColors) {
  return {
    '--color-background': colors.background,
    '--color-foreground': colors.foreground,
    '--color-card': colors.card,
    '--color-card-foreground': colors.cardForeground,
    '--color-muted': colors.muted,
    '--color-muted-foreground': colors.mutedForeground,
    '--color-border': colors.border,
    '--color-input': colors.input,
    '--color-input-background': colors.inputBackground,
    '--color-secondary': colors.secondary,
    '--color-secondary-foreground': colors.secondaryForeground,
    '--color-primary': colors.primary,
    '--color-primary-foreground': colors.primaryForeground,
    '--color-primary-muted': colors.primaryMuted,
  } as const;
}
