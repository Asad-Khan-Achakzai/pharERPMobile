import * as React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme/ThemeProvider';

/** Root shell — paints the page background and keeps the OS status bar readable. */
export const ThemedAppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { resolved, colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
};
