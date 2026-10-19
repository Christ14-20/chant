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
    textSecondary: '#4A4A4A',
    border: '#E5E5E5',
    separator: '#E5E5E5',
    primary: '#7A1F3D',
  },
  dark: {
    background: '#000000',
    backgroundElement: '#111111',
    backgroundSelected: '#7A1F3D',
    text: '#F5F5F5',
    textSecondary: '#B8B8B8',
    border: '#2B2B2B',
    separator: '#2B2B2B',
    primary: '#7A1F3D',
  },
} as const;

export const ActionColors = {
  primary: '#7A1F3D',
  playback: '#7A1F3D',
  discovery: '#725A61',
  success: '#52765F',
  danger: '#A34B50',
  warning: '#D3A55B',
  info: '#7A1F3D',
  neutral: '#333333',
  primarySoft: '#F4E9ED',
  playbackSoft: '#F4E9ED',
  discoverySoft: '#F1ECEE',
  successSoft: '#EDF3EE',
  dangerSoft: '#F8EEEE',
  warningSoft: '#F9F0E6',
  infoSoft: '#F4E9ED',
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
