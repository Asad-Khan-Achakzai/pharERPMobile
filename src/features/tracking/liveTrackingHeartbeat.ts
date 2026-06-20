import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { env } from '@/config/env';
import { secureStore } from '@/data/secureStore';
import { kvStore } from '@/data/kvStore';
import { getSessionScopeFromStorage } from '@/data/sessionLocalData';
import { getDb } from '@/data/db';
import { LIVE_TRACKING_KV } from './constants';
import type { HeartbeatPayload } from './liveTracking';

function apiBaseUrl(): string {
  return `${env.apiBaseUrl.replace(/\/$/, '')}/api/${env.apiVersion}`;
}

async function getOrCreateDeviceId(): Promise<string> {
  const stored = await secureStore.get('deviceId');
  if (stored) return stored;
  const fresh = uuidv4();
  await secureStore.set('deviceId', fresh);
  return fresh;
}

async function enqueueHeartbeatOffline(body: Record<string, unknown>, clientUuid: string): Promise<void> {
  const scope = await getSessionScopeFromStorage();
  if (!scope) return;
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT OR REPLACE INTO outbox_core
     (client_uuid, user_id, company_id, feature, action, method, path, body_json, state, attempts, enqueued_at, next_attempt_at)
     VALUES (?, ?, ?, 'live-tracking', 'heartbeat', 'POST', '/attendance/heartbeat', ?, 'PENDING', 0, ?, 0)`,
    [clientUuid, scope.userId, scope.companyId, JSON.stringify(body), now],
  );
}

/**
 * Send a heartbeat using persisted credentials — safe for background tasks
 * where Zustand may not be hydrated.
 */
export async function sendHeartbeatDirect(payload: HeartbeatPayload): Promise<boolean> {
  const accessToken = await secureStore.get('accessToken');
  if (!accessToken) return false;

  const body = {
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy,
    capturedAt: payload.capturedAt,
    clientUuid: payload.clientUuid,
  };

  try {
    const deviceId = await getOrCreateDeviceId();
    await axios.post(`${apiBaseUrl()}/attendance/heartbeat`, body, {
      timeout: 20000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Device-Id': deviceId,
        'X-Client': 'pharerp-mobile',
        'X-Client-Version': '1.0.0',
        'X-Client-Uuid': payload.clientUuid,
      },
    });
    await kvStore.set(LIVE_TRACKING_KV.lastHeartbeatAt, String(Date.now()));
    return true;
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
    if (status === 422 || status === 403 || status === 400 || status === 401) return false;
    await enqueueHeartbeatOffline(body, payload.clientUuid);
    return false;
  }
}

export async function shouldThrottleHeartbeat(minIntervalMs: number): Promise<boolean> {
  const raw = await kvStore.get(LIVE_TRACKING_KV.lastHeartbeatAt);
  if (!raw) return false;
  const last = Number(raw);
  if (Number.isNaN(last)) return false;
  return Date.now() - last < minIntervalMs;
}
