import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldAlert, Clock, CircleCheck } from 'lucide-react-native';
import { FormScreen } from '@/ui/FormScreen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, H2, Subtitle } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { authApi, type DeviceChangeRequest } from '@/api/auth';
import { ApiError } from '@/api/client';

export default function DeviceBlockedScreen() {
  const router = useRouter();
  const toast = useToast();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [expired, setExpired] = React.useState(false);
  const [request, setRequest] = React.useState<DeviceChangeRequest | null>(null);
  const [reason, setReason] = React.useState('');

  const backToLogin = React.useCallback(() => {
    router.replace('/(auth)/login');
  }, [router]);

  const loadStatus = React.useCallback(async () => {
    if (!token) {
      setExpired(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await authApi.getDeviceChangeRequest(token);
      setRequest(r);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setExpired(true);
      } else {
        const msg = (err as { message?: string })?.message;
        toast.show({ tone: 'danger', message: msg ?? 'Could not load request status' });
      }
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function submitRequest() {
    if (!token) {
      setExpired(true);
      return;
    }
    setSubmitting(true);
    try {
      const r = await authApi.requestDeviceChange(token, reason.trim() || undefined);
      setRequest(r);
      setReason('');
      toast.show({ tone: 'success', message: 'Request sent. An admin will review it shortly.' });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setExpired(true);
      } else {
        const msg = (err as { message?: string })?.message;
        toast.show({ tone: 'danger', message: msg ?? 'Could not submit request' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest() {
    if (!token) return;
    setSubmitting(true);
    try {
      const r = await authApi.cancelDeviceChange(token);
      setRequest(r);
      toast.show({ tone: 'info', message: 'Request cancelled.' });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not cancel request' });
    } finally {
      setSubmitting(false);
    }
  }

  const status = request?.status;
  const isPending = status === 'PENDING';
  const isApproved = status === 'APPROVED';
  const canRequest = !expired && !isPending && !isApproved;

  return (
    <FormScreen
      header={<Header back title="Device not registered" subtitle="Mobile access is locked to one device" />}
      footer={
        <Button onPress={backToLogin} variant="secondary" fullWidth>
          Back to sign in
        </Button>
      }
    >
      <Card className="mx-4 mt-2">
        {loading ? (
          <Subtitle>Checking your request status…</Subtitle>
        ) : expired ? (
          <View className="items-center py-2">
            <View className="h-12 w-12 rounded-2xl bg-warning/15 items-center justify-center mb-3">
              <Clock size={24} color="#f59e0b" />
            </View>
            <H2 className="mb-1">Session timed out</H2>
            <Subtitle className="text-center">
              Your device-change session expired. Go back, sign in again, and retry the request.
            </Subtitle>
          </View>
        ) : isApproved ? (
          <View className="items-center py-2">
            <View className="h-12 w-12 rounded-2xl bg-success/15 items-center justify-center mb-3">
              <CircleCheck size={24} color="#22c55e" />
            </View>
            <H2 className="mb-1">Device approved</H2>
            <Subtitle className="text-center mb-4">
              Your device change was approved. Sign in again to start using this device. Your old device has
              been signed out.
            </Subtitle>
            <Button onPress={backToLogin} fullWidth>
              Sign in now
            </Button>
          </View>
        ) : isPending ? (
          <View className="py-2">
            <View className="items-center mb-3">
              <View className="h-12 w-12 rounded-2xl bg-primary/15 items-center justify-center mb-3">
                <Clock size={24} color="#6366f1" />
              </View>
              <H2 className="mb-1">Request pending</H2>
              <Subtitle className="text-center">
                Your device change request is waiting for admin approval. You can sign in from this device once
                it is approved.
              </Subtitle>
            </View>
            <Button onPress={() => void loadStatus()} variant="secondary" fullWidth className="mb-3">
              Check status
            </Button>
            <Button onPress={() => void cancelRequest()} variant="ghost" loading={submitting} fullWidth>
              Cancel request
            </Button>
          </View>
        ) : (
          <View className="py-2">
            <View className="items-center mb-4">
              <View className="h-12 w-12 rounded-2xl bg-danger/15 items-center justify-center mb-3">
                <ShieldAlert size={24} color="#ef4444" />
              </View>
              <H2 className="mb-1">This device isn&apos;t registered</H2>
              <Subtitle className="text-center">
                Your account is linked to a different mobile device. To use this device, request a device
                change. An admin must approve it before you can sign in here.
              </Subtitle>
            </View>
            {status === 'REJECTED' && request?.decisionNote ? (
              <Text size="sm" tone="danger" className="mb-3">
                Previous request rejected: {request.decisionNote}
              </Text>
            ) : null}
            <TextField
              label="Reason (optional)"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Lost my old phone"
              multiline
              containerClassName="mb-4"
            />
            <Button onPress={() => void submitRequest()} loading={submitting} disabled={!canRequest} fullWidth>
              Request device change
            </Button>
          </View>
        )}
      </Card>
    </FormScreen>
  );
}
