import * as React from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AppProviders } from '@/providers/AppProviders';
import { useAuthStore } from '@/state/authStore';
import {
  FIELD_SHELL,
  canOpenManagerLeaf,
  landingRouteForUser,
} from '@/auth/navigation';
import '../global.css';
/** Background location task — must load before the app tree mounts. */
import '@/features/tracking/backgroundLocationTask';

/**
 * RouterGuard — field-first navigation (Web Parity Contract §3).
 *
 * Every authenticated tenant user locks to the `(tabs)` shell (Home, Visits,
 * Doctors, Orders, More). Manager workflows (approvals, team attendance) live
 * under `(manager)/*` as stack screens opened from More — never as the root
 * tab tree. This prevents medical reps from landing on a manager shell where
 * Home/Team is hidden and only Approvals remains visible.
 */
function RouterGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { bootstrapped, accessToken, user } = useAuthStore();

  const lockedHome = React.useMemo(() => {
    if (!user) return null;
    return landingRouteForUser(user);
  }, [user?._id, user?.permissions?.join('|')]);

  React.useEffect(() => {
    if (!bootstrapped) return;
    const inAuth = segments[0] === '(auth)';
    const signedIn = !!accessToken && !!user;
    if (!signedIn) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }
    if (inAuth && lockedHome) {
      router.replace(lockedHome);
      return;
    }

    /**
     * Block manager *root* (team dashboard) when the user should be on the
     * field shell, but allow stack leaves (`/approvals`, `/attendance`) when
     * the user has the matching permission.
     */
    const inManagerGroup = segments[0] === '(manager)';
    if (inManagerGroup && lockedHome === FIELD_SHELL) {
      const leaf = segments[1];
      /** `(manager)/more` is deprecated — use `(tabs)/more`. */
      if (leaf === undefined || leaf === 'more') {
        router.replace(FIELD_SHELL);
        return;
      }
      if (!canOpenManagerLeaf(user, leaf)) {
        router.replace(FIELD_SHELL);
      }
    }
  }, [bootstrapped, accessToken, user, segments, lockedHome, router]);

  if (!bootstrapped) {
    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RouterGuard />
    </AppProviders>
  );
}
