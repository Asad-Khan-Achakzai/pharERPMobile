import * as React from 'react';
import { View } from 'react-native';
import { Card, PressableCard } from '@/ui/Card';
import { Skeleton } from '@/ui/Skeleton';
import { cn } from '@/utils/cn';

export type ListSkeletonVariant =
  | 'split'
  | 'avatar'
  | 'visit'
  | 'notification'
  | 'ledger'
  | 'weeklyPlan'
  | 'device'
  | 'approval'
  | 'expense';

const VARIANTS: Record<ListSkeletonVariant, React.FC> = {
  split: SplitListItemSkeleton,
  avatar: AvatarListItemSkeleton,
  visit: VisitListItemSkeleton,
  notification: NotificationListItemSkeleton,
  ledger: LedgerListItemSkeleton,
  weeklyPlan: WeeklyPlanListItemSkeleton,
  device: DeviceListItemSkeleton,
  approval: ApprovalCardSkeleton,
  expense: ExpenseListItemSkeleton,
};

/** Renders N list-item skeletons with the same spacing as FlatList `ItemSeparatorComponent`. */
export const ListSkeletonList: React.FC<{
  count?: number;
  variant: ListSkeletonVariant;
  className?: string;
}> = ({ count = 5, variant, className = 'px-4 pt-2' }) => {
  const Item = VARIANTS[variant];
  return (
    <View className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className={i > 0 ? 'mt-2' : undefined}>
          <Item />
        </View>
      ))}
    </View>
  );
};

/** Orders, pharmacies — title/subtitle left, amount + badge right. */
export function SplitListItemSkeleton() {
  return (
    <PressableCard disabled>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Skeleton height={16} width="72%" />
          <Skeleton height={12} width="54%" className="mt-1" />
        </View>
        <View className="items-end">
          <Skeleton height={16} width={80} />
          <Skeleton height={22} width={68} radius={11} className="mt-1" />
        </View>
      </View>
    </PressableCard>
  );
}

/** Doctors — avatar + name + subtitle. */
export function AvatarListItemSkeleton() {
  return (
    <PressableCard disabled>
      <View className="flex-row items-center">
        <Skeleton height={44} width={44} radius={22} />
        <View className="flex-1 ml-3">
          <Skeleton height={16} width="68%" />
          <Skeleton height={12} width="48%" className="mt-1" />
        </View>
        <Skeleton height={22} width={56} radius={11} className="ml-2 shrink-0" />
      </View>
    </PressableCard>
  );
}

/** Visits tab — doctor name + meta left, status badge right. */
export function VisitListItemSkeleton() {
  return (
    <PressableCard disabled>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Skeleton height={16} width="64%" />
          <Skeleton height={12} width="42%" className="mt-1" />
        </View>
        <View className="items-end">
          <Skeleton height={22} width={60} radius={11} />
          <Skeleton height={18} width={52} radius={9} className="mt-1" />
        </View>
      </View>
    </PressableCard>
  );
}

/** Notifications — title, body, timestamp. */
export function NotificationListItemSkeleton() {
  return (
    <PressableCard disabled>
      <View className="flex-row items-start">
        <View className="flex-1 pr-2">
          <Skeleton height={16} width="76%" />
          <Skeleton height={12} width="92%" className="mt-1.5" />
          <Skeleton height={12} width="88%" className="mt-1" />
          <Skeleton height={11} width="38%" className="mt-1.5" />
        </View>
        <Skeleton height={22} width={40} radius={11} className="shrink-0" />
      </View>
    </PressableCard>
  );
}

/** General / supplier ledger entries. */
export function LedgerListItemSkeleton() {
  return (
    <Card padded>
      <View className="flex-row justify-between">
        <View className="flex-1 pr-2">
          <Skeleton height={14} width="58%" />
          <Skeleton height={11} width="72%" className="mt-1" />
          <Skeleton height={11} width="48%" className="mt-0.5" />
        </View>
        <View className="items-end">
          <Skeleton height={12} width={56} />
          <Skeleton height={12} width={52} className="mt-1" />
          <Skeleton height={14} width={64} className="mt-1" />
        </View>
      </View>
    </Card>
  );
}

