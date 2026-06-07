import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/state/authStore';

let handlerConfigured = false;

/**
 * Remote push requires a development or production build (EAS).
 * Expo Go SDK 53+ cannot register Android push tokens — skip import entirely.
 */
export function isPushSupportedInThisBuild(): boolean {
  if (Platform.OS === 'web') return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

export async function registerPushNotifications(): Promise<void> {
  if (!isPushSupportedInThisBuild()) return;

  const cfg = useAuthStore.getState().serverConfig;
  if (!cfg?.push?.enabled) return;

  let Notifications: typeof import('expo-notifications');
  try {
    Notifications = await import('expo-notifications');
  } catch {
    return;
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
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }
  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    if (token) {
      await authApi.updatePushToken(token);
    }
  } catch {
    /* Token fetch can fail in simulators or misconfigured builds — non-fatal. */
  }
}
