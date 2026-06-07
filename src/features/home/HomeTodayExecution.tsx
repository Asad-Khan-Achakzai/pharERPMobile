import * as React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Calendar, ChevronRight, ClipboardList, ShoppingBag } from 'lucide-react-native';
import { Card } from '@/ui/Card';
import { Text, H3 } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { ProgressBar } from '@/ui/ProgressBar';
import { SkeletonRow } from '@/ui/Skeleton';
import { masterQueries } from '@/data/masterQueries';
import { planItemsApi } from '@/api/planItems';
import { ordersApi } from '@/api/orders';
import { usePermissions } from '@/hooks/usePermissions';

function todayYmd(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Personal execution summary — route, orders today, pending plan visits.
 * Never shows team or company aggregates.
 */
export const HomeTodayExecution: React.FC = () => {
  const router = useRouter();
  const { can, canSee } = usePermissions();
  const ymd = todayYmd();

  const showRoute = canSee('rep_visits');
  const showOrders = can('orders.view');

  const todayPlan = useQuery({
    queryKey: ['plan-items', 'today', ymd],
    queryFn: () => masterQueries.planItemsToday(),
    enabled: showRoute,
  });

  const ordersToday = useQuery({
    queryKey: ['orders', 'today', ymd],
    queryFn: () =>
      ordersApi.list({
        dateFrom: ymd,
        dateTo: ymd,
        limit: 100,
        page: 1,
      }),
    enabled: showOrders,
  });

  if (!showRoute && !showOrders) return null;

  const summary = todayPlan.data?.summary;
  const pendingVisits = summary?.pending ?? 0;
  const completedVisits = summary?.visited ?? 0;
  const missedVisits = summary?.missed ?? 0;
  const plannedTotal = summary?.total ?? 0;

  const orderRows = ordersToday.data?.items ?? [];
  const ordersCount = orderRows.length;
  const ordersAmount = orderRows.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);

  const loading = (showRoute && todayPlan.isLoading) || (showOrders && ordersToday.isLoading);

  return (
    <View className="mt-2">
      {loading ? (
        <View className="px-4">
          <SkeletonRow count={2} />
        </View>
      ) : null}

      {showRoute ? (
        <Card className="mx-4 mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1 min-w-0 mr-2">
              <Calendar size={18} color="#0f172a" />
              <H3 className="ml-2" numberOfLines={1}>
                Today&apos;s route
              </H3>
            </View>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(tabs)/visits')}
              rightIcon={<ChevronRight size={16} color="#2563eb" />}
            >
              <Text tone="primary" size="sm" weight="medium">
                Open
              </Text>
            </Button>
          </View>
          <View className="flex-row items-center justify-between mb-2">
            <Text size="sm" tone="muted">
              {completedVisits} / {plannedTotal} completed
            </Text>
            {missedVisits > 0 ? (
              <Text size="sm" tone="warning" weight="medium">
                {missedVisits} missed
              </Text>
            ) : (
              <Text size="sm" tone="muted">
                {pendingVisits} pending
              </Text>
            )}
          </View>
          {plannedTotal > 0 ? (
            <ProgressBar value={completedVisits} max={plannedTotal} tone="primary" />
          ) : (
            <Text size="xs" tone="muted">
              No planned visits for today.
            </Text>
          )}
        </Card>
      ) : null}

      {showOrders ? (
        <Card className="mx-4 mt-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <ShoppingBag size={18} color="#0f172a" />
              <H3 className="ml-2">Orders today</H3>
            </View>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(tabs)/orders')}
              rightIcon={<ChevronRight size={16} color="#2563eb" />}
            >
              <Text tone="primary" size="sm" weight="medium">
                See all
              </Text>
            </Button>
          </View>
          <Text size="lg" weight="bold" className="mt-2">
            {ordersCount} order{ordersCount === 1 ? '' : 's'}
          </Text>
          <Text size="sm" tone="muted">
            Rs {Math.round(ordersAmount).toLocaleString()} total
          </Text>
        </Card>
      ) : null}

      {showRoute && pendingVisits > 0 ? (
        <Card className="mx-4 mt-3">
          <View className="flex-row items-center">
            <ClipboardList size={18} color="#2563eb" />
            <View className="ml-2 flex-1">
              <Text size="sm" weight="semibold">
                {pendingVisits} visit{pendingVisits === 1 ? '' : 's'} still pending
              </Text>
              <Text size="xs" tone="muted">
                Complete your route from the Visits tab.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}
    </View>
  );
};
