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
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  background: '#09090B',
  backgroundElement: '#18181B',
  border: '#3F3F46',
};
export const Colors = { light: _theme, dark: _theme };

export const C = {
  bg: '#09090B',
  surface: '#18181B',
  surfaceHigh: '#27272A',
  border: '#27272A',
  borderLight: '#3F3F46',
  primary: '#FF2A5F',
  primaryDim: '#FF2A5F33',
  text: '#FAFAFA',
  textSub: '#A1A1AA',
  muted: '#71717A',
  mutedLight: '#A1A1AA',
  success: '#10B981',
  error: '#EF4444',
  empuje: '#FF2A5F',
  traccion: '#00E5FF',
  pierna: '#A855F7',
  skill: '#EAB308',
} as const;

export const CAT_COLOR: Record<string, string> = {
  EMPUJE: C.empuje,
  TRACCION: C.traccion,
  PIERNA: C.pierna,
  SKILL: C.skill,
};

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 480;
