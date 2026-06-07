/**
 * Manager Approvals (Mobile) — Web Parity Contract
 *
 *  Two adjacent inboxes:
 *
 *  1. Attendance requests
 *     - Admins / `attendance.governance.view`:
 *         GET `/attendance/governance/request-queue`
 *         (mirrors `pharmaERPFE/src/views/attendance/governance/AttendanceGovernanceQueueView.tsx`)
 *     - Plain approvers:
 *         GET `/attendance/requests/inbox`
 *         (mirrors `pharmaERPFE/src/views/attendance/team/TeamAttendanceView.tsx`)
 *
 *     Approve / reject / escalate hit the SAME routes the web uses:
 *       POST `/attendance/requests/:id/{approve|reject|escalate}` with
 *       optional `{ comment }`. Reject requires a comment ≥ 10 chars
 *       (matches `REJECT_NOTE_MIN` in `AttendanceGovernanceQueueView`).
 *
 *  2. Weekly plans
 *     - GET `/weekly-plans/pending-approvals`
 *     - POST `/weekly-plans/:id/approve | /reject`
 */
import * as React from 'react';
import { View, FlatList, Modal, Pressable, RefreshControl } from 'react-native';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import {
  ArrowUpRightFromCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Filter,
  XCircle,
} from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Tabs } from '@/ui/Tabs';
import { TextField } from '@/ui/TextField';
import { SkeletonRow } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { useToast } from '@/ui/Toast';
import { weeklyPlansApi } from '@/api/weeklyPlans';
import { attendanceRequestsApi } from '@/api/attendanceRequests';
import { ExpensesApprovalQueue } from '@/features/expenses/ExpensesApprovalQueue';
import { usePermissions } from '@/hooks/usePermissions';
import type {
  AttendanceRequest,
  AttendanceRequestType,
  ID,
  WeeklyPlan,
} from '@/domain/types';

type Segment = 'attendance' | 'plans' | 'expenses';
type Scope = 'all' | 'action' | 'monitor';

const REJECT_NOTE_MIN = 10;

const REQUEST_TYPE_LABELS: Record<AttendanceRequestType, string> = {
  LATE_ARRIVAL: 'Late check-in',
  MISSED_CHECKOUT: 'Missed checkout',
  TIME_CORRECTION: 'Time correction',
  MANUAL_EXCEPTION: 'Manual exception',
};

const APPROVE_PERMISSIONS = [
  'admin.access',
  'attendance.approve',
  'attendance.approve.direct',
  'attendance.approve.escalated',
];

const GOVERNANCE_PERMISSIONS = ['admin.access', 'attendance.governance.view'];

const PLAN_APPROVE_PERMISSIONS = ['weeklyPlans.review', 'weeklyPlans.approve'];

const EXPENSE_APPROVE_PERMISSIONS = ['expenses.approve', 'admin.access'];

function nameOf(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  return (value as { name?: string }).name ?? null;
}

