import { api, unwrap } from './client';
import type { ID, Order } from '@/domain/types';

export interface RepDashboard {
  kpi?: {
    visitsCompleted?: number;
    visitsTarget?: number;
    ordersAmount?: number;
    ordersTarget?: number;
    collectionsAmount?: number;
    collectionsTarget?: number;
  };
  today?: {
    plannedCount?: number;
    completedCount?: number;
    pendingCount?: number;
    missedCount?: number;
  };
  attendance?: { status?: string; checkInAt?: string };
  announcements?: { _id: ID; title: string; body?: string; createdAt?: string }[];
}

export interface TeamSummary {
  teamSize?: number;
  activeReps?: number;
  pendingApprovalsCount?: number;
  today?: {
    date?: string;
    visited?: number;
    missed?: number;
    pending?: number;
    total?: number;
    coveragePercent?: number;
    outOfSequenceCount?: number;
    unplannedCount?: number;
  };
}

export const dashboardApi = {
  async home(): Promise<RepDashboard> {
    const resp = await api.get('/dashboard/home');
    return unwrap<RepDashboard>(resp);
  },
  async teamSummary(): Promise<TeamSummary> {
    const resp = await api.get('/dashboard/team-summary');
    return unwrap<TeamSummary>(resp);
  },
  async recentOrders(): Promise<Order[]> {
    const resp = await api.get('/orders', { params: { limit: 10 } });
    return (resp.data.data ?? resp.data) as Order[];
  },
};
