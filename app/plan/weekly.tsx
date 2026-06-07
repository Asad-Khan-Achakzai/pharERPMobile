/**
 * Weekly plans hub — field operations entry
 */
import * as React from 'react';
import { View, SectionList } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarRange, Plus } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { PressableCard } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { SkeletonRow } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { FAB } from '@/ui/FAB';
import { masterQueries } from '@/data/masterQueries';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { ApiError } from '@/api/client';
import { useToast } from '@/ui/Toast';
import { PermissionGate } from '@/auth/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';
import { hasAnyPermission } from '@/auth/rbac';
import { useAuthStore } from '@/state/authStore';
import { CreatePlanSheet } from '@/features/weeklyPlan/CreatePlanSheet';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import {
  buildPlanHubSections,
  findPlanForWeek,
  itemCount,
  planUpdatedLabel,
  weekRangeForPreset,
  type WeekPreset,
} from '@/features/weeklyPlan/weekUtils';
import type { WeeklyPlan } from '@/domain/types';

const tone: Record<string, 'muted' | 'warning' | 'success' | 'danger' | 'default'> = {
  DRAFT: 'muted',
  SUBMITTED: 'warning',
  ACTIVE: 'success',
  COMPLETED: 'default',
  REVIEWED: 'default',
};

function statusLabel(status: string, rejected?: string | null): string {
  if (rejected) return 'Needs revision';
  if (status === 'SUBMITTED') return 'Pending approval';
  if (status === 'ACTIVE') return 'Active';
  return status;
}

function PlanRow({ plan, showRep }: { plan: WeeklyPlan; showRep?: boolean }) {
  const pushWithReturn = usePushWithReturn();
  const rep =
    plan.medicalRepId && typeof plan.medicalRepId === 'object'
      ? plan.medicalRepId.name
      : null;
  const updated = planUpdatedLabel(plan as WeeklyPlan & { updatedAt?: string });

  return (
    <PressableCard className="mb-2" onPress={() => pushWithReturn(`/plan/${plan._id}`)}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          {showRep && rep ? (
            <Text size="xs" tone="muted" numberOfLines={1}>
              {rep}
            </Text>
          ) : null}
          <Text size="base" weight="semibold">
            {format(parseISO(plan.weekStartDate), 'd MMM')} –{' '}
            {format(parseISO(plan.weekEndDate), 'd MMM yyyy')}
          </Text>
          <Subtitle>
            {itemCount(plan)} planned visits{updated ? ` · Updated ${updated}` : ''}
          </Subtitle>
        </View>
        <Badge tone={tone[plan.status] ?? 'default'}>
          {statusLabel(plan.status, plan.rejectedReason)}
        </Badge>
      </View>
    </PressableCard>
  );
}

function WeeklyPlanImpl() {
  const toast = useToast();
  const pushWithReturn = usePushWithReturn();
  const user = useAuthStore((s) => s.user);
  const { canDo } = usePermissions();
  const canCreate = canDo('weekly_plan_create');
  const canSeeTeam = hasAnyPermission(user, [
    'team.view',
    'team.viewAllReports',
    'admin.access',
  ]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [teamView, setTeamView] = React.useState(false);

  const currentWeek = weekRangeForPreset('current');
  const nextWeek = weekRangeForPreset('next');

  const list = useQuery({
    queryKey: ['plans', teamView ? 'team' : 'mine'],
    queryFn: () => masterQueries.weeklyPlansList(teamView ? 'team' : 'mine'),
  });

  const plans = list.data ?? [];

  const openWeek = useMutation({
    mutationFn: async (preset: WeekPreset) => {
      const range = weekRangeForPreset(preset);
      const existing = findPlanForWeek(plans, range.start);
      if (existing) return existing;
      return weeklyPlansApi.create({
        weekStartDate: range.start,
        weekEndDate: range.end,
        status: 'DRAFT',
        medicalRepId: user?._id,
      });
    },
    onSuccess: (plan) => pushWithReturn(`/plan/${plan._id}`),
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not open week',
      });
    },
  });

  const sections = buildPlanHubSections(plans, currentWeek.start, nextWeek.start).map(
    (s) => ({
      title: s.title,
      data: s.plans,
    })
  );

  const quickCreate = canCreate && !teamView;

  return (
    <Screen padded={false} scroll={false}>
      <Header
        back
        title="Weekly plans"
        subtitle="Schedule your field week"
      />

      {canSeeTeam ? (
        <View className="px-4 pt-2 flex-row">
          <Button
            size="sm"
            variant={!teamView ? 'primary' : 'outline'}
            className="mr-2"
            onPress={() => setTeamView(false)}
          >
            My plans
          </Button>
          <Button
            size="sm"
            variant={teamView ? 'primary' : 'outline'}
            onPress={() => setTeamView(true)}
          >
            Team
          </Button>
        </View>
      ) : null}

      {quickCreate ? (
        <View className="px-4 pt-3 flex-row">
          <Button
            size="sm"
            className="flex-1 mr-2"
            loading={openWeek.isPending}
            onPress={() => openWeek.mutate('current')}
          >
            This week
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            loading={openWeek.isPending}
            onPress={() => openWeek.mutate('next')}
          >
            Next week
          </Button>
        </View>
      ) : null}

      {list.isLoading ? (
        <View className="px-4 pt-2">
          <SkeletonRow count={4} />
        </View>
      ) : sections.length === 0 ? (
        <EmptyState
          icon={<CalendarRange size={28} color="#94a3b8" />}
          title="No weekly plans yet"
          description="Start planning this week in a few taps."
          actionLabel={canCreate ? 'Create weekly plan' : undefined}
          onAction={canCreate ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(p) => p._id}
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
          contentContainerClassName="px-4 pt-2 pb-28"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section: { title } }) => (
            <Text size="xs" weight="semibold" tone="muted" className="mb-2 mt-2 uppercase">
              {title}
            </Text>
          )}
          renderItem={({ item }) => (
            <PlanRow plan={item} showRep={teamView} />
          )}
        />
      )}

      {canCreate && !teamView ? (
        <FAB
          onPress={() => setCreateOpen(true)}
          icon={<Plus size={22} color="#fff" />}
          accessibilityLabel="Create weekly plan"
        />
      ) : null}

      <CreatePlanSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        existingPlans={plans}
      />
    </Screen>
  );
}

export default function WeeklyPlan() {
  return (
    <PermissionGate screen="weekly_plan" title="Weekly plans">
      <WeeklyPlanImpl />
    </PermissionGate>
  );
}
