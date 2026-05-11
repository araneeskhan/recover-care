/**
 * RecoverCare Design System
 * Color tokens matching the mockup aesthetic
 * Now with Dark Mode support
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Light Theme ───────────────────────────────────────
export const LightColors = {
  primary: {
    navy: '#0B1F3F',
    navyLight: '#142D54',
    navyDark: '#071529',
    teal: '#1A9E8F',
    tealLight: '#2EC4B6',
    tealDark: '#148578',
  },
  neutral: {
    white: '#FFFFFF',
    offWhite: '#F5F6FA',
    lightGray: '#E8EAF0',
    mediumGray: '#9CA3B0',
    darkGray: '#6B7280',
    charcoal: '#374151',
  },
  semantic: {
    success: '#27AE60',
    successLight: '#D4EFDF',
    warning: '#F2994A',
    warningLight: '#FDEBD0',
    error: '#E74C3C',
    errorLight: '#FADBD8',
    info: '#3498DB',
    infoLight: '#D6EAF8',
  },
  background: {
    primary: '#F5F6FA',
    card: '#FFFFFF',
    dark: '#0B1F3F',
    darkGradientStart: '#0B1F3F',
    darkGradientEnd: '#142D54',
    tealGradientStart: '#1A9E8F',
    tealGradientEnd: '#2EC4B6',
  },
  text: {
    primary: '#0B1F3F',
    secondary: '#6B7280',
    tertiary: '#9CA3B0',
    inverse: '#FFFFFF',
    link: '#1A9E8F',
  },
  border: {
    light: '#E8EAF0',
    medium: '#D1D5DB',
    dark: '#9CA3B0',
  },
  message: {
    sent: '#0B1F3F',
    sentText: '#FFFFFF',
    received: '#E8F5F3',
    receivedText: '#0B1F3F',
  },
};

// ─── Dark Theme ────────────────────────────────────────
export const DarkColors = {
  primary: {
    navy: '#0B1F3F',
    navyLight: '#142D54',
    navyDark: '#071529',
    teal: '#2EC4B6',
    tealLight: '#3DD6C8',
    tealDark: '#1A9E8F',
  },
  neutral: {
    white: '#1A1A2E',
    offWhite: '#16213E',
    lightGray: '#1F2B47',
    mediumGray: '#7C8BA1',
    darkGray: '#A0AEC0',
    charcoal: '#CBD5E0',
  },
  semantic: {
    success: '#2ECC71',
    successLight: '#1A3A2A',
    warning: '#F2994A',
    warningLight: '#3A2A1A',
    error: '#E74C3C',
    errorLight: '#3A1A1A',
    info: '#5DADE2',
    infoLight: '#1A2A3A',
  },
  background: {
    primary: '#0F0F1E',
    card: '#1A1A2E',
    dark: '#0B1F3F',
    darkGradientStart: '#0A0A19',
    darkGradientEnd: '#0F1A2E',
    tealGradientStart: '#148578',
    tealGradientEnd: '#1A9E8F',
  },
  text: {
    primary: '#E8EAF0',
    secondary: '#A0AEC0',
    tertiary: '#7C8BA1',
    inverse: '#0B1F3F',
    link: '#2EC4B6',
  },
  border: {
    light: '#1F2B47',
    medium: '#2D3A56',
    dark: '#4A5568',
  },
  message: {
    sent: '#2EC4B6',
    sentText: '#FFFFFF',
    received: '#1F2B47',
    receivedText: '#E8EAF0',
  },
};

// ─── Theme Context ─────────────────────────────────────
type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof LightColors;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: LightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then(val => {
      if (val === 'dark') setIsDark(true);
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    AsyncStorage.setItem('theme_mode', newMode ? 'dark' : 'light').catch(() => {});
  };

  const colors = isDark ? DarkColors : LightColors;

  return React.createElement(ThemeContext.Provider, { value: { isDark, toggleTheme, colors } }, children);
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Default Export (backward-compatible) ──────────────
// Existing screens import `Colors` directly — keep it working
export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
};
