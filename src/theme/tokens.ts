/**
 * Design tokens aligned with pharmaERPFE MUI theme (`colorSchemes.ts`).
 * Used by NativeWind classes AND inline styles (charts, shadows, gradients).
 */

/** Web brand primary — same in light and dark (`#7367F0`). */
const webPrimary = '#7367F0';

export const palette = {
  primary: {
    50: '#f3f2ff',
    100: '#e9e7fd',
    200: '#d4d0fb',
    300: '#b9b2f8',
    400: '#8F85F3',
    500: webPrimary,
    600: '#675DD8',
    700: '#5a52c4',
    800: '#4a44a3',
    900: '#3d3885',
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
  /** Web dark surfaces (`colorSchemes.ts` dark.customColors / background). */
  webDark: {
    body: '#25293C',
    paper: '#2F3349',
    elevated: '#353A52',
    border: '#3A3F57',
    input: '#373B50',
    track: '#3A3F57',
  },
  success: '#28C76F',
  warning: '#FF9F43',
  destructive: '#FF4C51',
  info: '#00BAD1',
  white: '#ffffff',
  transparent: 'transparent',
} as const;

export const semantic = {
  background: '#F8F7FA',
  foreground: '#2F2B3D',
  card: palette.white,
  cardForeground: '#2F2B3D',
  border: '#E6E6E8',
  input: '#E6E6E8',
  inputBackground: '#F8F7FA',
  muted: '#F1F0F2',
  mutedForeground: '#808390',
  primary: webPrimary,
  primaryForeground: palette.white,
  primaryMuted: 'rgba(115, 103, 240, 0.12)',
  secondary: '#F1F0F2',
  secondaryForeground: '#2F2B3D',
  destructive: palette.destructive,
  success: palette.success,
  warning: palette.warning,
  ring: webPrimary,
  info: palette.info,
} as const;

export const semanticDark = {
  background: palette.webDark.body,
  foreground: '#E4E4E7',
  card: palette.webDark.paper,
  cardForeground: '#E4E4E7',
  border: palette.webDark.border,
  input: palette.webDark.border,
  inputBackground: palette.webDark.input,
  muted: palette.webDark.elevated,
  mutedForeground: '#B0B3BC',
  primary: webPrimary,
  primaryForeground: palette.white,
  primaryMuted: 'rgba(115, 103, 240, 0.2)',
  secondary: palette.webDark.input,
  secondaryForeground: '#E4E4E7',
  destructive: palette.destructive,
  success: palette.success,
  warning: palette.warning,
  ring: webPrimary,
  info: palette.info,
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
