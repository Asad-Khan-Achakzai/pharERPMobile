import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { kvStore } from '@/data/kvStore';
import { BACKGROUND_LOCATION_TASK, LIVE_TRACKING_KV } from './constants';
import { passesAccuracyFilter } from './liveTracking';
import { sendHeartbeatDirect, shouldThrottleHeartbeat } from './liveTrackingHeartbeat';
import type { HeartbeatPayload } from './liveTracking';

async function isLiveTrackingSessionActive(): Promise<boolean> {
  const active = await kvStore.get(LIVE_TRACKING_KV.active);
  return active === '1';
}

async function readMaxAccuracyMeters(): Promise<number> {
  const raw = await kvStore.get(LIVE_TRACKING_KV.maxAccuracyMeters);
  const n = raw != null ? Number(raw) : 150;
  return Number.isFinite(n) ? n : 150;
}

async function readHeartbeatIntervalMs(): Promise<number> {
  const raw = await kvStore.get(LIVE_TRACKING_KV.heartbeatIntervalMs);
  const n = raw != null ? Number(raw) : 5 * 60 * 1000;
  return Number.isFinite(n) && n > 0 ? n : 5 * 60 * 1000;
}

function payloadFromLocation(
  location: Location.LocationObject,
  clientUuid: string,
): HeartbeatPayload {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy ?? null,
    capturedAt: new Date(location.timestamp).toISOString(),
    clientUuid,
  };
}

/**
 * Must be imported at app root (module scope) so the background runtime can find it.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  if (!(await isLiveTrackingSessionActive())) return;

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locations?.length) return;

  const intervalMs = await readHeartbeatIntervalMs();
  if (await shouldThrottleHeartbeat(intervalMs)) return;

  const maxAccuracy = await readMaxAccuracyMeters();
  const latest = locations[locations.length - 1];
  const payload = payloadFromLocation(latest, uuidv4());

  if (!passesAccuracyFilter(payload.accuracy, maxAccuracy)) return;
  await sendHeartbeatDirect(payload);
});
