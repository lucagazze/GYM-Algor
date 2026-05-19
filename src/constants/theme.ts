import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#121214',
    background: '#F8F9FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FFF3E0',
    borderColor: '#E2E8F0',
    textSecondary: '#64748B',
    accent: '#FF9900', // Dorado/Naranja Beast
    accentGlow: 'rgba(255, 153, 0, 0.2)',
    success: '#10B981',
    danger: '#EF4444',
    cardBackground: '#FFFFFF',
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A', // Azul noche / asfalto profundo
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155',
    borderColor: '#334155',
    textSecondary: '#94A3B8',
    accent: '#F59E0B', // Dorado intenso
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    success: '#10B981',
    danger: '#EF4444',
    cardBackground: '#1E293B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 850;
