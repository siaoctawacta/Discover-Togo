import { palette } from './palette';

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryText: string;
  brand: string;
  brandDeep: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  star: string;
  overlay: string;
  overlayStrong: string;
  glass: string;
  tabBar: string;
  tabActiveBg: string;
  tabActiveIcon: string;
  tabInactiveIcon: string;
  skeleton: string;
  kente: readonly string[];
  kind: { place: string; restaurant: string; hotel: string };
}

export const lightColors: ColorTokens = {
  background: palette.white,
  surface: palette.white,
  surfaceMuted: palette.grey100,
  surfaceElevated: palette.white,
  border: palette.grey200,
  text: palette.ink,
  textMuted: palette.grey500,
  textInverse: palette.white,
  primary: palette.ink,
  primaryText: palette.white,
  brand: palette.forest,
  brandDeep: palette.forestDeep,
  accent: palette.teal,
  danger: palette.togoRed,
  success: palette.togoGreen,
  warning: palette.gold,
  star: palette.star,
  overlay: 'rgba(0,0,0,0.35)',
  overlayStrong: 'rgba(0,0,0,0.55)',
  glass: 'rgba(255,255,255,0.28)',
  tabBar: palette.grey100,
  tabActiveBg: palette.ink,
  tabActiveIcon: palette.white,
  tabInactiveIcon: palette.grey500,
  skeleton: palette.grey200,
  kente: [palette.togoGreen, palette.togoYellow, palette.togoRed, palette.gold],
  kind: { place: palette.togoGreen, restaurant: palette.gold, hotel: palette.teal },
};

export const darkColors: ColorTokens = {
  background: palette.forestNight,
  surface: palette.forestDarker,
  surfaceMuted: '#22331F',
  surfaceElevated: '#263A22',
  border: '#33482E',
  text: '#F3F5F0',
  textMuted: '#A9B5A5',
  textInverse: palette.white,
  primary: palette.white,
  primaryText: palette.ink,
  brand: '#5E8A55',
  brandDeep: palette.forestDeep,
  accent: palette.teal,
  danger: '#FF5A6E',
  success: '#3FB68B',
  warning: palette.gold,
  star: palette.star,
  overlay: 'rgba(0,0,0,0.45)',
  overlayStrong: 'rgba(0,0,0,0.65)',
  glass: 'rgba(255,255,255,0.18)',
  tabBar: palette.forestDarker,
  tabActiveBg: palette.white,
  tabActiveIcon: palette.ink,
  tabInactiveIcon: '#8FA08A',
  skeleton: '#2A3D26',
  kente: [palette.togoGreen, palette.togoYellow, palette.togoRed, palette.gold],
  kind: { place: '#3FB68B', restaurant: palette.gold, hotel: palette.teal },
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const fontSizes = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, display: 32 } as const;

export interface Theme {
  dark: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  fonts: typeof fonts;
  fontSizes: typeof fontSizes;
}

export const lightTheme: Theme = { dark: false, colors: lightColors, spacing, radius, fonts, fontSizes };
export const darkTheme: Theme = { dark: true, colors: darkColors, spacing, radius, fonts, fontSizes };
