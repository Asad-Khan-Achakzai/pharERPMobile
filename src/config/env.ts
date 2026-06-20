/**
 * Mobile env config. Default flags follow the plan's "Always-Present UI,
 * Optional Backend Capability" rule: media is OFF until backend confirms via
 * /sync/server-config. These act as initial defaults pre-bootstrap.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

import { API_BASE_URL } from '../../env.defaults';

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

/**
 * Physical devices on the same Wi‑Fi use the Mac LAN IP from env.defaults.js.
 * Simulators/emulators need host aliases — LAN IPs often fail inside the VM.
 *
 * In __DEV__, env.defaults.js wins over extra.apiBaseUrl so Expo Go picks up URL
 * changes without reinstalling an EAS build (preview APKs bake the production URL).
 */
function resolveConfiguredBaseUrl(): string {
  if (__DEV__) {
    return (
      process.env.EXPO_PUBLIC_API_BASE_URL ??
      API_BASE_URL ??
      extra.apiBaseUrl ??
      ''
    );
  }
  return (
    extra.apiBaseUrl ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    API_BASE_URL
  );
}

function resolveApiBaseUrl(): string {
  const configured = resolveConfiguredBaseUrl();

  if (Device.isDevice) return configured;

  try {
    const url = new URL(configured.replace(/\/$/, ''));
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');

    if (Platform.OS === 'android') {
      // Android Studio AVD: 10.0.2.2 → host machine localhost
      if (
        url.hostname.startsWith('192.168.') ||
        url.hostname.startsWith('10.') ||
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1'
      ) {
        return `${url.protocol}//10.0.2.2:${port}`;
      }
    }

    if (Platform.OS === 'ios') {
      // iOS Simulator shares the Mac network stack — localhost is simplest
      if (url.hostname.startsWith('192.168.') || url.hostname.startsWith('10.')) {
        return `${url.protocol}//localhost:${port}`;
      }
    }
  } catch {
    /* keep configured value */
  }

  return configured;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
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
