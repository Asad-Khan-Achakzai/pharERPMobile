import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';
import { flushOutbox } from '@/data/syncEngine';
import { useAuthStore } from '@/state/authStore';
import { DEFAULT_MAX_ACCURACY_METERS } from './constants';
import { ensureForegroundLocationPermission } from './backgroundLocationService';
import { sendHeartbeatDirect } from './liveTrackingHeartbeat';

export { DEFAULT_MAX_ACCURACY_METERS };

export interface HeartbeatPayload {
  lat: number;
  lng: number;
  accuracy: number | null;
  capturedAt: string;
  clientUuid: string;
}

export function passesAccuracyFilter(
  accuracy: number | null | undefined,
  maxMeters = DEFAULT_MAX_ACCURACY_METERS,
): boolean {
  if (accuracy == null || Number.isNaN(accuracy)) return true;
  return accuracy <= maxMeters;
}

export async function captureHeartbeatLocation(
  maxAccuracyMeters = DEFAULT_MAX_ACCURACY_METERS,
): Promise<HeartbeatPayload | null> {
  try {
    const granted = await ensureForegroundLocationPermission();
    if (!granted) return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const accuracy = pos.coords.accuracy ?? null;
    if (!passesAccuracyFilter(accuracy, maxAccuracyMeters)) {
      return null;
    }

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy,
      capturedAt: new Date(pos.timestamp).toISOString(),
      clientUuid: uuidv4(),
    };
  } catch {
    return null;
  }
}

/**
 * Send heartbeat online or buffer in outbox_core for offline retry.
 */
export async function sendHeartbeat(payload: HeartbeatPayload): Promise<boolean> {
  try {
    const sent = await sendHeartbeatDirect(payload);
    if (!sent) void flushOutbox();
    return sent;
  } catch {
    return false;
  }
}

/** One immediate foreground ping (e.g. right after check-in). Never throws. */
export async function tickLiveTracking(): Promise<void> {
  try {
    const cfg = useAuthStore.getState().serverConfig;
    if (!cfg?.liveTracking?.enabled) return;

    const maxAccuracy = cfg.liveTracking.maxAccuracyMeters ?? DEFAULT_MAX_ACCURACY_METERS;
    const payload = await captureHeartbeatLocation(maxAccuracy);
    if (!payload) return;
    await sendHeartbeat(payload);
  } catch {
    /* location or network unavailable — must not crash check-in */
  }
}
