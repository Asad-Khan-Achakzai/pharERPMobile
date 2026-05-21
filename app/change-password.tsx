import * as React from 'react';
import { useRouter } from 'expo-router';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { StickyActionBar } from '@/ui/StickyActionBar';
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
    } catch (err: any) {
      toast.show({ tone: 'danger', message: err?.message ?? 'Could not change password' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen padded={false} keyboardAvoid>
      <Header back title="Change password" />
      <Card className="mx-4 mt-2">
        <TextField
          label="Current password"
          secureTextEntry
          value={cur}
          onChangeText={setCur}
          required
        />
        <TextField
          label="New password"
          secureTextEntry
          value={next}
          onChangeText={setNext}
          required
        />
        <TextField
          label="Confirm new password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          required
        />
      </Card>
      <StickyActionBar>
        <Button onPress={onSave} loading={loading} fullWidth>
          Save new password
        </Button>
      </StickyActionBar>
    </Screen>
  );
}
