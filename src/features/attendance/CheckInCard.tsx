import * as React from 'react';
import { View, Image, Pressable } from 'react-native';
import { Clock, MapPin, CloudOff, X } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { SyncStatusBadge } from '@/ui/SyncStatusBadge';
import { TextField } from '@/ui/TextField';
import { CheckInCardSkeleton } from '@/features/home/homeCardSkeletons';
import { useToast } from '@/ui/Toast';
import { SelfieCaptureButton } from '@/ui/media/SelfieCaptureButton';
import { attendanceOffline } from '@/data/attendanceOffline';
import { subscribeAttendanceRefresh, flushOutbox } from '@/data/syncEngine';
import { outbox } from '@/data/outbox';
import { useFlags } from '@/hooks/useFlags';
import { useMediaPicker, type PickedMedia } from '@/hooks/useMediaPicker';
import { formatLateDuration } from '@/utils/formatDuration';
import { formatDistanceMeters } from '@/utils/formatDistance';
import { resolveAttendanceUiStatus } from '@/utils/attendanceStatus';
import { LiveTrackingConsentSheet } from '@/features/tracking/LiveTrackingConsentSheet';
import { hasAcceptedLiveTrackingConsent } from '@/features/tracking/liveTrackingConsent';
import {
  ensureForegroundLocationPermission,
  isBackgroundLiveTrackingRunning,
} from '@/features/tracking/backgroundLocationService';

