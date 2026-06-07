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
import { SkeletonRow } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { attendanceApi } from '@/api/attendance';
import { PermissionGate } from '@/auth/PermissionGate';

export default function LiveTrackingScreen() {
  const list = useQuery({
    queryKey: ['attendance', 'live'],
    queryFn: () => attendanceApi.live(),
    refetchInterval: 60_000,
  });

  return (
    <PermissionGate screen="manager_live" title="Live tracking">
      <Screen padded={false} scroll={false}>
        <Header back title="Live tracking" subtitle="Last known rep locations" />
        {list.isLoading ? (
          <View className="px-4">
            <SkeletonRow count={4} />
          </View>
        ) : !list.data?.length ? (
          <EmptyState
            icon={<MapPin size={28} color="#94a3b8" />}
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
              const located = item.lat != null && item.lng != null && item.ageSeconds != null;
              const captured = item.capturedAt ? parseISO(item.capturedAt) : null;
              return (
                <Card>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text size="base" weight="semibold">
                        {item.name}
                      </Text>
                      <Subtitle>
                        {located
                          ? `${item.lat!.toFixed(5)}, ${item.lng!.toFixed(5)}${
                              item.accuracy != null ? ` · ±${Math.round(item.accuracy)}m` : ''
                            }`
                          : 'Not checked in or no GPS ping in the last 30 minutes'}
                      </Subtitle>
                      {located ? (
                        <Text size="xs" tone="muted" className="mt-1">
                          {captured && isValid(captured)
                            ? formatDistanceToNow(captured, { addSuffix: true })
                            : 'Unknown time'}
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
