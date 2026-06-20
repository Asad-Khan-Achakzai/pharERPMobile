import * as React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { useTheme } from '@/theme/ThemeProvider';
import { themeVars } from '@/theme/themeVars';

/** Root shell — paints the page background, syncs CSS variables, and sets status bar style. */
export const ThemedAppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { resolved, colors } = useTheme();

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, vars(themeVars(colors))]}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
};
