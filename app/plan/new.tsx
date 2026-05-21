/**
 * Custom week only — default create uses CreatePlanSheet on weekly hub.
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { addWeeks, endOfWeek, format, startOfWeek } from 'date-fns';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Text, Subtitle } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { PermissionGate } from '@/auth/PermissionGate';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/state/authStore';

function NewWeeklyPlanImpl() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [offset, setOffset] = React.useState(2);

  const range = React.useMemo(() => {
    const base = addWeeks(new Date(), offset);
    const start = startOfWeek(base, { weekStartsOn: 1 });
    const end = endOfWeek(base, { weekStartsOn: 1 });
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`,
    };
  }, [offset]);

  const create = useMutation({
    mutationFn: () =>
      weeklyPlansApi.create({
        weekStartDate: range.start,
        weekEndDate: range.end,
        status: 'DRAFT',
        medicalRepId: user?._id,
      }),
    onSuccess: (plan) => {
      router.replace(`/plan/${plan._id}`);
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not create plan',
      });
    },
  });

  return (
    <View className="flex-1 bg-background">
      <Screen padded={false}>
        <Header back title="Custom week" />
        <Card className="mx-4 mt-2">
          <Subtitle className="mb-2">Select week offset</Subtitle>
          <View className="flex-row flex-wrap mb-3">
            {[2, 3, 4].map((w) => (
              <Button
                key={w}
                size="sm"
                variant={offset === w ? 'primary' : 'outline'}
                className="mr-2 mb-2"
                onPress={() => setOffset(w)}
              >
                {`+${w} weeks`}
              </Button>
            ))}
          </View>
          <Text size="sm" weight="medium">
            {range.label}
          </Text>
          <Text size="xs" tone="muted" className="mt-2">
            Opens the week builder immediately — no extra forms.
          </Text>
          <Button className="mt-4" loading={create.isPending} onPress={() => create.mutate()}>
            Open week builder
          </Button>
        </Card>
      </Screen>
    </View>
  );
}

export default function NewWeeklyPlan() {
  return (
    <PermissionGate screen="weekly_plan_new" title="Custom week">
      <NewWeeklyPlanImpl />
    </PermissionGate>
  );
}
