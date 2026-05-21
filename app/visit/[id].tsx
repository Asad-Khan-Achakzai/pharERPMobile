import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { ActiveVisitScreen } from '@/features/visit/ActiveVisitScreen';
import { planItemsApi } from '@/api/planItems';
import { Screen } from '@/ui/Screen';
import { SkeletonRow } from '@/ui/Skeleton';

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useQuery({
    queryKey: ['plan-items', 'today'],
    queryFn: () => planItemsApi.listToday(),
  });
  const item = today.data?.items.find((p) => p._id === id);
  if (today.isLoading || !item) {
    return (
      <Screen padded>
        <SkeletonRow count={5} />
      </Screen>
    );
  }
  return (
    <View className="flex-1">
      <ActiveVisitScreen
        mode="planned"
        planItem={item}
        nextPendingPlanItemId={today.data?.nextPlanItem?._id ?? null}
      />
    </View>
  );
}
