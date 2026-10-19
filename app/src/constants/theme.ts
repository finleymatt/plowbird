import '@/global.css';

import { Platform } from 'react-native';

// Clean, high-contrast palette in the spirit of Uber / DoorDash: white (or true black) canvas,
// near-black type, gray fills instead of outlines, and one vivid orange for the brand and CTAs.
export const Colors = {
  light: {
    text: '#0A0A0A',
    textSecondary: '#5E5E5E',
    background: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E8E8E8',
    backgroundElement: '#F3F3F3',
    backgroundSelected: '#E4E4E4',
    primary: '#FF4F12',
    primaryText: '#FFFFFF',
    inverse: '#0A0A0A',
    inverseText: '#FFFFFF',
    accent: '#276EF1',
    success: '#05944F',
    warning: '#B45309',
    danger: '#E11900',
    stormBg: '#FFF1EB',
    stormBorder: '#FFC7B2',
    tabBar: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    background: '#000000',
    card: '#141414',
    border: '#262626',
    backgroundElement: '#242424',
    backgroundSelected: '#333333',
    primary: '#FF5A1F',
    primaryText: '#FFFFFF',
    inverse: '#FFFFFF',
    inverseText: '#0A0A0A',
    accent: '#5B97FF',
    success: '#2BB673',
    warning: '#F5A524',
    danger: '#FF5A4F',
    stormBg: '#26140C',
    stormBorder: '#5C2A15',
    tabBar: '#0A0A0A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Palette = (typeof Colors)['light'] | (typeof Colors)['dark'];

export const Fonts = { sans: 'Inter_500Medium', mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) };

const INTER = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
} as const;
// Inter at a given weight. Native platforms need a family per weight, so use this instead of fontWeight.
export const font = (weight: keyof typeof INTER) => ({ fontFamily: INTER[weight] });

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

export const MaxContentWidth = 760;
