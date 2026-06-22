/**
 * Calendar category presentation metadata (mobile).
 *
 * Mirrors the web `CALENDAR_CATEGORY_*` maps so both clients label and colour
 * events identically. Categories themselves are derived server-side; this is a
 * pure presentation concern (labels, badge tones, dot colours).
 */
import type { CalendarCategory, CalendarSummary } from '@/api/calendar';
import type { BadgeTone } from '@/ui/Badge';
import { semantic } from '@/theme/tokens';

export const CALENDAR_CATEGORIES: CalendarCategory[] = [
  'PLANNED',
  'COMPLETED',
  'MISSED',
  'ATTENDANCE',
];

export const CALENDAR_CATEGORY_LABEL: Record<CalendarCategory, string> = {
  PLANNED: 'Planned',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  ATTENDANCE: 'Attendance',
};

/** Badge tone per category (matches web ThemeColor → MUI mapping). */
export const CALENDAR_CATEGORY_TONE: Record<CalendarCategory, BadgeTone> = {
  PLANNED: 'primary',
  COMPLETED: 'success',
  MISSED: 'danger',
  ATTENDANCE: 'muted',
};

/** Solid dot colour per category for the month grid cells. */
export const CALENDAR_CATEGORY_DOT: Record<CalendarCategory, string> = {
  PLANNED: semantic.primary,
  COMPLETED: semantic.success,
  MISSED: semantic.destructive,
  ATTENDANCE: semantic.mutedForeground,
};

/** Category → summary count key (single interpretation, shared with the KPI chips). */
export const CALENDAR_CATEGORY_SUMMARY_KEY: Record<CalendarCategory, keyof CalendarSummary> = {
  PLANNED: 'planned',
  COMPLETED: 'completed',
  MISSED: 'missed',
  ATTENDANCE: 'attendance',
};