export const CheckInCard: React.FC = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const flags = useFlags();
  const { pick } = useMediaPicker();
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [consentOpen, setConsentOpen] = React.useState(false);
  const [trackingActive, setTrackingActive] = React.useState(false);
  const [selfie, setSelfie] = React.useState<PickedMedia | null>(null);

  async function captureSelfie() {
    const picked = await pick({ source: 'camera' });
    if (picked) {
      setSelfie(picked);
      toast.show({ tone: 'success', message: 'Selfie captured' });
    }
  }

  const todayQ = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceOffline.meToday(),
  });

  React.useEffect(() => {
    return subscribeAttendanceRefresh(() => {
      void qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
    });
  }, [qc]);

  const checkIn = useMutation({
    mutationFn: () =>
      attendanceOffline.checkIn({
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (doc) => {
      const pending = doc._localPending;
      const zoneMsg =
        !doc._localPending && doc.attendanceLocationStatus === 'OUT_OF_ZONE'
          ? ' — recorded outside check-in zone'
          : !doc._localPending && doc.attendanceLocationStatus === 'WITHIN_ZONE'
            ? ' — within check-in zone'
            : '';
      toast.show({
        tone: pending
          ? 'info'
          : doc.attendanceLocationStatus === 'OUT_OF_ZONE'
            ? 'warning'
            : 'success',
        message: pending
          ? 'Check-in saved offline — zone status updates after sync'
          : `Checked in${zoneMsg}`,
      });
      qc.setQueryData(['attendance', 'today'], doc);
      qc.invalidateQueries({ queryKey: ['dashboard', 'home'] });
      const attendanceId = (doc as { _id?: string })._id;
      if (selfie && !pending && attendanceId) {
        void outbox
          .enqueueMedia({
            feature: 'attendance',
            kind: 'ATTENDANCE_SELFIE',
            fileUri: selfie.uri,
            mime: selfie.mime,
            size: selfie.size,
            relatedResource: 'attendance',
            relatedId: attendanceId,
          })
          .then(() => flushOutbox())
          .then(() => setSelfie(null))
          .catch(() => undefined);
      }
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
  const uiStatus = resolveAttendanceUiStatus(today);
  React.useEffect(() => {
    if (today?.notes != null) setNotes(today.notes);
  }, [today?.notes]);
  const hasCheckIn = !!today?.checkInTime;
  const hasCheckOut = !!today?.checkOutTime;
  const canCheckIn = today?.canCheckIn ?? !hasCheckIn;
  const canCheckOut = today?.canCheckOut ?? (hasCheckIn && !hasCheckOut);
  const isPendingSync = today?._localPending || today?._syncState === 'pending';

  React.useEffect(() => {
    if (!flags.liveTrackingEnabled || !hasCheckIn || hasCheckOut) {
      setTrackingActive(false);
      return;
    }
    void isBackgroundLiveTrackingRunning().then(setTrackingActive);
    const id = setInterval(() => {
      void isBackgroundLiveTrackingRunning().then(setTrackingActive);
    }, 30_000);
    return () => clearInterval(id);
  }, [flags.liveTrackingEnabled, hasCheckIn, hasCheckOut]);

  const runCheckIn = React.useCallback(() => {
    checkIn.mutate();
  }, [checkIn]);

  const handleCheckInPress = React.useCallback(async () => {
    try {
      if (!flags.liveTrackingEnabled) {
        runCheckIn();
        return;
      }
      const accepted = await hasAcceptedLiveTrackingConsent();
      if (!accepted) {
        setConsentOpen(true);
        return;
      }
      const foregroundGranted = await ensureForegroundLocationPermission();
      if (!foregroundGranted) {
        toast.show({
          tone: 'info',
          message:
            'Location access was not granted. Check-in will continue without GPS — enable location in Settings for zone tracking.',
        });
      }
      runCheckIn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start check-in';
      toast.show({ tone: 'danger', message: msg });
    }
  }, [flags.liveTrackingEnabled, runCheckIn, toast]);

  const headline = (() => {
    if (isPendingSync && !hasCheckOut) return 'Pending sync';
    if (uiStatus === 'SHIFT_CHECKIN_CLOSED') return 'Shift closed';
    if (uiStatus === 'LATE_CHECKIN_REJECTED') return 'Late check-in rejected';
    if (uiStatus === 'LATE_CHECKIN_PENDING') return 'Late check-in pending approval';
    if (hasCheckOut) return 'Day complete';
    if (hasCheckIn) return 'Checked in';
    return 'Start your day';
  })();

  const statusBadge = (() => {
    if (isPendingSync) return null;
    if (uiStatus === 'LATE_CHECKIN_PENDING') return { tone: 'warning' as const, label: 'PENDING' };
    if (uiStatus === 'LATE_CHECKIN_REJECTED') return { tone: 'danger' as const, label: 'REJECTED' };
    if (uiStatus === 'SHIFT_CHECKIN_CLOSED') return { tone: 'muted' as const, label: 'CLOSED' };
    if (today?.lateMinutes && today.lateMinutes > 0) {
      const lateLabel = formatLateDuration(today.lateMinutes);
      return { tone: 'warning' as const, label: lateLabel ? `Late · ${lateLabel}` : 'Late' };
    }
    if (today?.status) return { tone: 'success' as const, label: today.status };
    return null;
  })();

  if (todayQ.isLoading) {
    return <CheckInCardSkeleton />;
  }

  return (
    <>
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

      {flags.attendanceSystemMode === 'CHECKIN_POLICY_V2' && today?.checkInPolicyV2?.enabled ? (
        <View className="mt-2">
          {today.checkInPolicyV2.requiredCheckInLocation ? (
            <View className="flex-row items-start">
              <MapPin size={14} color="#64748b" style={{ marginTop: 2 }} />
              <Text size="xs" tone="muted" className="ml-1.5 flex-1">
                {hasCheckIn
                  ? `Expected check-in: ${today.checkInPolicyV2.requiredCheckInLocation.name}`
                  : `Check in near: ${today.checkInPolicyV2.requiredCheckInLocation.name}${
                      today.checkInPolicyV2.requiredCheckInLocation.radiusMeters
                        ? ` (${today.checkInPolicyV2.requiredCheckInLocation.radiusMeters}m)`
                        : ''
                    }`}
              </Text>
            </View>
          ) : null}
          {hasCheckIn &&
          !isPendingSync &&
          today.attendanceLocationStatus ? (
            <Badge
              tone={today.attendanceLocationStatus === 'WITHIN_ZONE' ? 'success' : 'warning'}
              className="mt-2 self-start"
            >
              {today.attendanceLocationStatus === 'WITHIN_ZONE'
                ? 'Within check-in zone'
                : today.distanceFromCheckInPoint != null
                  ? `Out of zone · ${formatDistanceMeters(today.distanceFromCheckInPoint)} away`
                  : 'Out of check-in zone'}
            </Badge>
          ) : isPendingSync && hasCheckIn ? (
            <Text size="xs" tone="muted" className="mt-2">
              Zone status will update after sync
            </Text>
          ) : null}
        </View>
      ) : null}

      {!hasCheckIn ? (
        selfie ? (
          <View className="mt-3">
            <View className="relative self-start">
              <Image
                source={{ uri: selfie.uri }}
                style={{ width: 96, height: 96, borderRadius: 16 }}
              />
              <Pressable
                onPress={() => setSelfie(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove selfie"
                hitSlop={8}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-foreground/80 items-center justify-center"
              >
                <X size={14} color="#ffffff" />
              </Pressable>
            </View>
            <Text size="xs" tone="muted" className="mt-1.5">
              Selfie ready — it uploads after you check in.
            </Text>
          </View>
        ) : (
          <SelfieCaptureButton onCapture={captureSelfie} className="mt-3" />
        )
      ) : null}

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

      {flags.liveTrackingEnabled && hasCheckIn && !hasCheckOut ? (
        <View className="mt-2 flex-row items-center">
          <MapPin size={14} color={trackingActive ? '#16a34a' : '#f59e0b'} />
          <Text size="xs" tone="muted" className="ml-1.5 shrink">
            {trackingActive
              ? 'Live location sharing is active (including in background)'
              : 'Live tracking enabled — allow background location for continuous updates'}
          </Text>
        </View>
      ) : null}

      <View className="flex-row mt-3">
        {!hasCheckIn ? (
          <Button
            onPress={() => void handleCheckInPress()}
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

    <LiveTrackingConsentSheet
      open={consentOpen}
      onClose={() => setConsentOpen(false)}
      onAccepted={() => runCheckIn()}
    />
    </>
  );
};
