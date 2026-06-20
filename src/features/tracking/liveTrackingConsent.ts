import { kvStore } from '@/data/kvStore';
import { LIVE_TRACKING_CONSENT_VERSION, LIVE_TRACKING_KV } from './constants';

export const LIVE_TRACKING_PRIVACY_COPY = {
  title: 'Turn on location to check in',
  lead: 'Your company uses location to confirm field attendance. Here\u2019s what happens next.',
  bullets: [
    'Location updates stop automatically when you check out.',
    'Managers see your last known position on the live tracking screen — not a continuous live video feed.',
    'You can revoke background access anytime in your device Settings.',
  ],
  androidNote:
    'Android may show a small notification while location is shared in the background.',
  iosNote:
    'iPhone may ask for \u201cAlways Allow\u201d so updates continue when the app is in the background.',
} as const;

export async function hasAcceptedLiveTrackingConsent(): Promise<boolean> {
  const stored = await kvStore.get(LIVE_TRACKING_KV.consentVersion);
  return stored === LIVE_TRACKING_CONSENT_VERSION;
}

export async function setAcceptedLiveTrackingConsent(): Promise<void> {
  await kvStore.set(LIVE_TRACKING_KV.consentVersion, LIVE_TRACKING_CONSENT_VERSION);
}

export async function clearLiveTrackingConsent(): Promise<void> {
  await kvStore.remove(LIVE_TRACKING_KV.consentVersion);
}
