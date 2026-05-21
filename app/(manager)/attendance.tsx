import * as React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, H2, Subtitle } from '@/ui/Text';
import { Avatar } from '@/ui/Avatar';
import { Badge } from '@/ui/Badge';
import { SkeletonRow } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { dashboardApi } from '@/api/dashboard';

export default function ManagerAttendance() {
  const q = useQuery({
    queryKey: ['dashboard', 'team-summary'],
    queryFn: () => dashboardApi.teamSummary(),
  });

  return (
    <Screen padded={false}>
      <Header title="Team attendance" />
      {q.isLoading ? (
        <View className="px-4">
          <SkeletonRow count={4} />
        </View>
      ) : (q.data?.members ?? []).length === 0 ? (
        <EmptyState title="No team yet" />
      ) : (
        <View className="px-4">
          {q.data!.members!.map((m) => (
            <Card key={m.userId} className="mb-2">
              <View className="flex-row items-center">
                <Avatar name={m.name} />
                <View className="ml-3 flex-1">
                  <Text size="base" weight="semibold" numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Subtitle>{m.attendanceStatus ?? '—'}</Subtitle>
                </View>
                <Badge
                  tone={
                    m.attendanceStatus === 'PRESENT'
                      ? 'success'
                      : m.attendanceStatus === 'LATE'
                        ? 'warning'
                        : 'muted'
                  }
                >
                  {m.attendanceStatus ?? '—'}
                </Badge>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
