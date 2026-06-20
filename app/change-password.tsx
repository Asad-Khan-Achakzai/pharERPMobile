import * as React from 'react';
import { useRouter } from 'expo-router';
import { FormScreen } from '@/ui/FormScreen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/state/authStore';

export default function ChangePassword() {
  const router = useRouter();
  const toast = useToast();
  const [cur, setCur] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function onSave() {
    if (next.length < 6) {
      toast.show({ tone: 'warning', message: 'Password must be at least 6 characters' });
      return;
    }
    if (next !== confirm) {
      toast.show({ tone: 'warning', message: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(cur, next);
      toast.show({
        tone: 'success',
        message: 'Password changed. Sign in again to continue.',
      });
      await useAuthStore.getState().signOut();
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not change password' });
    } finally {
      setLoading(false);
    }
  }

  const canSave = !!cur && !!next && !!confirm && next === confirm && next.length >= 6;

  return (
    <FormScreen
      header={
        <Header
          back
          title="Change password"
          subtitle="You will be signed out after saving"
        />
      }
      footer={
        <Button onPress={onSave} loading={loading} disabled={!canSave} fullWidth>
          Save new password
        </Button>
      }
    >
      <Card className="mx-4 mt-2">
        <Subtitle className="mb-4">
          Enter your current password, then choose a new one. Use at least 6 characters.
        </Subtitle>
        <TextField
          label="Current password"
          secureTextEntry
          value={cur}
          onChangeText={setCur}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="next"
          required
        />
        <TextField
          label="New password"
          secureTextEntry
          value={next}
          onChangeText={setNext}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="next"
          helper="Minimum 6 characters"
          required
        />
        <TextField
          label="Confirm new password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="done"
          containerClassName="mb-0"
          required
        />
        {confirm.length > 0 && next.length > 0 && next !== confirm ? (
          <Text size="xs" tone="danger" className="mt-2">
            Passwords do not match
          </Text>
        ) : null}
      </Card>
    </FormScreen>
  );
}
