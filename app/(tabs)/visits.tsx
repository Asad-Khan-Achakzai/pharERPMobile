import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Calendar, MapPin, UserPlus } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Tabs } from '@/ui/Tabs';
import { PressableCard } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { FAB } from '@/ui/FAB';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { EmptyState, ThemedEmptyIcon } from '@/ui/EmptyState';
import { masterQueries } from '@/data/masterQueries';
import { SyncStatusBadge } from '@/ui/SyncStatusBadge';
import type { SyncUiState } from '@/data/localEntities';
import { usePermissions } from '@/hooks/usePermissions';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { useToast } from '@/ui/Toast';
import type { Doctor, PlanItem, PlanItemStatus } from '@/domain/types';

type FilterKey = 'pending' | 'visited' | 'missed';

const TAB_TO_STATUS: Record<FilterKey, PlanItemStatus> = {
  pending: 'PENDING',
  visited: 'VISITED',
  missed: 'MISSED',
};

const statusTone: Record<PlanItemStatus, 'success' | 'warning' | 'default'> = {
  VISITED: 'success',
  MISSED: 'warning',
  PENDING: 'default',
};

function getDoctor(item: PlanItem): Pick<Doctor, '_id' | 'name' | 'specialization'> | null {
  if (item.doctorId && typeof item.doctorId === 'object') {
    return item.doctorId as Pick<Doctor, '_id' | 'name' | 'specialization'>;
  }
  return null;
}

function getDoctorId(item: PlanItem): string | null {
  if (!item.doctorId) return null;
  return typeof item.doctorId === 'string' ? item.doctorId : item.doctorId._id;
}

export default function VisitsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { canDo } = usePermissions();
  const canStartPlanned = canDo('visit_start_planned');
  const canStartUnplanned = canDo('visit_start_unplanned');
  const pushWithReturn = usePushWithReturn();
  const [tab, setTab] = React.useState<FilterKey>('pending');
  const today = useQuery({
    queryKey: ['plan-items', 'today'],
    queryFn: () => masterQueries.planItemsToday(),
  });

  const allItems: PlanItem[] = today.data?.items ?? [];
  const items = allItems.filter((p) => p.status === TAB_TO_STATUS[tab]);
  const counts = today.data?.summary ?? {
    pending: allItems.filter((p) => p.status === 'PENDING').length,
    visited: allItems.filter((p) => p.status === 'VISITED').length,
    missed: allItems.filter((p) => p.status === 'MISSED').length,
    total: allItems.length,
  };

  return (
    <Screen padded={false} scroll={false}>
      <Header title="Today" subtitle="Plan execution" />
      <Tabs
        value={tab}
        onChange={(k) => setTab(k as FilterKey)}
        items={[
          { key: 'pending', label: 'Planned', count: counts.pending },
          { key: 'visited', label: 'Done', count: counts.visited },
          { key: 'missed', label: 'Missed', count: counts.missed },
        ]}
      />
      {today.isLoading ? (
        <ListSkeletonList count={5} variant="visit" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ThemedEmptyIcon Icon={Calendar} />}
          title="Nothing here yet"
          description={
            tab === 'pending'
              ? 'No planned visits remaining today.'
              : tab === 'visited'
                ? 'You have not completed any visits yet.'
                : 'No missed visits today.'
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it._id}
          refreshing={today.isRefetching}
          onRefresh={() => today.refetch()}
          contentContainerClassName="px-4 pt-2 pb-24"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => {
            const doctor = getDoctor(item);
            const doctorId = getDoctorId(item);
            return (
              <PressableCard
                onPress={() => {
                  if (!doctorId) return;
                  if (item.status === 'PENDING' && !canStartPlanned) {
                    toast.show({
                      type: 'warning',
                      title: 'Permission required',
                      message:
                        'Your role cannot mark visits. Ask your administrator to grant weeklyPlans.markVisit.',
                    });
                    return;
                  }
                  pushWithReturn(`/visit/${item._id}`);
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text size="base" weight="medium" numberOfLines={1}>
                      {doctor?.name ?? item.title ?? 'Visit'}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text size="xs" tone="muted" numberOfLines={1}>
                        {doctor?.specialization ?? item.plannedTime ?? ''}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Badge tone={statusTone[item.status] ?? 'default'}>{item.status}</Badge>
                    <SyncStatusBadge
                      state={(item as { _syncState?: SyncUiState })._syncState}
                      className="mt-1"
                    />
                  </View>
                </View>
                {item.notes ? (
                  <View className="flex-row items-center mt-2">
                    <MapPin size={12} color="#64748b" />
                    <Text size="xs" tone="muted" className="ml-1" numberOfLines={1}>
                      {item.notes}
                    </Text>
                  </View>
                ) : null}
              </PressableCard>
            );
          }}
        />
      )}
      {canStartUnplanned ? (
        <FAB
          onPress={() => pushWithReturn('/visit/unplanned')}
          icon={<UserPlus size={22} color="#fff" />}
          accessibilityLabel="Start unplanned visit"
        />
      ) : null}
    </Screen>
  );
}
