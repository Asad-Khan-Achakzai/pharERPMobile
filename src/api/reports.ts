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
}

export interface DoctorCoverageReport {
  month: string;
  repId: string;
  coveragePercent: number | null;
  doctorsTracked: number;
  doctors: DoctorCoverageRow[];
}

export const reportsApi = {
  async doctorCoverage(repId: ID, month: string): Promise<DoctorCoverageReport> {
    const resp = await api.get('/reports/mrep/doctor-coverage', {
      params: { repId: String(repId), month },
    });
    return unwrap<DoctorCoverageReport>(resp);
  },
};
