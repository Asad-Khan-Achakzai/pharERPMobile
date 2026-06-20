import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { queryClient } from '@/data/queryClient';
import { ToastProvider } from '@/ui/Toast';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ThemedAppShell } from '@/theme/ThemedAppShell';
import { initDb } from '@/data/db';
import { startSyncEngine } from '@/data/syncEngine';
import { MasterDataSyncBridge } from '@/hooks/useMasterDataSync';
import { useAuthStore } from '@/state/authStore';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { PushRegistrationBridge } from '@/features/push/PushRegistrationBridge';
import { NotificationTapBridge } from '@/features/push/NotificationTapBridge';

function LiveTrackingBridge() {
  useLiveTracking();
  return null;
}

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      await initDb();
      await useAuthStore.getState().bootstrap();
      if (mounted) startSyncEngine();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <ThemedAppShell>
            <QueryClientProvider client={queryClient}>
              <BottomSheetModalProvider>
                <ToastProvider>
                  <PushRegistrationBridge />
                  <NotificationTapBridge />
                  <LiveTrackingBridge />
                  <MasterDataSyncBridge />
                  {children}
                </ToastProvider>
              </BottomSheetModalProvider>
            </QueryClientProvider>
          </ThemedAppShell>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
