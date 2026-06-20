import * as React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { MapPin } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { EmptyState, ThemedEmptyIcon } from '@/ui/EmptyState';
import { attendanceApi } from '@/api/attendance';
import { PermissionGate } from '@/auth/PermissionGate';
import type { LiveAttendanceStatus, LiveRepLocation } from '@/domain/types';

function attendanceBadge(status: LiveAttendanceStatus): { label: string; tone: 'success' | 'warning' | 'muted' } {
  switch (status) {
    case 'CHECKED_IN':
      return { label: 'Checked in', tone: 'success' };
    case 'CHECKED_OUT':
      return { label: 'Checked out', tone: 'muted' };
    case 'LATE_CHECKIN_PENDING':
      return { label: 'Late check-in pending', tone: 'warning' };
    default:
      return { label: 'Not checked in', tone: 'muted' };
  }
}

function locationSubtitle(item: LiveRepLocation, located: boolean): string {
  if (located) {
    const coords = `${item.lat!.toFixed(5)}, ${item.lng!.toFixed(5)}${
      item.accuracy != null ? ` · ±${Math.round(item.accuracy)}m` : ''
    }`;
    if (item.locationSource === 'checkin') return `${coords} · check-in location`;
    if (item.attendanceStatus === 'CHECKED_OUT') return `${coords} · last ping before check-out`;
    return coords;
  }
  if (item.attendanceStatus === 'CHECKED_OUT') return 'Checked out · no GPS ping in the last 30 minutes';
  if (item.attendanceStatus === 'NOT_CHECKED_IN') return 'Not checked in today';
  return 'Checked in · no GPS ping in the last 30 minutes';
}

export default function LiveTrackingScreen() {
  const list = useQuery({
    queryKey: ['attendance', 'live'],
    queryFn: () => attendanceApi.live(),
    refetchInterval: 60_000,
  });

  return (
    <PermissionGate screen="manager_live" title="Live tracking">
      <Screen padded={false} scroll={false}>
        <Header back title="Live tracking" subtitle="Last known rep locations (updates every ~5 min while checked in)" />
        {list.isLoading ? (
          <ListSkeletonList count={4} variant="split" />
        ) : !list.data?.length ? (
          <EmptyState
            icon={<ThemedEmptyIcon Icon={MapPin} />}
            title="No recent locations"
            description="Reps appear here after check-in when live tracking is enabled."
          />
        ) : (
          <FlatList
            data={list.data}
            keyExtractor={(r) => r.userId}
            contentContainerClassName="px-4 pt-2 pb-8"
            ItemSeparatorComponent={() => <View className="h-2" />}
            refreshControl={
              <RefreshControl refreshing={list.isFetching && !list.isLoading} onRefresh={() => list.refetch()} />
            }
            renderItem={({ item }) => {
              const attendance = attendanceBadge(item.attendanceStatus ?? 'NOT_CHECKED_IN');
              const located = item.lat != null && item.lng != null && item.ageSeconds != null;
              const captured = item.capturedAt ? parseISO(item.capturedAt) : null;
              const checkOutAt = item.checkOutTime ? parseISO(item.checkOutTime) : null;
              return (
                <Card>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text size="base" weight="semibold">
                          {item.name}
                        </Text>
                        <Badge tone={attendance.tone}>{attendance.label}</Badge>
                      </View>
                      <Subtitle>{locationSubtitle(item, located)}</Subtitle>
                      {located ? (
                        <Text size="xs" tone="muted" className="mt-1">
                          {captured && isValid(captured)
                            ? formatDistanceToNow(captured, { addSuffix: true })
                            : 'Unknown time'}
                        </Text>
                      ) : item.attendanceStatus === 'CHECKED_OUT' && checkOutAt && isValid(checkOutAt) ? (
                        <Text size="xs" tone="muted" className="mt-1">
                          Checked out {formatDistanceToNow(checkOutAt, { addSuffix: true })}
                        </Text>
                      ) : null}
                    </View>
                    <Badge tone={located ? (item.ageSeconds! < 600 ? 'success' : 'warning') : 'muted'}>
                      {located
                        ? item.ageSeconds! < 60
                          ? 'Live'
                          : `${Math.round(item.ageSeconds! / 60)}m ago`
                        : 'No location'}
                    </Badge>
                  </View>
                </Card>
              );
            }}
          />
        )}
      </Screen>
    </PermissionGate>
  );
}
