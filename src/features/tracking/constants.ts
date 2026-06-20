/** Task name registered with expo-task-manager + expo-location. */
export const BACKGROUND_LOCATION_TASK = 'pharma-live-location-tracking';

export const LIVE_TRACKING_KV = {
  consentVersion: 'liveTracking.consentVersion',
  active: 'liveTracking.active',
  lastHeartbeatAt: 'liveTracking.lastHeartbeatAt',
  maxAccuracyMeters: 'liveTracking.maxAccuracyMeters',
  heartbeatIntervalMs: 'liveTracking.heartbeatIntervalMs',
} as const;

/** Default max GPS accuracy (meters) for live tracking heartbeats. */
export const DEFAULT_MAX_ACCURACY_METERS = 150;

export const LIVE_TRACKING_FOREGROUND_NOTIFICATION = {
  title: 'PharmaERP field tracking',
  body: 'Sharing your location with your manager while you are checked in.',
} as const;
