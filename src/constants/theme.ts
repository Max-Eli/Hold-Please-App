export type ColorScheme = typeof lightColors;

export const lightColors = {
  background: '#FFFFFF',
  card: '#F5F5F7',
  cardLight: '#EBEBED',
  cardSolid: '#F5F5F7',
  border: '#E5E5EA',
  borderLight: '#D1D1D6',

  primary: '#000000',
  primaryLight: '#000000',
  primaryDark: '#1C1C1E',
  primarySoft: 'rgba(0, 0, 0, 0.05)',
  primaryGlow: 'rgba(0, 0, 0, 0.03)',

  accent: '#000000',
  accentSoft: 'rgba(0, 0, 0, 0.05)',

  success: '#34C759',
  successSoft: 'rgba(52, 199, 89, 0.12)',
  warning: '#FF9500',
  warningSoft: 'rgba(255, 149, 0, 0.12)',
  error: '#FF3B30',
  errorSoft: 'rgba(255, 59, 48, 0.12)',

  textPrimary: '#000000',
  textSecondary: '#6C6C70',
  textMuted: '#AEAEB2',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.4)',

  // Light-specific
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E5EA',
  switchTrack: '#E5E5EA',
  inputBackground: '#F5F5F7',
  modalBackground: '#FFFFFF',
  statusBarStyle: 'dark-content' as const,
};

export const darkColors: ColorScheme = {
  background: '#000000',
  card: '#1C1C1E',
  cardLight: '#2C2C2E',
  cardSolid: '#1C1C1E',
  border: '#2C2C2E',
  borderLight: '#3A3A3C',

  primary: '#FFFFFF',
  primaryLight: '#FFFFFF',
  primaryDark: '#E5E5E5',
  primarySoft: 'rgba(255, 255, 255, 0.08)',
  primaryGlow: 'rgba(255, 255, 255, 0.06)',

  accent: '#FFFFFF',
  accentSoft: 'rgba(255, 255, 255, 0.08)',

  success: '#30D158',
  successSoft: 'rgba(48, 209, 88, 0.12)',
  warning: '#FFD60A',
  warningSoft: 'rgba(255, 214, 10, 0.12)',
  error: '#FF453A',
  errorSoft: 'rgba(255, 69, 58, 0.12)',

  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#48484A',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.85)',

  tabBar: '#000000',
  tabBarBorder: '#2C2C2E',
  switchTrack: '#2C2C2E',
  inputBackground: '#1C1C1E',
  modalBackground: '#1C1C1E',
  statusBarStyle: 'light-content' as const,
};

// Default export for backward compatibility during migration
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 40,
};
