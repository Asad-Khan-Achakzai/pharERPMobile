import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { kvStore } from '@/data/kvStore';
import {
  BACKGROUND_LOCATION_TASK,
  DEFAULT_MAX_ACCURACY_METERS,
  LIVE_TRACKING_FOREGROUND_NOTIFICATION,
  LIVE_TRACKING_KV,
} from './constants';

export interface LiveTrackingPermissionResult {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
}

const isExpoGo = Constants.appOwnership === 'expo';

/** Background GPS requires a custom native build — never available in Expo Go. */
export function canUseBackgroundLocation(): boolean {
  return !isExpoGo;
}

/** Foreground location only — safe for check-in; never requests background. */
export async function ensureForegroundLocationPermission(): Promise<boolean> {
  try {
    const foreground = await Location.getForegroundPermissionsAsync();
    if (foreground.status === 'granted') return true;
    const requested = await Location.requestForegroundPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

export async function ensureLiveTrackingPermissions(): Promise<LiveTrackingPermissionResult> {
  const foregroundGranted = await ensureForegroundLocationPermission();
  if (!foregroundGranted) {
    return { foregroundGranted: false, backgroundGranted: false };
  }

  if (!canUseBackgroundLocation()) {
    return { foregroundGranted: true, backgroundGranted: false };
  }

  try {
    const background = await Location.getBackgroundPermissionsAsync();
    if (background.status === 'granted') {
      return { foregroundGranted: true, backgroundGranted: true };
    }
    const requested = await Location.requestBackgroundPermissionsAsync();
    return {
      foregroundGranted: true,
      backgroundGranted: requested.status === 'granted',
    };
  } catch {
    return { foregroundGranted: true, backgroundGranted: false };
  }
}

export async function isBackgroundLiveTrackingRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function startBackgroundLiveTracking(options: {
  heartbeatIntervalMs: number;
  maxAccuracyMeters?: number;
}): Promise<{ started: boolean; backgroundGranted: boolean }> {
  if (!canUseBackgroundLocation()) {
    return { started: false, backgroundGranted: false };
  }

  const perms = await ensureLiveTrackingPermissions();
  if (!perms.foregroundGranted) {
    return { started: false, backgroundGranted: false };
  }

  if (!perms.backgroundGranted) {
    return { started: false, backgroundGranted: false };
  }

  const intervalMs = Math.max(60_000, options.heartbeatIntervalMs);
  const maxAccuracy = options.maxAccuracyMeters ?? DEFAULT_MAX_ACCURACY_METERS;

  await kvStore.set(LIVE_TRACKING_KV.active, '1');
  await kvStore.set(LIVE_TRACKING_KV.heartbeatIntervalMs, String(intervalMs));
  await kvStore.set(LIVE_TRACKING_KV.maxAccuracyMeters, String(maxAccuracy));

  const already = await isBackgroundLiveTrackingRunning();
  if (already) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  try {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: intervalMs,
      distanceInterval: 0,
      deferredUpdatesInterval: intervalMs,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: LIVE_TRACKING_FOREGROUND_NOTIFICATION.title,
        notificationBody: LIVE_TRACKING_FOREGROUND_NOTIFICATION.body,
        notificationColor: '#2563eb',
      },
    });
  } catch {
    return { started: false, backgroundGranted: perms.backgroundGranted };
  }

  return { started: true, backgroundGranted: perms.backgroundGranted };
}

export async function stopBackgroundLiveTracking(): Promise<void> {
  await kvStore.set(LIVE_TRACKING_KV.active, '0');
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (running) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {
    /* task may not be registered on web */
  }
}

/** iOS/Android system settings deep link is platform-specific; return human hint. */
export function backgroundPermissionHint(): string {
  if (Platform.OS === 'ios') {
    return 'Choose "Always Allow" in Settings → PharmaERP → Location so tracking continues when the app is in the background.';
  }
  return 'Choose "Allow all the time" in app location settings so tracking continues when the app is in the background.';
}
