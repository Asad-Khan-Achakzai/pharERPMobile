import type { Href } from 'expo-router';

/** Query param carrying the screen to restore when the user taps Back. */
export const RETURN_TO_PARAM = 'returnTo';

export function normalizeReturnTo(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return undefined;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** Append `returnTo` so detail screens can navigate back to the list caller. */
export function appendReturnTo(path: string, returnTo: string): Href {
  const encoded = encodeURIComponent(returnTo);
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${RETURN_TO_PARAM}=${encoded}` as Href;
}
