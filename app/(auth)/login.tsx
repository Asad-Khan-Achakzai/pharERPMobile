import * as React from 'react';
import { View, Pressable } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Eye, EyeOff } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { Text, H1, H2, Subtitle } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { authApi } from '@/api/auth';
import { syncApi } from '@/api/sync';
import { syncMasterDataAfterLogin } from '@/hooks/useMasterDataSync';
import { useAuthStore } from '@/state/authStore';
import { useThemedIcons } from '@/hooks/useThemedIcons';

export default function LoginScreen() {
  const toast = useToast();
  const icons = useThemedIcons();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [biometricAvailable, setBiometricAvailable] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hardware && enrolled);
    })();
  }, []);

  async function onSubmit() {
    if (!email || !password) {
      toast.show({ tone: 'warning', message: 'Enter email and password' });
      return;
    }
    setLoading(true);
    try {
      const resp = await authApi.login(email.trim(), password);
      await useAuthStore.getState().setSession({
        user: resp.user,
        company: resp.company,
        accessToken: resp.accessToken,
        refreshToken: resp.refreshToken,
      });

      const { schedulePushRegistration } = await import('@/features/push/registerPush');
      void schedulePushRegistration(1500);

      try {
        const cfg = await syncApi.getServerConfig();
        await useAuthStore.getState().setServerConfig(cfg);
        void syncMasterDataAfterLogin(true);
      } catch {
        void syncMasterDataAfterLogin(false);
      }
      /**
       * Role-based redirect is owned by `RouterGuard` in `app/_layout.tsx`.
       * It locks the shell (rep/manager) AFTER bootstrap completes so we never
       * flicker between tabs. Don't call `router.replace` here.
       */
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Login failed' });
    } finally {
      setLoading(false);
    }
  }

  async function tryBiometric() {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock PharmaERP',
    });
    if (!res.success) {
      toast.show({ tone: 'warning', message: 'Biometric cancelled' });
    } else {
      toast.show({ tone: 'info', message: 'Sign in with credentials to continue' });
    }
  }

  return (
    <Screen scroll keyboardAvoid padded background="background">
      <View className="pt-12 pb-8 items-center">
        <View className="h-14 w-14 rounded-2xl bg-primary items-center justify-center mb-4">
          <Text size="2xl" weight="bold" tone="inverse">
            P
          </Text>
        </View>
        <H1>PharmaERP</H1>
        <Subtitle className="mt-1">Field-force execution platform</Subtitle>
      </View>

      <H2 className="mb-1">Welcome back</H2>
      <Subtitle className="mb-6">Sign in with your work credentials</Subtitle>

      <TextField
        label="Email"
        required
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@company.com"
      />
      <TextField
        label="Password"
        required
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPw}
        placeholder="Enter password"
        rightIcon={
          showPw ? (
            <EyeOff size={18} color={icons.muted} />
          ) : (
            <Eye size={18} color={icons.muted} />
          )
        }
        onRightIconPress={() => setShowPw((v) => !v)}
      />

      <Pressable
        onPress={() => toast.show({ tone: 'info', message: 'Ask your admin to reset your password.' })}
        className="self-end -mt-2 mb-4"
      >
        <Text size="sm" tone="primary" weight="medium">
          Forgot password?
        </Text>
      </Pressable>

      <Button onPress={onSubmit} loading={loading} fullWidth>
        Sign in
      </Button>

      {biometricAvailable ? (
        <Button variant="outline" onPress={tryBiometric} fullWidth className="mt-3">
          Use biometric
        </Button>
      ) : null}

      <View className="mt-12 items-center">
        <Text size="xs" tone="muted">
          By signing in you agree to your company&apos;s usage policy.
        </Text>
      </View>
    </Screen>
  );
}
