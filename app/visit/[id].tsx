import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { PermissionGate } from '@/auth/PermissionGate';
import { ActiveVisitScreen } from '@/features/visit/ActiveVisitScreen';
import { masterQueries } from '@/data/masterQueries';
import { Screen } from '@/ui/Screen';
import { ListSkeletonList } from '@/ui/listCardSkeletons';

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useQuery({
    queryKey: ['plan-items', 'today'],
    queryFn: () => masterQueries.planItemsToday(),
  });
  const item = today.data?.items.find((p) => p._id === id);
  if (today.isLoading || !item) {
    return (
      <Screen padded={false} edges={['bottom']}>
        <ListSkeletonList count={4} variant="visit" className="px-4 pt-4" />
      </Screen>
    );
  }
  return (
    <View className="flex-1">
      <PermissionGate screen="visit_active" title="Visit">
        <ActiveVisitScreen
          mode="planned"
          planItem={item}
          nextPendingPlanItemId={today.data?.nextPlanItem?._id ?? null}
        />
      </PermissionGate>
    </View>
  );
}
