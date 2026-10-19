/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#FFFFFF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#7A1F3D',
    text: '#000000',
    textSecondary: '#0A1F44',
    border: '#0A1F44',
    separator: '#0A1F44',
    primary: '#7A1F3D',
  },
  dark: {
    background: '#0A1F44',
    backgroundElement: '#0A1F44',
    backgroundSelected: '#7A1F3D',
    text: '#FFFFFF',
    textSecondary: '#FFFFFF',
    border: '#FFFFFF',
    separator: '#FFFFFF',
    primary: '#7A1F3D',
  },
} as const;

export const ActionColors = {
  primary: '#7A1F3D',
  playback: '#315B72',
  discovery: '#477A78',
  success: '#52765F',
  danger: '#A34B50',
  warning: '#D3A55B',
  info: '#5D7CA3',
  neutral: '#0A1F44',
  primarySoft: '#F4E9ED',
  playbackSoft: '#EAF0F3',
  discoverySoft: '#EAF2F1',
  successSoft: '#EDF3EE',
  dangerSoft: '#F8EEEE',
  warningSoft: '#F9F0E6',
  infoSoft: '#ECF2FB',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Avenir Next',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Avenir Next, Spline Sans, sans-serif',
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
export const MaxContentWidth = 800;
