import * as React from 'react';
import { View } from 'react-native';
import { Clock, MapPin } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { format } from 'date-fns';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { useToast } from '@/ui/Toast';
import { SelfieCaptureButton } from '@/ui/media/SelfieCaptureButton';
import { attendanceApi } from '@/api/attendance';
import { useFlags } from '@/hooks/useFlags';

export const CheckInCard: React.FC = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const flags = useFlags();

  const todayQ = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceApi.meToday(),
  });

  const checkIn = useMutation({
    mutationFn: async () => {
      let coords: { lat?: number; lng?: number } = {};
      if (flags.attendanceGeofenceEnabled) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      }
      return attendanceApi.checkIn(coords);
    },
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Checked in' });
      qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'home'] });
    },
    onError: (err: any) => {
      toast.show({ tone: 'danger', message: err?.message ?? 'Check-in failed' });
    },
  });

  const checkOut = useMutation({
    mutationFn: () => attendanceApi.checkOut(),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Checked out' });
      qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
    },
    onError: (err: any) => {
      toast.show({ tone: 'danger', message: err?.message ?? 'Check-out failed' });
    },
  });

  const today = todayQ.data;
  /**
   * Mirror web `MyAttendanceView`: rely on server-issued `canCheckIn` /
   * `canCheckOut` flags whenever they are present, with safe fallback to
   * `checkInTime` / `checkOutTime` presence so older backends still work.
   */
  const hasCheckIn = !!today?.checkInTime;
  const hasCheckOut = !!today?.checkOutTime;
  const canCheckIn = today?.canCheckIn ?? !hasCheckIn;
  const canCheckOut = today?.canCheckOut ?? (hasCheckIn && !hasCheckOut);

  const headline = (() => {
    if (today?.uiStatus === 'SHIFT_CHECKIN_CLOSED') return 'Shift closed';
    if (today?.uiStatus === 'LATE_CHECKIN_REJECTED') return 'Late check-in rejected';
    if (today?.uiStatus === 'LATE_CHECKIN_PENDING') return 'Late check-in pending approval';
    if (hasCheckOut) return 'Day complete';
    if (hasCheckIn) return 'Checked in';
    return 'Start your day';
  })();

  const statusBadge = (() => {
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
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-primary-50 items-center justify-center mr-3">
            <Clock size={20} color="#2563eb" />
          </View>
          <View>
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
              <Text size="xs" tone="muted">
                {today?.shiftCheckInClosedMessage ?? 'Check in to begin your route'}
              </Text>
            )}
          </View>
        </View>
        {statusBadge ? <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge> : null}
      </View>

      <SelfieCaptureButton
        onCapture={() =>
          toast.show({ tone: 'info', message: 'Selfie captured (placeholder).' })
        }
        className="mt-3"
      />

      {flags.attendanceGeofenceEnabled ? (
        <View className="mt-2 flex-row items-center">
          <MapPin size={14} color="#64748b" />
          <Text size="xs" tone="muted" className="ml-1.5">
            GPS location will be recorded for check-in
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
          <Button
            variant="outline"
            onPress={() => checkOut.mutate()}
            loading={checkOut.isPending}
            disabled={!canCheckOut}
            fullWidth
          >
            Check out
          </Button>
        ) : (
          <Button variant="secondary" disabled fullWidth>
            Day already closed
          </Button>
        )}
      </View>
    </Card>
  );
};
