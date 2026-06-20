import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Users, Activity, ShoppingBag } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, H2, Subtitle, Label } from '@/ui/Text';
import { Avatar } from '@/ui/Avatar';
import { Badge } from '@/ui/Badge';
import { ManagerDashboardSkeleton } from '@/ui/listCardSkeletons';
import { EmptyState } from '@/ui/EmptyState';
import { dashboardApi } from '@/api/dashboard';
import { useAuthStore } from '@/state/authStore';

export default function ManagerHome() {
  const user = useAuthStore((s) => s.user);
  const q = useQuery({
    queryKey: ['dashboard', 'team-summary'],
    queryFn: () => dashboardApi.teamSummary(),
  });

  return (
    <Screen padded={false} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <Header back title={user?.name ?? 'Manager'} subtitle="Team overview" />
      {q.isLoading ? (
        <ManagerDashboardSkeleton />
      ) : (
        <>
          <View className="px-4 flex-row">
            <Card className="flex-1 mr-2">
              <View className="flex-row items-center mb-1">
                <Users size={16} color="#2563eb" />
                <Subtitle className="ml-1.5">Team</Subtitle>
              </View>
              <H2>{q.data?.teamSize ?? 0}</H2>
              <Text size="xs" tone="muted">
                {q.data?.presentCount ?? 0} present today
              </Text>
            </Card>
            <Card className="flex-1">
              <View className="flex-row items-center mb-1">
                <Activity size={16} color="#10b981" />
                <Subtitle className="ml-1.5">Visits</Subtitle>
              </View>
              <H2>{q.data?.visitsToday ?? 0}</H2>
              <Text size="xs" tone="muted">
                across team today
              </Text>
            </Card>
          </View>
          <View className="px-4 mt-2 flex-row">
            <Card className="flex-1 mr-2">
              <View className="flex-row items-center mb-1">
                <ShoppingBag size={16} color="#f59e0b" />
                <Subtitle className="ml-1.5">Orders today</Subtitle>
              </View>
              <H2>Rs {Math.round(q.data?.ordersTodayAmount ?? 0).toLocaleString()}</H2>
            </Card>
            <Card className="flex-1">
              <View className="flex-row items-center mb-1">
                <Users size={16} color="#ef4444" />
                <Subtitle className="ml-1.5">Laggards</Subtitle>
              </View>
              <H2>{q.data?.laggards?.length ?? 0}</H2>
              <Text size="xs" tone="muted">
                under target today
              </Text>
            </Card>
          </View>
          <View className="px-4 mt-3">
            <Label>Team members</Label>
          </View>
          {(q.data?.members ?? []).length === 0 ? (
            <EmptyState title="No team yet" description="Add reps from the web admin." />
          ) : (
            <FlatList
              data={q.data!.members}
              keyExtractor={(m) => m.userId}
              scrollEnabled={false}
              contentContainerClassName="px-4 pt-1 pb-8"
              ItemSeparatorComponent={() => <View className="h-2" />}
              renderItem={({ item }) => (
                <Card>
                  <View className="flex-row items-center">
                    <Avatar name={item.name} />
                    <View className="flex-1 ml-3">
                      <Text size="base" weight="semibold" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Subtitle>
                        {item.attendanceStatus ?? '—'} ·{' '}
                        {item.visitsCompleted ?? 0} visits ·{' '}
                        Rs {Math.round(item.ordersAmount ?? 0).toLocaleString()}
                      </Subtitle>
                    </View>
                    <Badge tone={item.attendanceStatus === 'PRESENT' ? 'success' : 'warning'}>
                      {item.attendanceStatus ?? '—'}
                    </Badge>
                  </View>
                </Card>
              )}
            />
          )}
        </>
      )}
    </Screen>
  );
}
