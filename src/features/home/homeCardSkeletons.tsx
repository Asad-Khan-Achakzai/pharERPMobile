import * as React from 'react';
import { View } from 'react-native';
import { Card } from '@/ui/Card';
import { Skeleton } from '@/ui/Skeleton';
import { useFlags } from '@/hooks/useFlags';

/** Mirrors default CheckInCard layout (Start your day · not checked in). */
export const CheckInCardSkeleton: React.FC = () => {
  const flags = useFlags();

  return (
    <Card className="mx-4 my-2">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 min-w-0 flex-row items-center">
          <Skeleton height={40} width={40} radius={20} className="mr-3 shrink-0" />
          <View className="flex-1 min-w-0">
            <Skeleton height={16} width="58%" />
            <View className="h-1" />
            <Skeleton height={12} width="88%" />
          </View>
        </View>
      </View>

      <Skeleton height={112} radius={16} className="mt-3" />

      <View className="mt-3 mb-3">
        <Skeleton height={14} width="44%" className="mb-1.5" />
        <Skeleton height={48} width="100%" radius={12} />
      </View>

      {flags.attendanceGeofenceEnabled ? (
        <View className="mt-2 flex-row items-center">
          <Skeleton height={14} width={14} radius={7} />
          <Skeleton height={12} width="78%" className="ml-1.5 flex-1" />
        </View>
      ) : null}

      <Skeleton height={44} width="100%" radius={12} className="mt-3" />
    </Card>
  );
};

/** Mirrors HomeHero profile card. */
export const HomeHeroCardSkeleton: React.FC = () => (
  <Card className="mx-4 mt-4">
    <View className="flex-row items-center">
      <Skeleton height={56} width={56} radius={28} />
      <View className="ml-3 flex-1">
        <Skeleton height={13} width="38%" />
        <View className="h-1" />
        <Skeleton height={22} width="72%" />
        <View className="h-0.5" />
        <Skeleton height={12} width="52%" />
      </View>
      <Skeleton height={28} width={28} radius={14} className="shrink-0" />
    </View>
  </Card>
);

/** Mirrors Today's route card in HomeTodayExecution. */
export const HomeRouteCardSkeleton: React.FC = () => (
  <Card className="mx-4 mt-3">
    <View className="flex-row items-center justify-between mb-2">
      <View className="flex-row items-center flex-1 min-w-0 mr-2">
        <Skeleton height={18} width={18} radius={9} />
        <Skeleton height={18} width={128} className="ml-2" />
      </View>
      <Skeleton height={36} width={68} radius={8} />
    </View>
    <View className="flex-row items-center justify-between mb-2">
      <Skeleton height={13} width="46%" />
      <Skeleton height={13} width="28%" />
    </View>
    <View className="h-3 justify-center">
      <Skeleton height={8} width="100%" radius={4} />
    </View>
  </Card>
);

/** Mirrors Orders today card in HomeTodayExecution. */
export const HomeOrdersCardSkeleton: React.FC = () => (
  <Card className="mx-4 mt-3">
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Skeleton height={18} width={18} radius={9} />
        <Skeleton height={18} width={112} className="ml-2" />
      </View>
      <Skeleton height={36} width={72} radius={8} />
    </View>
    <Skeleton height={22} width="36%" className="mt-2" />
    <Skeleton height={13} width="48%" className="mt-0.5" />
  </Card>
);

/** Mirrors Notifications card empty / single-line state. */
export const HomeNotificationsCardSkeleton: React.FC = () => (
  <Card className="mx-4 mt-3 mb-6">
    <View className="flex-row items-center justify-between mb-2">
      <View className="flex-row items-center">
        <Skeleton height={18} width={18} radius={9} />
        <Skeleton height={18} width={120} className="ml-2" />
      </View>
      <Skeleton height={36} width={72} radius={8} />
    </View>
    <Skeleton height={13} width="62%" />
  </Card>
);

/** Mirrors Pending approvals manager card. */
export const HomeApprovalsCardSkeleton: React.FC = () => (
  <Card className="mx-4 mt-2">
    <View className="flex-row items-center justify-between mb-2">
      <View className="flex-row items-center">
        <Skeleton height={18} width={18} radius={9} />
        <Skeleton height={18} width={148} className="ml-2" />
      </View>
      <Skeleton height={36} width={72} radius={8} />
    </View>
    <Skeleton height={13} width="84%" />
  </Card>
);

/** Mirrors Team today manager card. */
export const HomeTeamTodayCardSkeleton: React.FC = () => (
  <Card className="mx-4 mt-3">
    <View className="flex-row items-center justify-between mb-2">
      <View className="flex-row items-center">
        <Skeleton height={18} width={18} radius={9} />
        <Skeleton height={18} width={96} className="ml-2" />
      </View>
      <Skeleton height={36} width={72} radius={8} />
    </View>
    <View className="flex-row flex-wrap gap-x-4 gap-y-1">
      <Skeleton height={13} width={72} />
      <Skeleton height={13} width={88} />
      <Skeleton height={13} width={64} />
    </View>
  </Card>
);
