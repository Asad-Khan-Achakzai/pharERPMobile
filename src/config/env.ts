/**
 * Mobile env config. Default flags follow the plan's "Always-Present UI,
 * Optional Backend Capability" rule: media is OFF until backend confirms via
 * /sync/server-config. These act as initial defaults pre-bootstrap.
 */
import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  apiVersion?: string;
  sentryDsn?: string;
  enableMediaUpload?: boolean;
  enableVisitPhotos?: boolean;
  enableExpenseReceipts?: boolean;
  enableProductMedia?: boolean;
  buildChannel?: 'development' | 'preview' | 'production';
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
}

export const env = {
  apiBaseUrl:
    // extra.apiBaseUrl ??
    // process.env.EXPO_PUBLIC_API_BASE_URL ??
    'http://192.168.100.247:5001',
  apiVersion: extra.apiVersion ?? process.env.EXPO_PUBLIC_API_VERSION ?? 'v1',
  sentryDsn: extra.sentryDsn ?? process.env.EXPO_PUBLIC_SENTRY_DSN,
  buildChannel:
    extra.buildChannel ??
    (process.env.EXPO_PUBLIC_BUILD_CHANNEL as Extra['buildChannel']) ??
    'development',
  /**
   * Media defaults. UI shells stay always-mounted regardless; these only
   * control whether the underlying actions fire or show "feature not enabled
   * yet" feedback. Server-config overrides these at runtime.
   */
  flags: {
    enableMediaUpload: bool(
      extra.enableMediaUpload ?? process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOAD,
      false,
    ),
    enableVisitPhotos: bool(
      extra.enableVisitPhotos ?? process.env.EXPO_PUBLIC_ENABLE_VISIT_PHOTOS,
      false,
    ),
    enableExpenseReceipts: bool(
      extra.enableExpenseReceipts ??
        process.env.EXPO_PUBLIC_ENABLE_EXPENSE_RECEIPTS,
      false,
    ),
    enableProductMedia: bool(
      extra.enableProductMedia ??
        process.env.EXPO_PUBLIC_ENABLE_PRODUCT_MEDIA,
      false,
    ),
  },
} as const;

export type Env = typeof env;
export type MediaFlags = Env['flags'];
