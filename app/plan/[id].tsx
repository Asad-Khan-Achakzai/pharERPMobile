/**
 * Week builder — primary weekly planning screen
 */
import * as React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parseISO } from 'date-fns';
import { Copy, XCircle, CheckCircle2 } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { SkeletonRow } from '@/ui/Skeleton';
import { StickyActionBar } from '@/ui/StickyActionBar';
import { useToast } from '@/ui/Toast';
import { PermissionGate } from '@/auth/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';
import { masterQueries } from '@/data/masterQueries';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { reportsApi } from '@/api/reports';
import { ApiError } from '@/api/client';
import { DoctorPickerSheet } from '@/features/weeklyPlan/DoctorPickerSheet';
import { WeekDayCard } from '@/features/weeklyPlan/WeekDayCard';
import { usePlanDraftStorage } from '@/hooks/usePlanDraftStorage';
import { useAuthStore } from '@/state/authStore';
import {
  enumerateWeekYmd,
  groupPlanItemsByDate,
} from '@/features/weeklyPlan/weekUtils';
import type { BulkPlanItemInput, Doctor } from '@/domain/types';

const statusTone: Record<string, 'muted' | 'warning' | 'success' | 'danger' | 'default'> = {
  DRAFT: 'muted',
  SUBMITTED: 'warning',
  ACTIVE: 'success',
  COMPLETED: 'default',
  REVIEWED: 'default',
};

function safeFormat(iso: string | null | undefined, pattern: string): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? parseISO(iso) : new Date(iso);
  return isValid(d) ? format(d, pattern) : '—';
}