/** Weekly plan rows. */
export function WeeklyPlanListItemSkeleton() {
  return (
    <PressableCard disabled className="mb-0">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Skeleton height={11} width="34%" className="mb-1" />
          <Skeleton height={16} width="82%" />
          <Skeleton height={12} width="64%" className="mt-1" />
        </View>
        <Skeleton height={22} width={88} radius={11} />
      </View>
    </PressableCard>
  );
}

/** Devices screen cards. */
export function DeviceListItemSkeleton() {
  return (
    <Card padded>
      <View className="flex-row items-center">
        <Skeleton height={40} width={40} radius={8} className="mr-3" />
        <View className="flex-1">
          <Skeleton height={16} width="62%" />
          <Skeleton height={12} width="48%" className="mt-1" />
          <Skeleton height={11} width="56%" className="mt-1" />
        </View>
        <Skeleton height={22} width={52} radius={11} className="ml-2" />
      </View>
      <Skeleton height={36} width="100%" radius={8} className="mt-3" />
    </Card>
  );
}

/** Expenses — split layout with extra date line on right. */
export function ExpenseListItemSkeleton() {
  return (
    <Card padded>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Skeleton height={16} width="70%" />
          <Skeleton height={12} width="52%" className="mt-1" />
        </View>
        <View className="items-end">
          <Skeleton height={16} width={72} />
          <Skeleton height={22} width={96} radius={11} className="mt-1" />
          <Skeleton height={11} width={40} className="mt-1" />
        </View>
      </View>
    </Card>
  );
}

/** Manager attendance approval cards. */
export function ApprovalCardSkeleton() {
  return (
    <Card padded>
      <View className="flex-row flex-wrap mb-2">
        <Skeleton height={22} width={72} radius={11} className="mr-1.5 mb-1" />
        <Skeleton height={22} width={64} radius={11} className="mr-1.5 mb-1" />
      </View>
      <Skeleton height={16} width="78%" />
      <Skeleton height={12} width="56%" className="mt-1" />
      <Skeleton height={12} width="44%" className="mt-1" />
      <View className="flex-row mt-3 pt-3 border-t border-border">
        <Skeleton height={36} width="48%" radius={8} className="mr-2" />
        <Skeleton height={36} width="48%" radius={8} />
      </View>
    </Card>
  );
}

/** Detail screens — summary card (order, pharmacy header). */
export function DetailSummaryCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('mx-4 mt-2', className)} padded>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Skeleton height={12} width="28%" />
          <Skeleton height={22} width="76%" className="mt-1" />
          <Skeleton height={12} width="52%" className="mt-1" />
        </View>
        <Skeleton height={22} width={72} radius={11} />
      </View>
    </Card>
  );
}

/** Detail screens — items / rows card. */
export function DetailItemsCardSkeleton({
  className,
  rows = 3,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <Card className={cn('mx-4 mt-2', className)} padded={false}>
      <View className="px-3 py-2">
        <Skeleton height={12} width="20%" />
      </View>
      <View className="h-px bg-border" />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i}>
          <View className="px-3 py-3 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Skeleton height={14} width="62%" />
              <Skeleton height={11} width="48%" className="mt-1" />
            </View>
            <Skeleton height={14} width={56} />
          </View>
          {i < rows - 1 ? <View className="h-px bg-border" /> : null}
        </View>
      ))}
      <View className="h-px bg-border" />
      <View className="px-3 py-3 flex-row items-center justify-between">
        <Skeleton height={16} width="28%" />
        <Skeleton height={16} width={72} />
      </View>
    </Card>
  );
}

