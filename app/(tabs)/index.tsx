import * as React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Card } from '@/ui/Card';
import { Text, H3 } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { SkeletonRow } from '@/ui/Skeleton';
import { HomeHero } from '@/features/home/HomeHero';
import { KPIGrid } from '@/features/home/KPIGrid';
import { CheckInCard } from '@/features/attendance/CheckInCard';
import { OutboxFooter } from '@/features/sync/OutboxFooter';
import { CompanyGate } from '@/features/onboarding/CompanyGate';
import { dashboardApi } from '@/api/dashboard';

export default function HomeScreen() {
  const router = useRouter();
  const home = useQuery({
    queryKey: ['dashboard', 'home'],
    queryFn: () => dashboardApi.home(),
  });

  return (
    <CompanyGate>
      <Screen
        padded={false}
        refreshing={home.isRefetching}
        onRefresh={() => home.refetch()}
      >
        <HomeHero />
        <OutboxFooter />
        <CheckInCard />
        <View className="mt-2">
          {home.isLoading ? (
            <View className="px-4">
              <SkeletonRow count={2} />
            </View>
          ) : (
            <KPIGrid data={home.data} />
          )}
        </View>

        <Card className="mx-4 mt-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <CalendarIcon size={18} color="#0f172a" />
              <H3 className="ml-2">Today&apos;s route</H3>
            </View>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(tabs)/visits')}
              rightIcon={<ChevronRight size={16} color="#2563eb" />}
            >
              <Text tone="primary" size="sm" weight="medium">
                See all
              </Text>
            </Button>
          </View>
          <View className="flex-row items-center justify-between">
            <Text size="sm" tone="muted">
              {home.data?.today?.completedCount ?? 0} / {home.data?.today?.plannedCount ?? 0} visits completed
            </Text>
            <Text size="sm" tone="warning" weight="medium">
              {home.data?.today?.missedCount ?? 0} missed
            </Text>
          </View>
        </Card>

        <Card className="mx-4 mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Bell size={18} color="#0f172a" />
              <H3 className="ml-2">Announcements</H3>
            </View>
          </View>
          {(home.data?.announcements ?? []).length === 0 ? (
            <Text size="sm" tone="muted">
              No announcements right now.
            </Text>
          ) : (
            home.data!.announcements!.slice(0, 3).map((a) => (
              <View key={a._id} className="mb-2">
                <Text size="sm" weight="medium">
                  {a.title}
                </Text>
                {a.body ? (
                  <Text size="xs" tone="muted" numberOfLines={2}>
                    {a.body}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </Card>
      </Screen>
    </CompanyGate>
  );
}
