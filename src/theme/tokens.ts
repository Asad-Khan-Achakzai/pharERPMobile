/**
 * Design tokens mirroring the Figma "Enterprise Mobile App Design" theme.css.
 * Used by NativeWind classes AND inline styles (charts, shadows, gradients).
 */

export const palette = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  success: '#10b981',
  warning: '#f59e0b',
  destructive: '#ef4444',
  info: '#3b82f6',
  white: '#ffffff',
  transparent: 'transparent',
} as const;

export const semantic = {
  background: palette.white,
  foreground: palette.slate[900],
  card: palette.white,
  cardForeground: palette.slate[900],
  border: palette.slate[200],
  input: palette.slate[200],
  inputBackground: palette.slate[50],
  muted: palette.slate[50],
  mutedForeground: palette.slate[500],
  primary: palette.primary[600],
  primaryForeground: palette.white,
  secondary: palette.slate[100],
  secondaryForeground: palette.slate[900],
  destructive: palette.destructive,
  success: palette.success,
  warning: palette.warning,
  ring: palette.primary[600],
} as const;

export const radii = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const typography = {
  fontSize: {
    '2xs': 10,
    xs: 12,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 22,
    '3xl': 28,
    '4xl': 34,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

export const motion = {
  duration: {
    fast: 120,
    normal: 200,
    slow: 320,
  },
} as const;

export type Palette = typeof palette;
export type Semantic = typeof semantic;
export type Radii = typeof radii;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
