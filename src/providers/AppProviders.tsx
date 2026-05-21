import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '@/data/queryClient';
import { ToastProvider } from '@/ui/Toast';
import { initDb } from '@/data/db';
import { startSyncEngine } from '@/data/syncEngine';
import { useAuthStore } from '@/state/authStore';

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
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              {children}
            </ToastProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