/** Doctor / profile detail hero card. */
export function DetailProfileCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('mx-4 mt-2', className)} padded>
      <View className="flex-row items-center">
        <Skeleton height={56} width={56} radius={28} />
        <View className="ml-3 flex-1">
          <Skeleton height={22} width="72%" />
          <Skeleton height={13} width="48%" className="mt-1" />
          <Skeleton height={22} width={64} radius={11} className="mt-2" />
        </View>
      </View>
    </Card>
  );
}

/** Detail screens — stacked list rows (contact info, etc.). */
export function DetailListRowsCardSkeleton({
  className,
  rows = 4,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <Card className={cn('mx-4 mt-2', className)} padded={false}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i}>
          <View className="px-3 py-3 flex-row items-center">
            <Skeleton height={18} width={18} radius={9} />
            <View className="ml-3 flex-1">
              <Skeleton height={14} width="54%" />
              <Skeleton height={11} width="36%" className="mt-0.5" />
            </View>
          </View>
          {i < rows - 1 ? <View className="h-px bg-border" /> : null}
        </View>
      ))}
    </Card>
  );
}

/** Full detail page skeleton (summary + items). */
export function DetailPageSkeleton({ itemRows = 3 }: { itemRows?: number }) {
  return (
    <View className="pb-8">
      <DetailSummaryCardSkeleton />
      <DetailItemsCardSkeleton rows={itemRows} />
    </View>
  );
}

/** Manager dashboard — stat tiles + team member rows. */
export function ManagerDashboardSkeleton() {
  return (
    <View className="pb-8">
      <View className="px-4 flex-row">
        <Card className="flex-1 mr-2" padded>
          <Skeleton height={12} width="42%" className="mb-2" />
          <Skeleton height={22} width="36%" />
          <Skeleton height={11} width="58%" className="mt-1" />
        </Card>
        <Card className="flex-1" padded>
          <Skeleton height={12} width="38%" className="mb-2" />
          <Skeleton height={22} width="28%" />
          <Skeleton height={11} width="52%" className="mt-1" />
        </Card>
      </View>
      <View className="px-4 mt-2 flex-row">
        <Card className="flex-1 mr-2" padded>
          <Skeleton height={12} width="48%" className="mb-2" />
          <Skeleton height={22} width="64%" />
        </Card>
        <Card className="flex-1" padded>
          <Skeleton height={12} width="40%" className="mb-2" />
          <Skeleton height={22} width="24%" />
          <Skeleton height={11} width="54%" className="mt-1" />
        </Card>
      </View>
      <View className="px-4 mt-3 mb-2">
        <Skeleton height={14} width="36%" />
      </View>
      <ListSkeletonList count={3} variant="avatar" className="px-4" />
    </View>
  );
}

/** KPI / targets page skeleton. */
export function KpiPageSkeleton() {
  return (
    <View className="pb-8">
      <Card className="mx-4 mt-2" padded>
        <Skeleton height={12} width="42%" />
        <Skeleton height={22} width="56%" className="mt-1" />
        <Skeleton height={8} width="100%" radius={4} className="mt-3" />
        <Skeleton height={11} width="48%" className="mt-1" />
      </Card>
      <DetailItemsCardSkeleton rows={4} />
    </View>
  );
}

/** Form edit screens — labeled field placeholders. */
export function FormFieldsCardSkeleton({
  className,
  fields = 5,
}: {
  className?: string;
  fields?: number;
}) {
  return (
    <Card className={cn('mx-4 mt-2', className)} padded>
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i}>
          <Skeleton height={14} width={`${28 + (i % 3) * 8}%`} className="mb-1.5" />
          <Skeleton height={48} width="100%" radius={12} className="mb-3" />
        </View>
      ))}
    </Card>
  );
}

/** Doctor profile page skeleton. */
export function DoctorProfilePageSkeleton() {
  return (
    <View className="pb-8">
      <DetailProfileCardSkeleton />
      <DetailListRowsCardSkeleton rows={3} />
      <Card className="mx-4 mt-2" padded>
        <Skeleton height={14} width="32%" className="mb-3" />
        <ListSkeletonList count={2} variant="visit" className="px-0 pt-0" />
      </Card>
    </View>
  );
}
