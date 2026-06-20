import * as React from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { Sheet } from '@/ui/Sheet';
import { PressableCard } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/state/authStore';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { weekRangeForPreset, type WeekPreset } from '@/features/weeklyPlan/weekUtils';
import { useThemedIcons } from '@/hooks/useThemedIcons';
import type { WeeklyPlan } from '@/domain/types';

interface CreatePlanSheetProps {
  open: boolean;
  onClose: () => void;
  existingPlans: WeeklyPlan[];
}

export const CreatePlanSheet: React.FC<CreatePlanSheetProps> = ({
  open,
  onClose,
  existingPlans,
}) => {
  const pushWithReturn = usePushWithReturn();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const icons = useThemedIcons();

  const create = useMutation({
    mutationFn: async (preset: WeekPreset) => {
      const range = weekRangeForPreset(preset);
      const existing = existingPlans.find(
        (p) => p.weekStartDate?.slice(0, 10) === range.start
      );
      if (existing) return existing;
      return weeklyPlansApi.create({
        weekStartDate: range.start,
        weekEndDate: range.end,
        status: 'DRAFT',
        medicalRepId: user?._id,
      });
    },
    onSuccess: (plan) => {
      onClose();
      pushWithReturn(`/plan/${plan._id}`);
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not open week plan',
      });
    },
  });

  function openWeek(preset: WeekPreset) {
    create.mutate(preset);
  }

  const current = weekRangeForPreset('current');
  const next = weekRangeForPreset('next');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Start weekly plan"
      subtitle="Pick a week — we create a draft and open the week builder immediately."
      snapPoints={['50%']}
    >
      <PressableCard className="mb-2" onPress={() => openWeek('current')}>
        <View className="flex-row items-center">
          <Calendar size={20} color={icons.foreground} />
          <View className="flex-1 mx-3">
            <Text size="base" weight="semibold">
              This week
            </Text>
            <Text size="xs" tone="muted">
              {current.label}
            </Text>
          </View>
          <ChevronRight size={18} color={icons.muted} />
        </View>
      </PressableCard>

      <PressableCard className="mb-3" onPress={() => openWeek('next')}>
        <View className="flex-row items-center">
          <Calendar size={20} color={icons.foreground} />
          <View className="flex-1 mx-3">
            <Text size="base" weight="semibold">
              Next week
            </Text>
            <Text size="xs" tone="muted">
              {next.label}
            </Text>
          </View>
          <ChevronRight size={18} color={icons.muted} />
        </View>
      </PressableCard>

      <Button
        variant="outline"
        onPress={() => {
          onClose();
          pushWithReturn('/plan/new?mode=custom');
        }}
      >
        Custom week…
      </Button>
    </Sheet>
  );
};
