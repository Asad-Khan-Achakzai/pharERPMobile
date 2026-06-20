import { api, unwrap } from './client';
import type { ID } from '@/domain/types';

export interface DoctorCoverageRow {
  doctorId: string;
  doctorName: string;
  target: number | null;
  actualVisits: number;
  gap: number | null;
  coverageStatus?: string;
  ownershipLabel?: string;
  band?: string;
}

export interface DoctorCoverageReport {
  month: string;
  repId: string;
  coveragePercent: number | null;
  doctorsTracked: number;
  doctors: DoctorCoverageRow[];
}

export interface MrepOverviewRep {
  repId: string;
  name?: string | null;
  email?: string | null;
  employeeCode?: string | null;
  month: string;
  coverage?: {
    coveragePercent?: number | null;
    doctorsTracked?: number | null;
    doctors?: DoctorCoverageRow[];
  };
  planExecution?: {
    visited?: number;
    missed?: number;
    pending?: number;
    visitCompletionPercent?: number | null;
    adherencePercent?: number | null;
  };
  target?: {
    salesTarget?: number | null;
    achievedSales?: number | null;
    packsTarget?: number | null;
    achievedPacks?: number | null;
    salesAchievementPercent?: number | null;
  };
  ordersInPeriod?: {
    grossRevenue?: number;
    orderCount?: number;
  };
  totalGrossSalesTp?: number;
  attendanceScorePercent?: number | null;
}

export interface MrepMonthlyOverview {
  month: string;
  reps: MrepOverviewRep[];
}

export interface TerritoryCompareChild {
  territoryId: string;
  name: string;
  code?: string | null;
  kind?: string;
  coveragePercent?: number | null;
  doctorsTracked?: number | null;
}

export interface TerritoryCompareReport {
  month: string;
  parentTerritoryId: string;
  parentName: string;
  children: TerritoryCompareChild[];
}

export const reportsApi = {
  async doctorCoverage(repId: ID, month: string): Promise<DoctorCoverageReport> {
    const resp = await api.get('/reports/mrep/doctor-coverage', {
      params: { repId: String(repId), month },
    });
    return unwrap<DoctorCoverageReport>(resp);
  },

  async monthlyOverview(params?: {
    month?: string;
    repId?: string;
  }): Promise<MrepMonthlyOverview> {
    const resp = await api.get('/reports/mrep/monthly-overview', { params });
    return unwrap<MrepMonthlyOverview>(resp);
  },

  async territoryCompare(params: {
    month: string;
    parentTerritoryId: string;
  }): Promise<TerritoryCompareReport> {
    const resp = await api.get('/reports/mrep/territory-compare', { params });
    return unwrap<TerritoryCompareReport>(resp);
  },
};
