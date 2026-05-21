import {
  addWeeks,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfWeek,
} from 'date-fns';
import type { PlanItem, WeeklyPlan } from '@/domain/types';

export type WeekPreset = 'current' | 'next';

export function weekRangeForPreset(preset: WeekPreset) {
  const base = preset === 'next' ? addWeeks(new Date(), 1) : new Date();
  const start = startOfWeek(base, { weekStartsOn: 1 });
  const end = endOfWeek(base, { weekStartsOn: 1 });
  return {
    preset,
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
    label: `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`,
    shortLabel: format(start, 'd MMM'),
  };
}

export function enumerateWeekYmd(startIso: string, endIso: string): string[] {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (!isValid(start) || !isValid(end)) return [];
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(format(cur, 'yyyy-MM-dd'));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function planWeekKey(plan: WeeklyPlan): string {
  return plan.weekStartDate?.slice(0, 10) ?? '';
}

export function findPlanForWeek(plans: WeeklyPlan[], weekStartYmd: string): WeeklyPlan | undefined {
  return plans.find((p) => planWeekKey(p) === weekStartYmd);
}

export function itemCount(plan: WeeklyPlan): number {
  if (plan.planItemsCount != null && plan.planItemsCount > 0) return plan.planItemsCount;
  return plan.totalPlanItems ?? plan.plannedDoctorCount ?? 0;
}

export function planUpdatedLabel(
  plan: WeeklyPlan & { updatedAt?: string; submittedAt?: string | null }
): string {
  const raw = plan.updatedAt ?? plan.submittedAt;
  if (!raw) return '';
  const d = parseISO(raw);
  return isValid(d) ? format(d, 'd MMM, HH:mm') : '';
}

export function itemYmd(item: PlanItem): string {
  const raw = item.date;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
  return isValid(d) ? format(d, 'yyyy-MM-dd') : '—';
}

export function groupPlanItemsByDate(items: PlanItem[]): Map<string, PlanItem[]> {
  const map = new Map<string, PlanItem[]>();
  for (const it of items) {
    const ymd = itemYmd(it);
    if (ymd === '—') continue;
    const list = map.get(ymd) ?? [];
    list.push(it);
    map.set(ymd, list);
  }
  for (const [k, list] of map) {
    map.set(
      k,
      [...list].sort(
        (a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0)
      )
    );
  }
  return map;
}

export type PlanHubSection = {
  key: string;
  title: string;
  plans: WeeklyPlan[];
};

export function buildPlanHubSections(
  plans: WeeklyPlan[],
  currentStart: string,
  nextStart: string
): PlanHubSection[] {
  const current = findPlanForWeek(plans, currentStart);
  const next = findPlanForWeek(plans, nextStart);

  const drafts: WeeklyPlan[] = [];
  const pending: WeeklyPlan[] = [];
  const active: WeeklyPlan[] = [];
  const rejected: WeeklyPlan[] = [];
  const other: WeeklyPlan[] = [];

  for (const p of plans) {
    const key = planWeekKey(p);
    if (key === currentStart || key === nextStart) continue;
    if (p.rejectedReason) {
      rejected.push(p);
      continue;
    }
    switch (p.status) {
      case 'DRAFT':
        drafts.push(p);
        break;
      case 'SUBMITTED':
        pending.push(p);
        break;
      case 'ACTIVE':
      case 'COMPLETED':
      case 'REVIEWED':
        active.push(p);
        break;
      default:
        other.push(p);
    }
  }

  const sections: PlanHubSection[] = [];

  if (current) {
    sections.push({ key: 'current', title: 'Current week', plans: [current] });
  }
  if (next) {
    sections.push({ key: 'next', title: 'Next week', plans: [next] });
  }
  if (drafts.length) sections.push({ key: 'draft', title: 'Draft plans', plans: drafts });
  if (pending.length) sections.push({ key: 'pending', title: 'Pending approval', plans: pending });
  if (active.length) sections.push({ key: 'active', title: 'Approved / active', plans: active });
  if (rejected.length) sections.push({ key: 'rejected', title: 'Needs revision', plans: rejected });
  if (other.length) sections.push({ key: 'other', title: 'Other', plans: other });

  return sections;
}
