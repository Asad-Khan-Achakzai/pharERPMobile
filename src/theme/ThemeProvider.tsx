import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { Appearance, useColorScheme as useSystemScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { semantic, semanticDark } from '@/theme/tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'pharerp.theme.preference';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  colors: typeof semantic | typeof semanticDark;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyNativeColorScheme(preference: ThemePreference): void {
  if (preference === 'system') {
    Appearance.setColorScheme(null);
    return;
  }
  Appearance.setColorScheme(preference);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useSystemScheme();
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      const next: ThemePreference =
        v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
      setPreferenceState(next);
      applyNativeColorScheme(next);
      setHydrated(true);
    });
  }, []);

  const resolved: 'light' | 'dark' =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const colors = resolved === 'dark' ? semanticDark : semantic;

  React.useEffect(() => {
    if (!hydrated) return;
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background, hydrated]);

  const setPreference = React.useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    applyNativeColorScheme(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const value = React.useMemo(
    () => ({
      preference,
      resolved,
      colors,
      setPreference,
    }),
    [preference, resolved, colors, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      preference: 'light',
      resolved: 'light',
      colors: semantic,
      setPreference: () => undefined,
    };
  }
  return ctx;
}
