import { Platform } from 'react-native';

// Legacy exports — keep for old components (explore, themed-text, etc.)
export const Fonts = {
  mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
} as const;

export type ThemeColor = 'text' | 'textSecondary' | 'background' | 'backgroundElement' | 'border';

export const Spacing = {
  one: 4, two: 8, three: 12, four: 16, five: 20, six: 24, seven: 28, eight: 32,
} as const;

const _theme = {
  text: '#e5e2e1',
  textSecondary: '#888',
  background: '#131313',
  backgroundElement: '#1a1a1a',
  border: '#2a2a2a',
};
export const Colors = { light: _theme, dark: _theme };

export const C = {
  bg: '#131313',
  surface: '#1a1a1a',
  surfaceHigh: '#252525',
  border: '#2a2a2a',
  borderLight: '#333',
  primary: '#f65b69',
  primaryDim: '#ffb3b4',
  text: '#e5e2e1',
  textSub: '#c8c6c5',
  muted: '#999',
  mutedLight: '#bbb',
  success: '#4ADE80',
  error: '#ff6b6b',
  empuje: '#f65b69',
  traccion: '#60a5fa',
  pierna: '#34d399',
  skill: '#fbbf24',
} as const;

export const CAT_COLOR: Record<string, string> = {
  EMPUJE: C.empuje,
  TRACCION: C.traccion,
  PIERNA: C.pierna,
  SKILL: C.skill,
};

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 480;
