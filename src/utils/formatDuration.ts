/**
 * Normalize `lateMinutes` from the API for display.
 * Backend stores minutes; guard against ms/seconds mis-labelled in edge cases.
 */
export function normalizeLateMinutes(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;

  let v = Math.round(n);

  // Milliseconds (e.g. 300_000 ms ≈ 5 min late)
  if (v >= 60_000) {
    const fromMs = Math.round(v / 60_000);
    if (fromMs >= 1 && fromMs <= 720) return fromMs;
  }

  // Seconds stored in the minutes field (e.g. 300 s = 5 min late)
  if (v >= 120 && v <= 43_200 && v % 60 === 0) {
    const fromSec = v / 60;
    if (fromSec >= 1 && fromSec <= 180 && v > fromSec * 15) return fromSec;
  }

  return v;
}

/** Human-readable lateness for badges and labels (e.g. "5 min", "1h 30m", "2 hr"). */
export function formatLateDuration(rawMinutes: unknown): string {
  const minutes = normalizeLateMinutes(rawMinutes);
  if (minutes <= 0) return '';

  if (minutes < 60) {
    return minutes === 1 ? '1 min' : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return hours === 1 ? '1 hr' : `${hours} hr`;
  }

  if (hours === 0) {
    return `${mins} min`;
  }

  return `${hours}h ${mins}m`;
}
