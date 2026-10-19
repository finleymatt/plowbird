import '@/global.css';

import { Platform } from 'react-native';

// Winter palette: deep navy + ice, with safety orange as the action color
// (the same orange as a plow truck's beacon).
export const Colors = {
  light: {
    text: '#0B1B2B',
    textSecondary: '#5B6B7C',
    background: '#F3F7FB',
    card: '#FFFFFF',
    border: '#DCE5EE',
    backgroundElement: '#E8EFF6',
    backgroundSelected: '#D5E2EE',
    primary: '#F26B1D',
    primaryText: '#FFFFFF',
    accent: '#1E5AA8',
    success: '#13824B',
    warning: '#B45309',
    danger: '#C62828',
    stormBg: '#FFF1E8',
    stormBorder: '#F7B58C',
    tabBar: '#FFFFFF',
  },
  dark: {
    text: '#EAF1F8',
    textSecondary: '#93A4B6',
    background: '#08111C',
    card: '#111D2C',
    border: '#1F2F43',
    backgroundElement: '#172638',
    backgroundSelected: '#22364D',
    primary: '#FF7A2E',
    primaryText: '#FFFFFF',
    accent: '#6AA7F0',
    success: '#3CCB7F',
    warning: '#F5A524',
    danger: '#FF6B6B',
    stormBg: '#2A1A10',
    stormBorder: '#7A3E18',
    tabBar: '#0D1826',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Palette = (typeof Colors)['light'] | (typeof Colors)['dark'];

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
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

export const Radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export const MaxContentWidth = 760;
