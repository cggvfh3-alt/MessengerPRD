/*
 * Theme context — dark/light with system auto-detect and persistent storage
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  colors: typeof DarkColors;
}

const DarkColors = {
  bg: '#0D1117',
  bgCard: '#161B22',
  bgCardAlt: '#1A2030',
  bgSection: '#21262D',
  primary: '#2DA8FF',
  accent: '#00D4AA',
  success: '#3FB950',
  warning: '#D29922',
  danger: '#F85149',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
  textInverse: '#FFFFFF',
  border: '#30363D',
  borderLight: '#21262D',
  outgoingBubble: '#1D4F8A',
  incomingBubble: '#1C2433',
  inputBg: '#1C2433',
  overlay: 'rgba(0,0,0,0.85)',
  tabBar: '#0D1117',
  tabBarBorder: '#30363D',
  statusBar: 'light' as const,
};

const LightColors: typeof DarkColors = {
  bg: '#F5F7FA',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F0F2F5',
  bgSection: '#E8EAED',
  primary: '#0A84FF',
  accent: '#00C49A',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  textPrimary: '#1C1C1E',
  textSecondary: '#636366',
  textMuted: '#AEAEB2',
  textInverse: '#FFFFFF',
  border: '#D1D1D6',
  borderLight: '#E5E5EA',
  outgoingBubble: '#0A84FF',
  incomingBubble: '#E8EAED',
  inputBg: '#F0F2F5',
  overlay: 'rgba(0,0,0,0.5)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#D1D1D6',
  statusBar: 'dark' as const,
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: true,
  setMode: () => {},
  colors: DarkColors,
});

const STORAGE_KEY = '@itp_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'dark' || v === 'light' || v === 'system') setModeState(v);
      setLoaded(true);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { DarkColors, LightColors };
