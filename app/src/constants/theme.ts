import '@/global.css';

import { Platform } from 'react-native';

// Winter palette: fresh-snow white, icy blues and deep navy type, with plow-beacon orange
// reserved for the one main action on each screen.
export const Colors = {
  light: {
    text: '#0B1B2E',
    textSecondary: '#5B6B7C',
    background: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E3EAF2',
    backgroundElement: '#F1F6FB',
    backgroundSelected: '#DCE8F4',
    primary: '#FF5A1F',
    primaryText: '#FFFFFF',
    inverse: '#0B1B2E',
    inverseText: '#FFFFFF',
    accent: '#1E6FD9',
    ice: '#E8F2FC',
    sky: '#CFE4FA',
    success: '#0E9F6E',
    warning: '#B45309',
    danger: '#D92D20',
    stormBg: '#FFF3EC',
    stormBorder: '#FFCDB8',
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
    ice: '#16212E',
    sky: '#1D2C3D',
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

// On the web Inter is one family from Google Fonts with real weights, and a system-font fallback
// while it loads (see public/index.html).
const WEB_SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const Fonts = {
  sans: Platform.OS === 'web' ? WEB_SANS : 'Inter_500Medium',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
};

const INTER = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
} as const;
// Inter at a given weight. Native platforms need a family per weight, so use this instead of fontWeight.
export const font = (weight: keyof typeof INTER) =>
  Platform.OS === 'web' ? { fontFamily: WEB_SANS, fontWeight: weight } : { fontFamily: INTER[weight] };

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