function slaSummary(minutes?: number | null): string | null {
  if (minutes == null) return null;
  if (minutes < 0) return `Overdue by ${Math.abs(minutes)}m`;
  if (minutes < 60) return `Due in ${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `Due in ${h}h${m ? ` ${m}m` : ''}`;
}

export default function Approvals() {
  const toast = useToast();
  const qc = useQueryClient();
  const { canAny } = usePermissions();

  const canApproveAttendance = canAny(APPROVE_PERMISSIONS);
  const canGovernance = canAny(GOVERNANCE_PERMISSIONS);
  const canApprovePlans = canAny(PLAN_APPROVE_PERMISSIONS);
  const canApproveExpenses = canAny(EXPENSE_APPROVE_PERMISSIONS);

  const [segment, setSegment] = React.useState<Segment>(
    canApproveAttendance || canGovernance ? 'attendance' : canApproveExpenses ? 'expenses' : 'plans'
  );

  return (
    <Screen padded={false} scroll={false}>
      <Header title="Approvals" subtitle="Pending requests from your team" />

      <View className="px-4 pt-2 pb-2">
        <Tabs
          value={segment}
          onChange={(k) => setSegment(k as Segment)}
          items={[
            { key: 'attendance', label: 'Attendance' },
            { key: 'plans', label: 'Weekly plans' },
            { key: 'expenses', label: 'Expenses' },
          ]}
        />
      </View>

      {segment === 'attendance' ? (
        canApproveAttendance || canGovernance ? (
          <AttendanceQueue
            useGovernance={canGovernance}
            qc={qc}
            toast={toast}
          />
        ) : (
          <EmptyState
            icon={<ClipboardCheck size={28} color="#94a3b8" />}
            title="No attendance approvals"
            description="Your role isn't part of the attendance approval chain."
          />
        )
      ) : null}

      {segment === 'plans' ? (
        canApprovePlans ? (
          <WeeklyPlansQueue qc={qc} toast={toast} />
        ) : (
          <EmptyState
            icon={<ClipboardCheck size={28} color="#94a3b8" />}
            title="No plan approvals"
            description="Your role doesn't review weekly plans."
          />
        )
      ) : null}

      {segment === 'expenses' ? (
        canApproveExpenses ? (
          <ExpensesApprovalQueue />
        ) : (
          <EmptyState
            icon={<ClipboardCheck size={28} color="#94a3b8" />}
            title="No expense approvals"
            description="Your role cannot approve field expenses."
          />
        )
      ) : null}
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Attendance queue (governance OR personal inbox)                     */
/* ------------------------------------------------------------------ */

interface QueueProps {
  qc: ReturnType<typeof useQueryClient>;
  toast: ReturnType<typeof useToast>;
}

interface AttendanceQueueProps extends QueueProps {
  /** When true, hit the company-wide governance endpoint instead of the personal inbox. */
  useGovernance: boolean;
}

const AttendanceQueue: React.FC<AttendanceQueueProps> = ({
  useGovernance,
  qc,
  toast,
}) => {
  const [scope, setScope] = React.useState<Scope>('all');
  const [typeFilter, setTypeFilter] = React.useState<AttendanceRequestType | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = React.useState(false);

  const queryKey = ['attendance', 'requests', useGovernance ? 'governance' : 'inbox'];

  const list = useQuery({
    queryKey,
    queryFn: () =>
      useGovernance
        ? attendanceRequestsApi.governanceQueue({ sort: 'newest', limit: 300 })
        : attendanceRequestsApi.inbox({ sort: 'newest', limit: 100 }),
  });

  const filtered = React.useMemo(() => {
    const rows = list.data ?? [];
    return rows.filter((r) => {
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
      if (!useGovernance) return true;
      const canAct = r.governance?.viewerCanAct !== false;
      if (scope === 'action' && !canAct) return false;
      if (scope === 'monitor' && canAct) return false;
      return true;
    });
  }, [list.data, useGovernance, scope, typeFilter]);

  const [rejectFor, setRejectFor] = React.useState<AttendanceRequest | null>(null);
  const [rejectNote, setRejectNote] = React.useState('');
  const [escalateFor, setEscalateFor] = React.useState<AttendanceRequest | null>(null);

  const decide = useMutation({
    mutationFn: async (input: {
      id: ID;
      action: 'approve' | 'reject' | 'escalate';
      comment?: string;
    }) => {
      switch (input.action) {
        case 'approve':
          return attendanceRequestsApi.approve(input.id, { comment: input.comment });
        case 'reject':
          return attendanceRequestsApi.reject(input.id, { comment: input.comment });
        case 'escalate':
          return attendanceRequestsApi.escalate(input.id, { comment: input.comment });
      }
    },
    onSuccess: (_data, variables) => {
      const verb =
        variables.action === 'approve'
          ? 'approved'
          : variables.action === 'reject'
            ? 'rejected'
            : 'escalated';
      toast.show({
        tone: variables.action === 'reject' ? 'info' : 'success',
        message: `Request ${verb}`,
      });
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'requests'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not update request' });
    },
  });

  if (list.isLoading) {
    return (
      <View className="px-4">
        <SkeletonRow count={4} />
      </View>
    );
  }
  if (!list.data || list.data.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck size={28} color="#94a3b8" />}
        title="No open requests"
        description={
          useGovernance
            ? 'Nothing is waiting on the company queue right now.'
            : 'Nothing is waiting in your inbox right now.'
        }
      />
    );
  }

  return (
    <>
      <View className="px-4 pb-2 flex-row items-center justify-between">
        <Text size="xs" tone="muted">
          {filtered.length} of {list.data.length} request
          {list.data.length === 1 ? '' : 's'}
        </Text>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Filter size={14} color="#0f172a" />}
          onPress={() => setShowFilters((v) => !v)}
        >
          Filters
        </Button>
      </View>

      {showFilters ? (
        <View className="px-4 pb-2">
          {useGovernance ? (
            <View className="flex-row flex-wrap mb-2">
              {(['all', 'action', 'monitor'] as Scope[]).map((s) => (
                <View key={s} className="mr-2 mb-2">
                  <Button
                    size="sm"
                    variant={scope === s ? 'primary' : 'outline'}
                    onPress={() => setScope(s)}
                  >
                    {s === 'all' ? 'All open' : s === 'action' ? 'Needs my action' : 'Monitor only'}
                  </Button>
                </View>
              ))}
            </View>
          ) : null}
          <View className="flex-row flex-wrap">
            {(['ALL', 'LATE_ARRIVAL', 'MISSED_CHECKOUT', 'TIME_CORRECTION', 'MANUAL_EXCEPTION'] as const).map(
              (t) => (
                <View key={t} className="mr-2 mb-2">
                  <Button
                    size="sm"
                    variant={typeFilter === t ? 'primary' : 'outline'}
                    onPress={() => setTypeFilter(t)}
                  >
                    {t === 'ALL' ? 'All types' : REQUEST_TYPE_LABELS[t]}
                  </Button>
                </View>
              )
            )}
          </View>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(r) => r._id}
        contentContainerClassName="px-4 pt-1 pb-8"
        ItemSeparatorComponent={() => <View className="h-2" />}
        refreshControl={
          <RefreshControl
            refreshing={list.isFetching && !list.isLoading}
            onRefresh={() => list.refetch()}
          />
        }
        ListEmptyComponent={
          <View className="py-8 items-center">
            <Text size="sm" tone="muted">
              No requests match these filters.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AttendanceRequestCard
            request={item}
            useGovernance={useGovernance}
            busy={decide.isPending}
            onApprove={() => decide.mutate({ id: item._id, action: 'approve' })}
            onRejectClick={() => {
              setRejectNote('');
              setRejectFor(item);
            }}
            onEscalateClick={() => setEscalateFor(item)}
          />
        )}
      />

      <RejectDialog
        request={rejectFor}
        note={rejectNote}
        onNoteChange={setRejectNote}
        busy={decide.isPending}
        onClose={() => setRejectFor(null)}
        onConfirm={() => {
          if (!rejectFor) return;
          decide.mutate(
            { id: rejectFor._id, action: 'reject', comment: rejectNote.trim() },
            { onSuccess: () => setRejectFor(null) }
          );
        }}
      />

      <EscalateDialog
        request={escalateFor}
        busy={decide.isPending}
        onClose={() => setEscalateFor(null)}
        onConfirm={() => {
          if (!escalateFor) return;
          decide.mutate(
            { id: escalateFor._id, action: 'escalate' },
            { onSuccess: () => setEscalateFor(null) }
          );
        }}
      />
    </>
  );
};

interface CardProps {
  request: AttendanceRequest;
  useGovernance: boolean;
  busy: boolean;
  onApprove: () => void;
  onRejectClick: () => void;
  onEscalateClick: () => void;
}

const AttendanceRequestCard: React.FC<CardProps> = ({
  request,
  useGovernance,
  busy,
  onApprove,
  onRejectClick,
  onEscalateClick,
}) => {
  const rep = nameOf(request.requesterId) ?? 'Field user';
  const owner = nameOf(request.currentApproverId);
  const submittedAt =
    request.createdAt && isValid(parseISO(request.createdAt))
      ? formatDistanceToNow(parseISO(request.createdAt), { addSuffix: true })
      : '';

  const attendance =
    request.attendanceId && typeof request.attendanceId === 'object'
      ? request.attendanceId
      : null;
  const attendanceDate =
    attendance?.date && isValid(parseISO(attendance.date))
      ? format(parseISO(attendance.date), 'EEE d MMM')
      : null;
  const checkInLabel =
    attendance?.checkInTime && isValid(parseISO(attendance.checkInTime))
      ? `In ${format(parseISO(attendance.checkInTime), 'HH:mm')}`
      : null;

  const payload = (request.payload ?? {}) as Record<string, unknown>;
  const requestedIn =
    typeof payload.requestedCheckInTime === 'string' &&
    isValid(parseISO(payload.requestedCheckInTime))
      ? format(parseISO(payload.requestedCheckInTime), 'HH:mm')
      : null;
  const requestedOut =
    typeof payload.requestedCheckOutTime === 'string' &&
    isValid(parseISO(payload.requestedCheckOutTime))
      ? format(parseISO(payload.requestedCheckOutTime), 'HH:mm')
      : null;

  const gov = request.governance;
  const canAct = !useGovernance || gov?.viewerCanAct !== false;
  const isAdminQueue = !!gov?.isAdminQueue;
  const escalated = request.status === 'ESCALATED';
  const stepLabel =
    gov?.stepTotal && gov.stepTotal > 0
      ? `Step ${gov.currentStepDisplay ?? 1} of ${gov.stepTotal}`
      : null;
  const slaLine = slaSummary(gov?.slaMinutesRemaining);

  return (
    <Card>
      <View className="flex-row flex-wrap mb-1">
        {canAct ? (
          <Badge tone="primary" className="mr-1.5 mb-1">
            Your action
          </Badge>
        ) : (
          <Badge tone="muted" className="mr-1.5 mb-1">
            Monitor
          </Badge>
        )}
        {isAdminQueue ? (
          <Badge tone="muted" className="mr-1.5 mb-1">
            Administrators
          </Badge>
        ) : null}
        {escalated ? (
          <Badge tone="warning" className="mr-1.5 mb-1">
            Escalated
          </Badge>
        ) : null}
        {!escalated ? (
          <Badge tone="warning" className="mr-1.5 mb-1">
            {request.status}
          </Badge>
        ) : null}
      </View>

      <Text size="base" weight="semibold">
        {REQUEST_TYPE_LABELS[request.type] ?? request.type}
      </Text>
      <Subtitle numberOfLines={1}>
        {rep}
        {attendanceDate ? ` · ${attendanceDate}` : ''}
        {checkInLabel ? ` · ${checkInLabel}` : ''}
      </Subtitle>

      {stepLabel ? (
        <Text size="xs" tone="muted" className="mt-1">
          {stepLabel}
          {owner
            ? ` · Waiting on: ${owner}`
            : isAdminQueue
              ? ' · Waiting on administrators'
              : ''}
        </Text>
      ) : null}

      {request.reason ? (
        <View className="mt-2">
          <Text size="xs" tone="muted">
            Reason
          </Text>
          <Text size="sm">{request.reason}</Text>
        </View>
      ) : null}

      {(requestedIn || requestedOut) ? (
        <View className="mt-2 flex-row items-center">
          <Clock size={14} color="#64748b" />
          <Text size="xs" tone="muted" className="ml-1.5">
            Requested:&nbsp;
            {requestedIn ? `in ${requestedIn}` : ''}
            {requestedIn && requestedOut ? ' · ' : ''}
            {requestedOut ? `out ${requestedOut}` : ''}
          </Text>
        </View>
      ) : null}

      {slaLine ? (
        <View className="mt-2">
          <Badge tone={gov?.slaMinutesRemaining != null && gov.slaMinutesRemaining < 0 ? 'warning' : 'muted'}>
            {slaLine}
          </Badge>
        </View>
      ) : null}

      {submittedAt ? (
        <Text size="xs" tone="muted" className="mt-2">
          Submitted {submittedAt}
        </Text>
      ) : null}

      {!canAct && gov?.viewerReadOnlyReason ? (
        <Text size="xs" tone="muted" className="mt-2">
          {gov.viewerReadOnlyReason}
        </Text>
      ) : null}

      <View className="flex-row mt-3">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 mr-2"
          loading={busy}
          disabled={!canAct}
          onPress={onRejectClick}
          leftIcon={<XCircle size={14} color="#ef4444" />}
        >
          Reject
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 mr-2"
          loading={busy}
          disabled={!canAct}
          onPress={onEscalateClick}
          leftIcon={<ArrowUpRightFromCircle size={14} color="#0f172a" />}
        >
          Higher
        </Button>
        <Button
          size="sm"
          className="flex-1"
          loading={busy}
          disabled={!canAct}
          onPress={onApprove}
          leftIcon={<CheckCircle2 size={14} color="#fff" />}
        >
          Approve
        </Button>
      </View>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

interface RejectDialogProps {
  request: AttendanceRequest | null;
  note: string;
  busy: boolean;
  onNoteChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const RejectDialog: React.FC<RejectDialogProps> = ({
  request,
  note,
  busy,
  onNoteChange,
  onClose,
  onConfirm,
}) => {
  const valid = note.trim().length >= REJECT_NOTE_MIN;
  return (
    <Modal
      visible={!!request}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-center px-6">
        <Pressable className="bg-card rounded-2xl p-4">
          <Text size="lg" weight="semibold">
            Reject request
          </Text>
          <Text size="xs" tone="muted" className="mt-1 mb-3">
            A short note helps the employee and keeps the audit trail clear.
            Required for audit (at least {REJECT_NOTE_MIN} characters).
          </Text>
          <TextField
            label="Reason"
            value={note}
            onChangeText={onNoteChange}
            multiline
            numberOfLines={3}
            autoFocus
            placeholder="Explain why this is being rejected"
          />
          <View className="flex-row mt-2">
            <Button
              variant="outline"
              onPress={onClose}
              className="flex-1 mr-2"
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onPress={onConfirm}
              loading={busy}
              disabled={!valid}
              className="flex-1"
              leftIcon={<XCircle size={14} color="#fff" />}
            >
              Reject
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

interface EscalateDialogProps {
  request: AttendanceRequest | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const EscalateDialog: React.FC<EscalateDialogProps> = ({
  request,
  busy,
  onClose,
  onConfirm,
}) => (
  <Modal
    visible={!!request}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-center px-6">
      <Pressable className="bg-card rounded-2xl p-4">
        <Text size="lg" weight="semibold">
          Move this request up?
        </Text>
        <Text size="sm" tone="muted" className="mt-1 mb-3">
          The next approver in your company path will receive it, or it may go
          to the administrator queue.
        </Text>
        <View className="flex-row">
          <Button
            variant="outline"
            onPress={onClose}
            className="flex-1 mr-2"
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onPress={onConfirm}
            loading={busy}
            className="flex-1"
            leftIcon={<ArrowUpRightFromCircle size={14} color="#fff" />}
          >
            Confirm
          </Button>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

/* ------------------------------------------------------------------ */
/* Weekly plans queue (unchanged behavior)                             */
/* ------------------------------------------------------------------ */

const WeeklyPlansQueue: React.FC<QueueProps> = ({ qc, toast }) => {
  const pushWithReturn = usePushWithReturn();
  const [rejectFor, setRejectFor] = React.useState<WeeklyPlan | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const list = useQuery({
    queryKey: ['plans', 'pending'],
    queryFn: () => weeklyPlansApi.pendingApprovals(),
  });

  const approve = useMutation({
    mutationFn: (id: ID) => weeklyPlansApi.approve(id),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Plan approved' });
      qc.invalidateQueries({ queryKey: ['plans', 'pending'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not approve' });
    },
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: ID; reason: string }) =>
      weeklyPlansApi.reject(id, reason),
    onSuccess: () => {
      toast.show({ tone: 'info', message: 'Plan rejected' });
      qc.invalidateQueries({ queryKey: ['plans', 'pending'] });
      setRejectFor(null);
      setRejectReason('');
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not reject' });
    },
  });

  if (list.isLoading) {
    return (
      <View className="px-4">
        <SkeletonRow count={4} />
      </View>
    );
  }
  if (!list.data || list.data.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck size={28} color="#94a3b8" />}
        title="Nothing to approve"
        description="Your team's weekly plans are all up to date."
      />
    );
  }

  return (
    <>
    <FlatList
      data={list.data}
      keyExtractor={(p) => p._id}
      contentContainerClassName="px-4 pt-1 pb-8"
      ItemSeparatorComponent={() => <View className="h-2" />}
      refreshControl={
        <RefreshControl
          refreshing={list.isFetching && !list.isLoading}
          onRefresh={() => list.refetch()}
        />
      }
      renderItem={({ item }) => {
        const rep =
          item.medicalRepId && typeof item.medicalRepId === 'object'
            ? (item.medicalRepId as { name?: string }).name
            : null;
        const weekStart = item.weekStartDate ? parseISO(item.weekStartDate) : null;
        return (
          <Card>
            <Pressable onPress={() => pushWithReturn(`/plan/${item._id}`)}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text size="base" weight="semibold" numberOfLines={1}>
                    {rep ?? 'Field rep'}
                  </Text>
                  <Subtitle>
                    Week of{' '}
                    {weekStart && isValid(weekStart) ? format(weekStart, 'd MMM') : '—'}
                  </Subtitle>
                  <Text size="xs" tone="muted" className="mt-1">
                    Tap to review day-wise plan
                  </Text>
                </View>
                <Badge tone="warning">SUBMITTED</Badge>
              </View>
            </Pressable>
            <View className="flex-row mt-3">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 mr-2"
                onPress={() => {
                  setRejectReason('');
                  setRejectFor(item);
                }}
                leftIcon={<XCircle size={14} color="#ef4444" />}
              >
                Reject
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onPress={() => approve.mutate(item._id)}
                leftIcon={<CheckCircle2 size={14} color="#fff" />}
              >
                Approve
              </Button>
            </View>
          </Card>
        );
      }}
    />

      <Modal
        visible={!!rejectFor}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectFor(null)}
      >
        <Pressable
          onPress={() => setRejectFor(null)}
          className="flex-1 bg-black/40 justify-center px-6"
        >
          <Pressable className="bg-card rounded-2xl p-4">
            <Text size="lg" weight="semibold">
              Reject weekly plan
            </Text>
            <Text size="xs" tone="muted" className="mt-1 mb-3">
              Tell the rep why this plan is being rejected.
            </Text>
            <TextField
              label="Reason"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              autoFocus
              placeholder="Explain what needs to change"
            />
            <View className="flex-row mt-2">
              <Button
                variant="outline"
                className="flex-1 mr-2"
                disabled={reject.isPending}
                onPress={() => setRejectFor(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={reject.isPending}
                disabled={!rejectReason.trim()}
                onPress={() => {
                  if (!rejectFor) return;
                  reject.mutate({ id: rejectFor._id, reason: rejectReason.trim() });
                }}
                leftIcon={<XCircle size={14} color="#fff" />}
              >
                Reject
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
