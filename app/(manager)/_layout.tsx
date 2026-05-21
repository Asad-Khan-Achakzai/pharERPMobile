/**
 * Manager shell tabs. The Approvals tab shows a pending count badge derived
 * from the combined attendance-request inbox + weekly-plan queue, mirroring
 * the dashboard "Action Center" badge on web.
 */
import * as React from 'react';
import { Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Home, Users, ClipboardCheck, Menu } from 'lucide-react-native';
import { attendanceRequestsApi } from '@/api/attendanceRequests';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { usePermissions } from '@/hooks/usePermissions';

const ATTENDANCE_APPROVE_PERMISSIONS = [
  'admin.access',
  'attendance.approve',
  'attendance.approve.direct',
  'attendance.approve.escalated',
];
const ATTENDANCE_GOVERNANCE_PERMISSIONS = ['admin.access', 'attendance.governance.view'];

function useApprovalsBadge() {
  const { canAny } = usePermissions();
  const canGovernance = canAny(ATTENDANCE_GOVERNANCE_PERMISSIONS);
  const canAttendance = canAny(ATTENDANCE_APPROVE_PERMISSIONS);
  const canPlans = canAny(['weeklyPlans.review', 'weeklyPlans.approve']);

  /**
   * Admin badge has to count the company-wide governance queue (same source
   * the Approvals screen reads). Plain approvers count their personal inbox.
   * This matches what the user sees on web when they're in
   * `AttendanceGovernanceQueueView` vs the team inbox.
   */
  const queue = useQuery({
    queryKey: [
      'attendance',
      'requests',
      canGovernance ? 'governance' : 'inbox',
      'badge',
    ],
    enabled: canGovernance || canAttendance,
    queryFn: () =>
      canGovernance
        ? attendanceRequestsApi.governanceQueue({ sort: 'newest', limit: 300 })
        : attendanceRequestsApi.inbox({ sort: 'newest', limit: 100 }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const plans = useQuery({
    queryKey: ['plans', 'pending', 'badge'],
    enabled: canPlans,
    queryFn: () => weeklyPlansApi.pendingApprovals(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const total = (queue.data?.length ?? 0) + (plans.data?.length ?? 0);
  if (total <= 0) return undefined;
  return total > 99 ? '99+' : String(total);
}

export default function ManagerLayout() {
  const approvalsBadge = useApprovalsBadge();
  const { canSee } = usePermissions();

  const showHome = canSee('manager_home');
  const showAttendance = canSee('manager_attendance');
  const showApprovals = canSee('manager_approvals');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Team',
          href: showHome ? '/(manager)' : null,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          href: showAttendance ? '/(manager)/attendance' : null,
          tabBarIcon: ({ color, size }) => (
            <ClipboardCheck color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: 'Approvals',
          href: showApprovals ? '/(manager)/approvals' : null,
          tabBarBadge: approvalsBadge,
          tabBarIcon: ({ color, size }) => <Users color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size ?? 22} />,
        }}
      />
    </Tabs>
  );
}