function dedupeDoctors(docs: Doctor[]): Doctor[] {
  const seen = new Set<string>();
  return docs.filter((d) => {
    const id = String(d._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function WeeklyPlanBuilderImpl() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const qc = useQueryClient();
  const { can, canAny } = usePermissions();
  const canEdit = canAny(['weeklyPlans.edit', 'weeklyPlans.create']);
  const canApprove = canAny(['weeklyPlans.approve', 'admin.access']);
  const authUser = useAuthStore((s) => s.user);

  const planQ = useQuery({
    queryKey: ['plan', id],
    queryFn: () => masterQueries.planDetail(id),
  });
  const plan = planQ.data;

  const isDraft = plan?.status === 'DRAFT';
  const isSubmitted = plan?.status === 'SUBMITTED';
  const beforeWeek = plan?.editLock?.beforePlanWeek !== false;
  /** Match web: DRAFT + edit permission; week lock only limits copy-week, not day edits. */
  const canEditPlan = canEdit && isDraft;
  const canCopyWeek = canEditPlan && beforeWeek;

  const {
    drafts: dayDrafts,
    hydrated: draftsHydrated,
    clearDrafts,
    getDayDraft,
    updateDayDraft,
  } = usePlanDraftStorage(id, !!canEditPlan);

  const [pickerDay, setPickerDay] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');
  const [notesExpanded, setNotesExpanded] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  React.useEffect(() => {
    if (plan?.notes != null) setNotes(plan.notes);
  }, [plan?.notes, plan?._id]);

  const weekDays = React.useMemo(
    () =>
      plan?.weekStartDate && plan?.weekEndDate
        ? enumerateWeekYmd(plan.weekStartDate, plan.weekEndDate)
        : [],
    [plan?.weekStartDate, plan?.weekEndDate]
  );

  const itemsByDate = React.useMemo(
    () => groupPlanItemsByDate(plan?.planItems ?? []),
    [plan?.planItems]
  );

  const repIdForCoverage = React.useMemo(() => {
    if (!plan) return null;
    const rep = plan.medicalRepId;
    if (!rep) return authUser?._id ?? null;
    return typeof rep === 'object' ? rep._id : rep;
  }, [plan, authUser?._id]);

  const coverageMonth = plan?.weekStartDate?.slice(0, 7) ?? format(new Date(), 'yyyy-MM');

  const coverageQ = useQuery({
    queryKey: ['reports', 'doctor-coverage', repIdForCoverage, coverageMonth],
    enabled: !!repIdForCoverage && !!canEditPlan,
    queryFn: () => reportsApi.doctorCoverage(repIdForCoverage!, coverageMonth),
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['plan', id] });
    qc.invalidateQueries({ queryKey: ['plans'] });
  };

  const saveNotes = useMutation({
    mutationFn: () => weeklyPlansApi.update(id, { notes: notes.trim() }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Draft saved' });
      invalidate();
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not save',
      });
    },
  });

  const saveItems = useMutation({
    mutationFn: async () => {
      const items: BulkPlanItemInput[] = [];
      for (const day of dayDrafts) {
        for (const v of day.visits) {
          items.push({
            date: day.date,
            type: 'DOCTOR_VISIT',
            doctorId: v.doctor._id,
            notes: v.notes.trim() || undefined,
            plannedTime: v.plannedTime.trim() || undefined,
          });
        }
        for (const task of day.otherTasks) {
          const title = task.title.trim();
          if (!title) continue;
          items.push({
            date: day.date,
            type: 'OTHER_TASK',
            title,
            notes: task.notes.trim() || undefined,
          });
        }
      }
      if (items.length > 0) {
        await weeklyPlansApi.bulkPlanItems(id, items);
      }
      if (notes.trim() !== (plan?.notes ?? '').trim()) {
        await weeklyPlansApi.update(id, { notes: notes.trim() });
      }
    },
    onSuccess: async () => {
      toast.show({ tone: 'success', message: 'Week saved' });
      await clearDrafts();
      invalidate();
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : (e as Error).message ?? 'Could not save',
      });
    },
  });

  const submitPlan = useMutation({
    mutationFn: () => weeklyPlansApi.submit(id),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Submitted for approval' });
      invalidate();
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not submit',
      });
    },
  });

  const approvePlan = useMutation({
    mutationFn: () => weeklyPlansApi.approve(id),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Plan approved' });
      invalidate();
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not approve',
      });
    },
  });

  const rejectPlan = useMutation({
    mutationFn: () => weeklyPlansApi.reject(id, rejectReason.trim()),
    onSuccess: () => {
      toast.show({ tone: 'info', message: 'Plan rejected' });
      setRejectOpen(false);
      setRejectReason('');
      invalidate();
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not reject',
      });
    },
  });

  const copyWeek = useMutation({
    mutationFn: () => weeklyPlansApi.copyPreviousWeek(id),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Previous week copied' });
      invalidate();
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not copy week',
      });
    },
  });

  const [optimizingDay, setOptimizingDay] = React.useState<string | null>(null);

  const optimizeDay = useMutation({
    mutationFn: (date: string) => weeklyPlansApi.optimizeRoute(id, { date }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Route optimized for the day' });
      invalidate();
      setOptimizingDay(null);
    },
    onError: (e: unknown) => {
      toast.show({
        tone: 'danger',
        message: e instanceof ApiError ? e.message : 'Could not optimize route',
      });
      setOptimizingDay(null);
    },
  });

  const draftHasContent = dayDrafts.some(
    (d) => d.visits.length > 0 || d.otherTasks.some((t) => t.title.trim() !== '')
  );

  const hasLocalDraft = draftsHydrated && draftHasContent;

  const needsApproval = plan?.approvalRequired === true;
  const savedItemCount = plan?.planItems?.length ?? 0;
  const canSubmit = canEditPlan && needsApproval && savedItemCount > 0;
  const showSubmitForApproval = canEditPlan && needsApproval;
  const canManagerAct = canApprove && isSubmitted;

  function openPicker(date: string) {
    setPickerDay(date);
  }

  function onDoctorsConfirmed(docs: Doctor[]) {
    if (!pickerDay) return;
    const day = getDayDraft(pickerDay);
    const existingIds = new Set(day.visits.map((v) => String(v.doctor._id)));
    const newVisits = dedupeDoctors(docs)
      .filter((d) => !existingIds.has(String(d._id)))
      .map((doctor) => ({ doctor, plannedTime: '', notes: '' }));
    updateDayDraft(pickerDay, { visits: [...day.visits, ...newVisits] });
    setPickerDay(null);
  }

  const pickerDraftDoctors = pickerDay
    ? getDayDraft(pickerDay).visits.map((v) => v.doctor)
    : [];

  if (planQ.isLoading || !plan) {
    return (
      <Screen padded={false}>
        <Header back title="Week builder" />
        <View className="px-4">
          <SkeletonRow count={4} />
        </View>
      </Screen>
    );
  }

  const metrics = plan.executionMetrics as
    | { planned?: number; visited?: number; missed?: number }
    | undefined;

  const readOnly = !canEditPlan;
  const readOnlyReason = !isDraft
    ? `This plan is ${plan.status?.toLowerCase() ?? 'locked'} and cannot be edited.`
    : !canEdit
      ? 'You do not have permission to edit weekly plans.'
      : null;

  return (
    <View className="flex-1 bg-background">
      <Screen padded={false} scroll>
        <Header
          back
          title="Week builder"
          subtitle={`${safeFormat(plan.weekStartDate, 'd MMM')} – ${safeFormat(plan.weekEndDate, 'd MMM yyyy')}`}
        />

        <View className="px-4 pt-1 flex-row flex-wrap gap-2">
          <Badge tone={statusTone[plan.status] ?? 'default'}>
            {plan.status === 'SUBMITTED' ? 'Pending approval' : plan.status}
          </Badge>
          {coverageQ.data?.coveragePercent != null ? (
            <Badge tone="info">{`Coverage ${coverageQ.data.coveragePercent}%`}</Badge>
          ) : null}
          {hasLocalDraft ? <Badge tone="warning">Unsaved changes</Badge> : null}
        </View>

        {plan.rejectedReason ? (
          <Card className="mx-4 mt-2">
            <Text size="sm" tone="danger">
              Revision needed: {plan.rejectedReason}
            </Text>
          </Card>
        ) : null}

        {readOnly && readOnlyReason ? (
          <Card className="mx-4 mt-2">
            <Text size="sm" tone="muted">
              {readOnlyReason}
            </Text>
          </Card>
        ) : null}

        {metrics?.planned != null ? (
          <Text size="xs" tone="muted" className="px-4 mt-2">
            Field execution: {metrics.visited ?? 0}/{metrics.planned} visits completed
          </Text>
        ) : null}

        {canEditPlan ? (
          <View className="px-4 mt-2 flex-row flex-wrap">
            {canCopyWeek ? (
              <Button
                size="sm"
                variant="outline"
                className="mr-2 mb-2"
                leftIcon={<Copy size={14} color="#0f172a" />}
                loading={copyWeek.isPending}
                onPress={() => copyWeek.mutate()}
              >
                Copy last week
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="mb-2"
              onPress={() => setNotesExpanded((v) => !v)}
            >
              {notesExpanded ? 'Hide notes' : 'Week notes'}
            </Button>
          </View>
        ) : null}

        {notesExpanded || (!canEditPlan && plan.notes) ? (
          <Card className="mx-4 mt-1">
            <TextField
              label="Week notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              editable={canEdit && isDraft}
            />
          </Card>
        ) : null}

        <Subtitle className="px-4 mt-3 mb-1">Your week</Subtitle>

        {weekDays.map((date) => {
          const dayItems = itemsByDate.get(date) ?? [];
          const savedVisits = dayItems.filter((it) => it.type === 'DOCTOR_VISIT');
          const savedTasks = dayItems.filter((it) => it.type === 'OTHER_TASK');
          const draft = getDayDraft(date);

          return (
            <WeekDayCard
              key={date}
              date={date}
              savedVisits={savedVisits}
              savedTasks={savedTasks}
              draft={draft}
              editable={canEditPlan}
              onAddDoctors={() => openPicker(date)}
              onAddTask={() =>
                updateDayDraft(date, {
                  otherTasks: [...draft.otherTasks, { title: '', notes: '' }],
                })
              }
              onUpdateDraft={(patch) => updateDayDraft(date, patch)}
              onOptimizeRoute={
                canEditPlan && savedVisits.length >= 2
                  ? () => {
                      setOptimizingDay(date);
                      optimizeDay.mutate(date);
                    }
                  : undefined
              }
              optimizing={optimizingDay === date && optimizeDay.isPending}
            />
          );
        })}

        <View className="h-32" />
      </Screen>

      <DoctorPickerSheet
        open={pickerDay != null}
        onClose={() => setPickerDay(null)}
        selected={pickerDraftDoctors}
        onConfirm={onDoctorsConfirmed}
        title={
          pickerDay
            ? `Add doctors — ${format(parseISO(pickerDay), 'EEE d MMM')}`
            : 'Add doctors'
        }
      />

      {canEditPlan && pickerDay == null ? (
        <StickyActionBar>
          <Button
            variant="outline"
            className="flex-1 mr-2"
            loading={saveItems.isPending || saveNotes.isPending}
            onPress={() => saveItems.mutate()}
          >
            Save draft
          </Button>
          {showSubmitForApproval ? (
            <Button
              className="flex-1"
              loading={submitPlan.isPending}
              disabled={!canSubmit}
              onPress={() => {
                if (!canSubmit) {
                  toast.show({
                    tone: 'info',
                    message: hasLocalDraft
                      ? 'Save your week first, then submit for approval.'
                      : 'Add at least one visit or task, save, then submit.',
                  });
                  return;
                }
                submitPlan.mutate();
              }}
            >
              Submit for approval
            </Button>
          ) : null}
        </StickyActionBar>
      ) : null}

      {canManagerAct ? (
        <StickyActionBar>
          <Button
            variant="outline"
            className="flex-1 mr-2"
            leftIcon={<XCircle size={14} color="#ef4444" />}
            onPress={() => {
              setRejectReason('');
              setRejectOpen(true);
            }}
          >
            Reject
          </Button>
          <Button
            className="flex-1"
            loading={approvePlan.isPending}
            leftIcon={<CheckCircle2 size={14} color="#fff" />}
            onPress={() => approvePlan.mutate()}
          >
            Approve
          </Button>
        </StickyActionBar>
      ) : null}

      <Modal
        visible={rejectOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectOpen(false)}
      >
        <Pressable
          onPress={() => setRejectOpen(false)}
          className="flex-1 bg-black/40 justify-center px-6"
        >
          <Pressable className="bg-card rounded-2xl p-4">
            <Text size="lg" weight="semibold">
              Reject plan
            </Text>
            <TextField
              label="Reason"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              className="mt-2"
            />
            <View className="flex-row mt-2">
              <Button variant="outline" className="flex-1 mr-2" onPress={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={rejectPlan.isPending}
                disabled={!rejectReason.trim()}
                onPress={() => rejectPlan.mutate()}
              >
                Reject
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function WeeklyPlanDetail() {
  return (
    <PermissionGate screen="weekly_plan_detail" title="Week builder">
      <WeeklyPlanBuilderImpl />
    </PermissionGate>
  );
}
