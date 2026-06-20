import * as React from 'react';
import { View } from 'react-native';
import { format, isValid, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/ui/Card';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { Text, Label, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Divider } from '@/ui/ListRow';
import { useToast } from '@/ui/Toast';
import { planItemsApi } from '@/api/planItems';
import { ApiError } from '@/api/client';
import { useThemedIcons } from '@/hooks/useThemedIcons';
import type { ID, PlanItem, WeeklyPlanDetail } from '@/domain/types';

function safeFormat(iso: string | null | undefined, pattern: string): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? parseISO(iso) : new Date(iso);
  return isValid(d) ? format(d, pattern) : '—';
}

function doctorName(item: PlanItem): string {
  const d = item.doctorId;
  if (!d) return item.title ?? 'Task';
  if (typeof d === 'string') return 'Doctor';
  return d.name ?? 'Doctor';
}

function itemYmd(item: PlanItem): string {
  const raw = item.date;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return safeFormat(raw, 'yyyy-MM-dd');
}

function canReorderDay(
  ymd: string,
  beforePlanWeek: boolean,
  businessTodayYmd?: string
): boolean {
  if (beforePlanWeek) return true;
  if (!businessTodayYmd) return false;
  return ymd >= businessTodayYmd;
}

function sortBySequence(items: PlanItem[]): PlanItem[] {
  return [...items].sort((a, b) => {
    const sa = a.sequenceOrder ?? 0;
    const sb = b.sequenceOrder ?? 0;
    if (sa !== sb) return sa - sb;
    return String(a._id).localeCompare(String(b._id));
  });
}

function groupItemsByDate(items: PlanItem[]): { date: string; items: PlanItem[] }[] {
  const map = new Map<string, PlanItem[]>();
  for (const it of items) {
    const ymd = itemYmd(it);
    if (ymd === '—') continue;
    const list = map.get(ymd) ?? [];
    list.push(it);
    map.set(ymd, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => ({ date, items: sortBySequence(row) }));
}

interface Props {
  plan: WeeklyPlanDetail;
  planId: string;
  canEdit: boolean;
}

export const ScheduledItemsSection: React.FC<Props> = ({ plan, planId, canEdit }) => {
  const pushWithReturn = usePushWithReturn();
  const toast = useToast();
  const qc = useQueryClient();
  const icons = useThemedIcons();
  const beforeWeek = plan.editLock?.beforePlanWeek !== false;
  const businessToday = plan.editLock?.businessTodayYmd;
  const isDraft = plan.status === 'DRAFT';

  const grouped = groupItemsByDate(plan.planItems ?? []);

  const reorder = useMutation({
    mutationFn: (input: { date: string; orderedPlanItemIds: ID[] }) =>
      planItemsApi.reorder({
        weeklyPlanId: planId,
        date: input.date,
        orderedPlanItemIds: input.orderedPlanItemIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', planId] });
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not reorder',
      });
    },
  });

  function moveItem(date: string, items: PlanItem[], index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    const tmp = copy[index];
    copy[index] = copy[next];
    copy[next] = tmp;
    reorder.mutate({ date, orderedPlanItemIds: copy.map((i) => i._id) });
  }

  return (
    <Card className="mx-4 mt-2" padded={false}>
      <View className="px-3 py-2">
        <Subtitle>Scheduled items</Subtitle>
        {canEdit && isDraft ? (
          <Text size="xs" tone="muted" className="mt-0.5">
            Use arrows to reorder visits for each day.
          </Text>
        ) : null}
      </View>
      <Divider />
      {grouped.length === 0 ? (
        <View className="px-3 py-4">
          <Text size="sm" tone="muted">
            No visits scheduled yet. Add doctors above or copy the previous week.
          </Text>
        </View>
      ) : (
        grouped.map(({ date, items }) => {
          const reorderable =
            canEdit &&
            isDraft &&
            canReorderDay(date, beforeWeek, businessToday) &&
            items.length > 1;
          return (
            <View key={date}>
              <View className="px-3 py-2 bg-slate-50">
                <Label>{format(parseISO(date), 'EEEE, d MMM')}</Label>
              </View>
              {items.map((it, idx) => (
                <View key={it._id} className="px-3 py-3 border-b border-border">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-2 flex-row items-center">
                      {reorderable ? (
                        <View className="mr-1 flex-row">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={idx === 0 || reorder.isPending}
                            onPress={() => moveItem(date, items, idx, -1)}
                            accessibilityLabel="Move up"
                          >
                            <ChevronUp size={16} color={icons.muted} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={idx === items.length - 1 || reorder.isPending}
                            onPress={() => moveItem(date, items, idx, 1)}
                            accessibilityLabel="Move down"
                          >
                            <ChevronDown size={16} color={icons.muted} />
                          </Button>
                        </View>
                      ) : null}
                      <View className="flex-1">
                        <Text size="sm" weight="medium">
                          {it.type === 'OTHER_TASK' ? it.title ?? 'Other task' : doctorName(it)}
                        </Text>
                        <Text size="xs" tone="muted">
                          {it.type === 'OTHER_TASK' ? 'Other task' : 'Doctor visit'}
                        </Text>
                      </View>
                    </View>
                    <Badge tone={it.status === 'VISITED' ? 'success' : 'default'}>
                      {it.status}
                    </Badge>
                  </View>
                  {it.plannedTime ? (
                    <Text size="xs" tone="muted">
                      {it.plannedTime}
                    </Text>
                  ) : null}
                  {it.notes ? (
                    <Text size="xs" tone="muted" numberOfLines={2}>
                      {it.notes}
                    </Text>
                  ) : null}
                  {it.type === 'DOCTOR_VISIT' && it.doctorId != null ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 self-start"
                      onPress={() => {
                        const ref = it.doctorId!;
                        const docId = typeof ref === 'string' ? ref : ref._id;
                        pushWithReturn(`/doctor/${docId}`);
                      }}
                    >
                      Open doctor
                    </Button>
                  ) : null}
                </View>
              ))}
            </View>
          );
        })
      )}
    </Card>
  );
};
