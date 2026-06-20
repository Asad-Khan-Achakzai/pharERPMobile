import { format, parse, subMonths, addMonths } from 'date-fns';
import type { DoctorCoverageRow, MrepOverviewRep } from '@/api/reports';

export function currentMonthYmd(): string {
  return format(new Date(), 'yyyy-MM');
}

export function formatMonthLabel(yyyyMm: string): string {
  try {
    return format(parse(yyyyMm, 'yyyy-MM', new Date()), 'MMMM yyyy');
  } catch {
    return yyyyMm;
  }
}

export function shiftMonth(yyyyMm: string, delta: number): string {
  const base = parse(yyyyMm, 'yyyy-MM', new Date());
  const next = delta < 0 ? subMonths(base, Math.abs(delta)) : addMonths(base, delta);
  return format(next, 'yyyy-MM');
}

export function fmtPkr(value: number | null | undefined): string {
  const n = Math.round(Number(value) || 0);
  return `Rs ${n.toLocaleString('en-PK')}`;
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value))}%`;
}

export function countDoctorsMetCoverage(doctors: DoctorCoverageRow[] | undefined): number {
  if (!doctors?.length) return 0;
  return doctors.filter((d) => d.target != null && d.target > 0 && d.actualVisits >= d.target).length;
}

export function workingDaysLabel(summary: {
  presentDays?: number;
  absentDays?: number;
  halfDays?: number;
  leaveDays?: number;
} | null | undefined): string {
  if (!summary) return '—';
  const present = Number(summary.presentDays) || 0;
  const half = Number(summary.halfDays) || 0;
  const absent = Number(summary.absentDays) || 0;
  const leave = Number(summary.leaveDays) || 0;
  const worked = present + half * 0.5;
  const total = present + absent + half + leave;
  if (!total) return '—';
  return `${worked % 1 === 0 ? worked : worked.toFixed(1)} / ${total}`;
}

export function achievementTone(pct: number): 'success' | 'warning' | 'danger' | 'primary' {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'warning';
  return 'danger';
}

export function teamAggregate(reps: MrepOverviewRep[]) {
  let salesTarget = 0;
  let achievedSales = 0;
  let grossTp = 0;
  let covSum = 0;
  let covN = 0;
  for (const r of reps) {
    salesTarget += Number(r.target?.salesTarget) || 0;
    achievedSales += Number(r.target?.achievedSales) || 0;
    grossTp += Number(r.totalGrossSalesTp) || 0;
    const c = r.coverage?.coveragePercent;
    if (c != null) {
      covSum += Number(c);
      covN += 1;
    }
  }
  const achievementPct =
    salesTarget > 0 ? Math.round((achievedSales / salesTarget) * 100) : null;
  return {
    teamSize: reps.length,
    salesTarget,
    achievedSales,
    remaining: Math.max(0, salesTarget - achievedSales),
    achievementPct,
    grossTp,
    avgCoverage: covN ? Math.round(covSum / covN) : null,
  };
}
