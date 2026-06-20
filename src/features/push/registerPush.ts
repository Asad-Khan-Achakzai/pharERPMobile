import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { authApi } from '@/api/auth';
import type { ServerConfig } from '@/domain/types';
import { useAuthStore } from '@/state/authStore';

let handlerConfigured = false;
let registrationInFlight: Promise<PushRegistrationResult> | null = null;

const ANDROID_CHANNEL_ID = 'default';

export type PushRegistrationResult =
  | 'success'
  | 'skipped_unsupported'
  | 'skipped_disabled'
  | 'skipped_unsigned'
  | 'permission_denied'
  | 'missing_project_id'
  | 'token_failed'
  | 'backend_failed';

export function isPushSupportedInThisBuild(): boolean {
  if (Platform.OS === 'web') return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

export function isPushEnabledForCompany(cfg: ServerConfig | null | undefined): boolean {
  if (cfg?.push?.enabled === true || cfg?.company?.mobilePushEnabled === true) return true;
  const company = useAuthStore.getState().company;
  if (company?.mobilePushEnabled === true) return true;
  if (cfg?.push?.enabled === false && cfg?.company?.mobilePushEnabled === false) return false;
  if (company && company.mobilePushEnabled !== false) return true;
  return false;
}

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExtra = extra?.eas?.projectId;
  if (fromExtra) return fromExtra;
  const easConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig;
  return easConfig?.projectId;
}

function logPush(message: string, detail?: unknown) {
  if (detail !== undefined) {
    console.warn(`[push] ${message}`, detail);
  } else {
    console.warn(`[push] ${message}`);
  }
}

export function schedulePushRegistration(delayMs = 1500): Promise<PushRegistrationResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      void registerPushNotifications().then(resolve);
    }, delayMs);
  });
}

export async function registerPushNotifications(): Promise<PushRegistrationResult> {
  if (registrationInFlight) return registrationInFlight;

  registrationInFlight = (async (): Promise<PushRegistrationResult> => {
    if (!isPushSupportedInThisBuild()) {
      logPush('skipped — requires an EAS build, not Expo Go');
      return 'skipped_unsupported';
    }

    if (!useAuthStore.getState().accessToken) {
      logPush('skipped — not signed in');
      return 'skipped_unsigned';
    }

    const cfg = useAuthStore.getState().serverConfig;
    if (!isPushEnabledForCompany(cfg)) {
      logPush('skipped — mobilePushEnabled is off for this company');
      return 'skipped_disabled';
    }

    let Notifications: typeof import('expo-notifications');
    try {
      Notifications = await import('expo-notifications');
    } catch (err) {
      logPush('expo-notifications import failed', err);
      return 'token_failed';
    }

    if (!handlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerConfigured = true;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') {
      logPush('notification permission not granted');
      return 'permission_denied';
    }

    const projectId = easProjectId();
    if (!projectId) {
      logPush('missing extra.eas.projectId');
      return 'missing_project_id';
    }

    let token: string;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenData.data?.trim() ?? '';
      if (!token) {
        logPush('getExpoPushTokenAsync returned empty token');
        return 'token_failed';
      }
    } catch (err) {
      logPush('getExpoPushTokenAsync failed', err);
      return 'token_failed';
    }

    try {
      await authApi.registerDevice();
      await authApi.updatePushToken(token);
      logPush(`token registered (${token.slice(0, 28)}…)`);
      return 'success';
    } catch (err) {
      logPush('backend registration failed', err);
      return err instanceof Error && err.message.includes('push-token')
        ? 'backend_failed'
        : 'token_failed';
    }
  })();

  try {
    return await registrationInFlight;
  } finally {
    registrationInFlight = null;
  }
}

export { ANDROID_CHANNEL_ID };
