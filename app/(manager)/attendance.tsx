import * as React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { MapPin, Users } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { Avatar } from '@/ui/Avatar';
import { Badge } from '@/ui/Badge';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { EmptyState } from '@/ui/EmptyState';
import { PermissionGate } from '@/auth/PermissionGate';
import { attendanceApi, type TeamTodayEmployee } from '@/api/attendance';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCheckInZoneLabel } from '@/utils/formatDistance';
import {
  employeeTeamStatusLabel,
  teamStatusBadgeTone,
} from '@/utils/attendanceStatus';

function formatBusinessDate(ymd?: string): string {
  if (!ymd) return 'Today';
  try {
    const d = parseISO(ymd);
    return isValid(d) ? format(d, 'EEE, d MMM yyyy') : ymd;
  } catch {
    return ymd;
  }
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-[30%] flex-1 items-center rounded-xl bg-muted px-2 py-2">
      <Text size="lg" weight="bold">
        {value}
      </Text>
      <Text size="2xs" tone="muted" className="text-center">
        {label}
      </Text>
    </View>
  );
}

function zoneBadgeTone(status?: TeamTodayEmployee['attendanceLocationStatus']) {
  if (status === 'WITHIN_ZONE') return 'success' as const;
  if (status === 'OUT_OF_ZONE') return 'warning' as const;
  return 'muted' as const;
}

function TeamMemberRow({
  member,
  showZone,
}: {
  member: TeamTodayEmployee;
  showZone: boolean;
}) {
  const statusLabel = employeeTeamStatusLabel(member.status);
  const tone = teamStatusBadgeTone(member.status);
  const zoneLabel = showZone
    ? formatCheckInZoneLabel(member.attendanceLocationStatus, member.distanceFromCheckInPoint, {
        short: true,
      })
    : null;

  const timeLine = [
    member.checkInTime ? `In ${member.checkInTime}` : null,
    member.checkOutTime ? `Out ${member.checkOutTime}` : member.checkInTime ? 'Still in' : null,
    member.lateMinutes != null && member.lateMinutes > 0 ? `${member.lateMinutes}m late` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className="mb-2">
      <View className="flex-row items-center">
        <Avatar name={member.name} />
        <View className="ml-3 flex-1 min-w-0">
          <Text size="base" weight="semibold" numberOfLines={1}>
            {member.name}
          </Text>
          <Text size="xs" tone="muted" numberOfLines={2}>
            {timeLine || member.scheduleLabel || 'No check-in yet'}
          </Text>
          {showZone && member.requiredCheckInLocation?.name && member.checkInTime ? (
            <View className="flex-row items-center mt-1">
              <MapPin size={12} color="#64748b" />
              <Text size="2xs" tone="muted" className="ml-1 flex-1" numberOfLines={1}>
                Expected: {member.requiredCheckInLocation.name}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="items-end gap-1 shrink-0 ml-2">
          <Badge tone={tone}>{statusLabel}</Badge>
          {zoneLabel ? (
            <Badge tone={zoneBadgeTone(member.attendanceLocationStatus)}>{zoneLabel}</Badge>
          ) : showZone && member.checkInTime ? (
            <Text size="2xs" tone="muted">
              Zone n/a
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function TeamAttendanceImpl() {
  const { colors } = useTheme();
  const q = useQuery({
    queryKey: ['attendance', 'team-today'],
    queryFn: () => attendanceApi.teamToday(),
  });

  const employees = q.data?.employees ?? [];
  const summary = q.data?.summary;
  const showZone = q.data?.attendanceSystemMode === 'CHECKIN_POLICY_V2';
  const present = summary?.presentPayroll ?? summary?.present ?? 0;
  const notMarked = summary?.notMarked ?? 0;
  const absent = summary?.absent ?? 0;
  const pendingLate = summary?.pendingLateApproval ?? 0;
  const withinZone = summary?.withinZoneToday ?? 0;
  const outOfZone = summary?.outOfZoneToday ?? 0;

  return (
    <Screen padded={false} scroll={false}>
      <Header back title="Team attendance" subtitle={formatBusinessDate(q.data?.businessDate)} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching && !q.isLoading}
            onRefresh={() => void q.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {q.isLoading ? (
          <ListSkeletonList count={5} variant="avatar" className="px-4 pt-2" />
        ) : q.isError ? (
          <EmptyState
            title="Could not load team attendance"
            description="Pull to refresh or check your connection."
          />
        ) : employees.length === 0 ? (
          <EmptyState
            title="No team members"
            description="No active employees are visible in your attendance scope."
          />
        ) : (
          <View className="px-4 pt-2">
            <Card className="mb-3">
              <View className="flex-row items-center mb-3">
                <Users size={18} color={colors.primary} />
                <Subtitle className="ml-2">Today&apos;s summary</Subtitle>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <SummaryPill label="Present" value={present} />
                <SummaryPill label="Not marked" value={notMarked} />
                <SummaryPill label="Absent" value={absent} />
                {pendingLate > 0 ? (
                  <SummaryPill label="Late pending" value={pendingLate} />
                ) : null}
                {showZone ? (
                  <>
                    <SummaryPill label="In zone" value={withinZone} />
                    <SummaryPill label="Out of zone" value={outOfZone} />
                  </>
                ) : null}
              </View>
              <Text size="xs" tone="muted" className="mt-2">
                {employees.length} team member{employees.length === 1 ? '' : 's'} in scope
                {showZone ? ' · Check-in point tracking enabled' : ''}
              </Text>
            </Card>

            {employees.map((m) => (
              <TeamMemberRow key={m.employeeId} member={m} showZone={showZone} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

export default function ManagerAttendance() {
  return (
    <PermissionGate screen="manager_attendance" title="Team attendance">
      <TeamAttendanceImpl />
    </PermissionGate>
  );
}
