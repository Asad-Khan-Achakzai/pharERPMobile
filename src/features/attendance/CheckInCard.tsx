import * as React from 'react';
import { View } from 'react-native';
import { Clock, MapPin, CloudOff } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { SyncStatusBadge } from '@/ui/SyncStatusBadge';
import { TextField } from '@/ui/TextField';
import { useToast } from '@/ui/Toast';
import { SelfieCaptureButton } from '@/ui/media/SelfieCaptureButton';
import { attendanceOffline } from '@/data/attendanceOffline';
import { useFlags } from '@/hooks/useFlags';

export const CheckInCard: React.FC = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const flags = useFlags();
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const todayQ = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceOffline.meToday(),
  });

  const checkIn = useMutation({
    mutationFn: () =>
      attendanceOffline.checkIn({
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (doc) => {
      const pending = doc._localPending;
      toast.show({
        tone: pending ? 'info' : 'success',
        message: pending ? 'Check-in saved offline — will sync automatically' : 'Checked in',
      });
      qc.setQueryData(['attendance', 'today'], doc);
      qc.invalidateQueries({ queryKey: ['dashboard', 'home'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Check-in failed' });
    },
  });

  const checkOut = useMutation({
    mutationFn: () => attendanceOffline.checkOut({ notes: notes.trim() || undefined }),
    onSuccess: (doc) => {
      const pending = doc._localPending;
      toast.show({
        tone: pending ? 'info' : 'success',
        message: pending ? 'Check-out saved offline — will sync automatically' : 'Checked out',
      });
      qc.setQueryData(['attendance', 'today'], doc);
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Check-out failed' });
    },
  });

  const saveNotes = useMutation({
    mutationFn: () => attendanceOffline.updateNotes(notes),
    onSuccess: (doc) => {
      toast.show({
        tone: doc._localPending ? 'info' : 'success',
        message: doc._localPending ? 'Notes saved offline' : 'Notes saved',
      });
      qc.setQueryData(['attendance', 'today'], doc);
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not save notes' });
    },
  });

  const today = todayQ.data;
  React.useEffect(() => {
    if (today?.notes != null) setNotes(today.notes);
  }, [today?.notes]);
  const hasCheckIn = !!today?.checkInTime;
  const hasCheckOut = !!today?.checkOutTime;
  const canCheckIn = today?.canCheckIn ?? !hasCheckIn;
  const canCheckOut = today?.canCheckOut ?? (hasCheckIn && !hasCheckOut);
  const isPendingSync = today?._localPending || today?._syncState === 'pending';

  const headline = (() => {
    if (isPendingSync && !hasCheckOut) return 'Pending sync';
    if (today?.uiStatus === 'SHIFT_CHECKIN_CLOSED') return 'Shift closed';
    if (today?.uiStatus === 'LATE_CHECKIN_REJECTED') return 'Late check-in rejected';
    if (today?.uiStatus === 'LATE_CHECKIN_PENDING') return 'Late check-in pending approval';
    if (hasCheckOut) return 'Day complete';
    if (hasCheckIn) return 'Checked in';
    return 'Start your day';
  })();

  const statusBadge = (() => {
    if (isPendingSync) return null;
    if (today?.uiStatus === 'LATE_CHECKIN_PENDING') return { tone: 'warning' as const, label: 'PENDING' };
    if (today?.uiStatus === 'LATE_CHECKIN_REJECTED') return { tone: 'danger' as const, label: 'REJECTED' };
    if (today?.uiStatus === 'SHIFT_CHECKIN_CLOSED') return { tone: 'muted' as const, label: 'CLOSED' };
    if (today?.lateMinutes && today.lateMinutes > 0)
      return { tone: 'warning' as const, label: `LATE ${today.lateMinutes}m` };
    if (today?.status) return { tone: 'success' as const, label: today.status };
    return null;
  })();

  return (
    <Card className="mx-4 my-2">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 min-w-0 flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-primary-50 items-center justify-center mr-3 shrink-0">
            <Clock size={20} color="#2563eb" />
          </View>
          <View className="flex-1 min-w-0">
            <Text size="base" weight="semibold">
              {headline}
            </Text>
            {hasCheckIn ? (
              <Text size="xs" tone="muted">
                {`In ${format(new Date(today!.checkInTime!), 'HH:mm')}` +
                  (today?.checkOutTime
                    ? ` · Out ${format(new Date(today.checkOutTime!), 'HH:mm')}`
                    : '')}
              </Text>
            ) : (
              <Text size="xs" tone="muted" className="shrink">
                {today?.shiftCheckInClosedMessage ?? 'Check in to begin your route'}
              </Text>
            )}
          </View>
        </View>
        {statusBadge ? (
          <View className="shrink-0">
            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
          </View>
        ) : null}
        <SyncStatusBadge state={isPendingSync ? 'pending' : today?._syncState} className="shrink-0 ml-1" />
      </View>

      {isPendingSync ? (
        <View className="mt-2 flex-row items-center">
          <CloudOff size={14} color="#f59e0b" />
          <Text size="xs" tone="muted" className="ml-1.5">
            Attendance will upload when you reconnect
          </Text>
        </View>
      ) : null}

      <SelfieCaptureButton
        onCapture={() =>
          toast.show({ tone: 'info', message: 'Selfie captured (placeholder).' })
        }
        className="mt-3"
      />

      {!hasCheckIn && canCheckIn ? (
        <TextField
          className="mt-3"
          label="Late reason (optional)"
          value={reason}
          onChangeText={setReason}
          placeholder="Required if your company uses strict late approval"
        />
      ) : null}

      {hasCheckIn && !hasCheckOut ? (
        <TextField
          className="mt-3"
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Field notes for today"
          multiline
        />
      ) : null}

      {flags.attendanceGeofenceEnabled ? (
        <View className="mt-2 flex-row items-center">
          <MapPin size={14} color="#64748b" />
          <Text size="xs" tone="muted" className="ml-1.5">
            GPS location is recorded with check-in and check-out
          </Text>
        </View>
      ) : null}

      <View className="flex-row mt-3">
        {!hasCheckIn ? (
          <Button
            onPress={() => checkIn.mutate()}
            loading={checkIn.isPending}
            disabled={!canCheckIn}
            fullWidth
          >
            Check in
          </Button>
        ) : !hasCheckOut ? (
          <>
            {notes.trim() !== (today?.notes ?? '') ? (
              <Button
                variant="outline"
                className="flex-1 mr-2"
                loading={saveNotes.isPending}
                onPress={() => saveNotes.mutate()}
              >
                Save notes
              </Button>
            ) : null}
            <Button
              variant="outline"
              onPress={() => checkOut.mutate()}
              loading={checkOut.isPending}
              disabled={!canCheckOut}
              fullWidth={notes.trim() === (today?.notes ?? '')}
              className={notes.trim() !== (today?.notes ?? '') ? 'flex-1' : undefined}
            >
              Check out
            </Button>
          </>
        ) : (
          <Button variant="secondary" disabled fullWidth>
            Day already closed
          </Button>
        )}
      </View>
    </Card>
  );
};
