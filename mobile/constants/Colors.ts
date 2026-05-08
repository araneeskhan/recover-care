/**
 * RecoverCare Design System
 * Color tokens matching the mockup aesthetic
 */
export const Colors = {
  // Primary palette
  primary: {
    navy: '#0B1F3F',
    navyLight: '#142D54',
    navyDark: '#071529',
    teal: '#1A9E8F',
    tealLight: '#2EC4B6',
    tealDark: '#148578',
  },

  // Neutral palette
  neutral: {
    white: '#FFFFFF',
    offWhite: '#F5F6FA',
    lightGray: '#E8EAF0',
    mediumGray: '#9CA3B0',
    darkGray: '#6B7280',
    charcoal: '#374151',
  },

  // Semantic colors
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

  // Background
  background: {
    primary: '#F5F6FA',
    card: '#FFFFFF',
    dark: '#0B1F3F',
    darkGradientStart: '#0B1F3F',
    darkGradientEnd: '#142D54',
    tealGradientStart: '#1A9E8F',
    tealGradientEnd: '#2EC4B6',
  },

  // Text
  text: {
    primary: '#0B1F3F',
    secondary: '#6B7280',
    tertiary: '#9CA3B0',
    inverse: '#FFFFFF',
    link: '#1A9E8F',
  },

  // Borders
  border: {
    light: '#E8EAF0',
    medium: '#D1D5DB',
    dark: '#9CA3B0',
  },

  // Message bubbles
  message: {
    sent: '#0B1F3F',
    sentText: '#FFFFFF',
    received: '#E8F5F3',
    receivedText: '#0B1F3F',
  },
};

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
