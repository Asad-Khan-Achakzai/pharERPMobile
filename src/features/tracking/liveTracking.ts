import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as Location from 'expo-location';
import { api, ApiError } from '@/api/client';
import { outbox } from '@/data/outbox';
import { flushOutbox } from '@/data/syncEngine';
import { useAuthStore } from '@/state/authStore';

export const DEFAULT_MAX_ACCURACY_METERS = 150;

export interface HeartbeatPayload {
  lat: number;
  lng: number;
  accuracy: number | null;
  capturedAt: string;
  clientUuid: string;
}

export function passesAccuracyFilter(
  accuracy: number | null | undefined,
  maxMeters = DEFAULT_MAX_ACCURACY_METERS
): boolean {
  if (accuracy == null || Number.isNaN(accuracy)) return true;
  return accuracy <= maxMeters;
}

export async function captureHeartbeatLocation(
  maxAccuracyMeters = DEFAULT_MAX_ACCURACY_METERS
): Promise<HeartbeatPayload | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

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
}

/**
 * Send heartbeat online or buffer in outbox_core for offline retry.
 */
export async function sendHeartbeat(payload: HeartbeatPayload): Promise<boolean> {
  const body = {
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy,
    capturedAt: payload.capturedAt,
    clientUuid: payload.clientUuid,
  };

  try {
    await api.post('/attendance/heartbeat', body, {
      headers: { 'X-Client-Uuid': payload.clientUuid },
    });
    return true;
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    if (status === 422 || status === 403 || status === 400) {
      return false;
    }
    await outbox.enqueueCore({
      feature: 'live-tracking',
      action: 'heartbeat',
      method: 'POST',
      path: '/attendance/heartbeat',
      body,
      clientUuid: payload.clientUuid,
    });
    void flushOutbox();
    return false;
  }
}

export async function tickLiveTracking(): Promise<void> {
  const cfg = useAuthStore.getState().serverConfig;
  if (!cfg?.liveTracking?.enabled) return;

  const maxAccuracy = cfg.liveTracking.maxAccuracyMeters ?? DEFAULT_MAX_ACCURACY_METERS;
  const payload = await captureHeartbeatLocation(maxAccuracy);
  if (!payload) return;
  await sendHeartbeat(payload);
}
