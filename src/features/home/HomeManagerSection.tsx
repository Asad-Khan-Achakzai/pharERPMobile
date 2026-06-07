import * as React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, ClipboardList, Users } from 'lucide-react-native';
import { Card } from '@/ui/Card';
import { Text, H3 } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { SkeletonRow } from '@/ui/Skeleton';
import { dashboardApi } from '@/api/dashboard';
import { attendanceRequestsApi } from '@/api/attendanceRequests';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { attendanceApi } from '@/api/attendance';
import { usePermissions } from '@/hooks/usePermissions';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';

/** Manager-only block — never shown without explicit manager permissions. */
const MANAGER_HOME_PERMISSIONS = [
  'weeklyPlans.review',
  'attendance.approve',
  'team.view',
  'admin.access',
] as const;

const APPROVAL_PERMISSIONS = [
  'weeklyPlans.review',
  'weeklyPlans.approve',
  'attendance.approve',
  'attendance.approve.direct',
  'attendance.approve.escalated',
  'attendance.governance.view',
  'admin.access',
];

const TEAM_ATTENDANCE_PERMISSIONS = [
  'attendance.view',
  'attendance.viewTeam',
  'attendance.viewCompany',
  'admin.access',
];

export const HomeManagerSection: React.FC = () => {
  const pushWithReturn = usePushWithReturn();
  const { canAny, can } = usePermissions();

  const showSection = canAny([...MANAGER_HOME_PERMISSIONS]);
  const showApprovals = canAny(APPROVAL_PERMISSIONS);
  const showTeamVisits = can('team.view') || can('admin.access');
  const showTeamAttendance = canAny(TEAM_ATTENDANCE_PERMISSIONS) && showTeamVisits;

  const useGovernance = can('admin.access') || can('attendance.governance.view');

  const teamSummary = useQuery({
    queryKey: ['dashboard', 'team-summary'],
    queryFn: () => dashboardApi.teamSummary(),
    enabled: showSection && showTeamVisits,
  });

  const teamAttendance = useQuery({
    queryKey: ['attendance', 'team-today'],
    queryFn: () => attendanceApi.teamToday(),
    enabled: showSection && showTeamAttendance,
  });

  const planApprovals = useQuery({
    queryKey: ['weekly-plans', 'pending-approvals', 'count'],
    queryFn: () => weeklyPlansApi.pendingApprovals(),
    enabled: showSection && showApprovals && (can('weeklyPlans.review') || can('weeklyPlans.approve')),
  });

  const attendanceApprovals = useQuery({
    queryKey: ['attendance', 'requests', useGovernance ? 'governance' : 'inbox', 'home'],
    queryFn: () =>
      useGovernance
        ? attendanceRequestsApi.governanceQueue({ limit: 100 })
        : attendanceRequestsApi.inbox({ limit: 100 }),
    enabled:
      showSection &&
      showApprovals &&
      canAny([
        'attendance.approve',
        'attendance.approve.direct',
        'attendance.approve.escalated',
        'attendance.governance.view',
        'admin.access',
      ]),
  });

  if (!showSection) return null;

  const planCount = planApprovals.data?.length ?? 0;
  const attendanceCount = attendanceApprovals.data?.length ?? 0;
  const pendingApprovalTotal = planCount + attendanceCount;

  const visitToday = teamSummary.data?.today;
  const missedTeamVisits = visitToday?.missed ?? 0;

  const attSummary = teamAttendance.data?.summary;
  const present = attSummary?.presentPayroll ?? attSummary?.present ?? 0;
  const notMarked = attSummary?.notMarked ?? 0;
  const absent = attSummary?.absent ?? 0;

  const loading =
    (showTeamVisits && teamSummary.isLoading) ||
    (showTeamAttendance && teamAttendance.isLoading) ||
    (showApprovals && (planApprovals.isLoading || attendanceApprovals.isLoading));

  return (
    <View className="mt-1">
      <View className="px-4 pt-2 pb-1">
        <Text size="xs" tone="muted" weight="medium">
          Team (manager)
        </Text>
      </View>

      {loading ? (
        <View className="px-4">
          <SkeletonRow count={2} />
        </View>
      ) : null}

      {showApprovals && pendingApprovalTotal > 0 ? (
        <Card className="mx-4 mt-2">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <ClipboardList size={18} color="#0f172a" />
              <H3 className="ml-2">Pending approvals</H3>
            </View>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => pushWithReturn('/(manager)/approvals')}
              rightIcon={<ChevronRight size={16} color="#2563eb" />}
            >
              <Text tone="primary" size="sm" weight="medium">
                Review
              </Text>
            </Button>
          </View>
          <Text size="sm" tone="muted">
            {planCount > 0 ? `${planCount} weekly plan${planCount === 1 ? '' : 's'}` : null}
            {planCount > 0 && attendanceCount > 0 ? ' · ' : null}
            {attendanceCount > 0
              ? `${attendanceCount} attendance request${attendanceCount === 1 ? '' : 's'}`
              : null}
          </Text>
        </Card>
      ) : showApprovals ? (
        <Card className="mx-4 mt-2">
          <Text size="sm" tone="muted">
            No pending approvals in your queue.
          </Text>
        </Card>
      ) : null}

      {showTeamAttendance && teamAttendance.data ? (
        <Card className="mx-4 mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Users size={18} color="#0f172a" />
              <H3 className="ml-2">Team today</H3>
            </View>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => pushWithReturn('/(manager)/attendance')}
              rightIcon={<ChevronRight size={16} color="#2563eb" />}
            >
              <Text tone="primary" size="sm" weight="medium">
                Details
              </Text>
            </Button>
          </View>
          <View className="flex-row flex-wrap gap-x-4 gap-y-1">
            <Text size="sm">
              <Text weight="semibold">{present}</Text>
              <Text size="sm" tone="muted">
                {' '}
                present
              </Text>
            </Text>
            <Text size="sm">
              <Text weight="semibold">{notMarked}</Text>
              <Text size="sm" tone="muted">
                {' '}
                not marked
              </Text>
            </Text>
            <Text size="sm">
              <Text weight="semibold">{absent}</Text>
              <Text size="sm" tone="muted">
                {' '}
                absent
              </Text>
            </Text>
          </View>
        </Card>
      ) : null}

      {showTeamVisits && missedTeamVisits > 0 ? (
        <Card className="mx-4 mt-3 border-warning/30 bg-warning/5">
          <View className="flex-row items-start">
            <AlertTriangle size={18} color="#f59e0b" />
            <View className="ml-2 flex-1">
              <Text size="sm" weight="semibold">
                {missedTeamVisits} missed team visit{missedTeamVisits === 1 ? '' : 's'} today
              </Text>
              <Text size="xs" tone="muted" className="mt-0.5">
                Check team coverage in Visits or Team attendance.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}
    </View>
  );
};
