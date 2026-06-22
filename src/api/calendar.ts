/**
 * Calendar mobile client (thin).
 *
 * The Calendar Module is a READ-ONLY visual layer. All aggregation, event
 * transformation, deterministic state resolution, classification and KPI logic
 * live in ONE place: the backend calendar engine (`GET /calendar/events`).
 * The mobile app — like the web — only issues the request and renders the typed
 * payload. It contains no business logic and no per-source transformation, so
 * mobile and web stay on a single, consistent interpretation of the data
 * (Web Parity Contract).
 */
import { api, unwrap } from './client';

export type CalendarCategory = 'PLANNED' | 'COMPLETED' | 'MISSED' | 'ATTENDANCE';
export type CalendarScope = 'mine' | 'team';
export type CalendarSourceType = 'PLAN_ITEM' | 'ATTENDANCE';
export type CalendarEventClass = 'POINT' | 'DERIVED';

export interface CalendarEventExtendedProps {
  category: CalendarCategory;
  eventClass: CalendarEventClass;
  sourceType: CalendarSourceType;
  status: string;
  statusLabel: string;
  subtitle?: string;
  /** Web deep-link (e.g. `/weekly-plans/:id`); mapped to a mobile route at tap time. */
  deepLink?: string;
  repId?: string;
  repName?: string;
  details?: { label: string; value: string }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD (all-day). */
  start: string;
  end?: string;
  allDay: boolean;
  extendedProps: CalendarEventExtendedProps;
}

export interface CalendarRep {
  id: string;
  name: string;
}

export interface CalendarSummary {
  planned: number;
  completed: number;
  missed: number;
  attendance: number;
  coveragePct: number | null;
}

export interface CalendarPayload {
  events: CalendarEvent[];
  summary: CalendarSummary;
  reps: CalendarRep[];
  scope: CalendarScope;
  range: { from: string; to: string };
}

export interface FetchCalendarParams {
  /** Inclusive visible range, YYYY-MM-DD. */
  from: string;
  to: string;
  scope?: CalendarScope;
  /** Optional rep narrowing for team scope — keeps KPIs aligned with the filter. */
  repIds?: string[];
}

const EMPTY_SUMMARY: CalendarSummary = {
  planned: 0,
  completed: 0,
  missed: 0,
  attendance: 0,
  coveragePct: null,
};

export const calendarApi = {
  /**
   * Backend: `GET /calendar/events` → `{ events, summary, reps, scope, range }`.
   * Returns a fully-shaped payload even on an empty/odd response.
   */
  async events(params: FetchCalendarParams): Promise<CalendarPayload> {
    const { from, to, scope = 'mine', repIds = [] } = params;
    const resp = await api.get('/calendar/events', {
      params: {
        from,
        to,
        scope,
        ...(repIds.length ? { repIds: repIds.join(',') } : {}),
      },
    });
    const payload = unwrap<Partial<CalendarPayload>>(resp);

    return {
      events: Array.isArray(payload?.events) ? (payload!.events as CalendarEvent[]) : [],
      summary: { ...EMPTY_SUMMARY, ...(payload?.summary ?? {}) },
      reps: Array.isArray(payload?.reps) ? (payload!.reps as CalendarRep[]) : [],
      scope: (payload?.scope as CalendarScope) ?? scope,
      range: payload?.range ?? { from, to },
    };
  },
};
