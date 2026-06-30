import { format, isValid, parseISO } from 'date-fns';
import type { CpByDay, CpDayKey } from '@/domain/types';

/** Aligns with backend CP_DAY_KEYS / Luxon weekday (Mon-first). */
export const CP_DAY_KEYS: CpDayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export type CpDay = { ymd: string; dayKey: CpDayKey; label: string };

/** JS getDay(): 0=Sun..6=Sat → CP_DAY_KEYS (Mon-first). */
export function dayKeyForYmd(ymd: string): CpDayKey {
  const d = parseISO(ymd);
  const js = isValid(d) ? d.getDay() : 1;
  return CP_DAY_KEYS[(js + 6) % 7];
}

export function enumerateCpDays(startIso: string, endIso: string): CpDay[] {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (!isValid(start) || !isValid(end)) return [];
  const out: CpDay[] = [];
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 31) {
    const ymd = format(cur, 'yyyy-MM-dd');
    out.push({ ymd, dayKey: dayKeyForYmd(ymd), label: format(cur, 'EEEE d MMM') });
    cur.setDate(cur.getDate() + 1);
    guard += 1;
  }
  return out;
}

/** Normalize populated/raw cpByDay into { dayKey: cpId } ids only. */
export function cpByDayToIds(raw: CpByDay | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const key of CP_DAY_KEYS) {
    const val = raw[key];
    if (!val) continue;
    out[key] = typeof val === 'object' ? String((val as { _id: string })._id) : String(val);
  }
  return out;
}
