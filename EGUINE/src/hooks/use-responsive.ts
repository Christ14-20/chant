import { Dimensions, useWindowDimensions } from 'react-native';

export type BreakPoint = 'xs' | 'sm' | 'md' | 'lg';

const { width: SW, height: SH } = Dimensions.get('window');

export const wp = (pct: number) => (SW * pct) / 100;
export const hp = (pct: number) => (SH * pct) / 100;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const bp: BreakPoint =
    width < 360 ? 'xs' : width < 600 ? 'sm' : width < 900 ? 'md' : 'lg';

  const isSmall = bp === 'xs' || bp === 'sm';
  const isTablet = bp === 'md' || bp === 'lg';

  const cols = isTablet ? 3 : 2;
  const cardWidth = isTablet ? (width - 80) / 3 : (width - 56) / 2;

  const fs = {
    xs: isSmall ? 11 : 13,
    sm: isSmall ? 13 : 14,
    md: isSmall ? 15 : 16,
    lg: isSmall ? 18 : 20,
    xl: isSmall ? 22 : 26,
    xxl: isSmall ? 26 : 32,
  };

  const pad = {
    h: isSmall ? 16 : 24,
    v: isSmall ? 12 : 20,
    top: isSmall ? 48 : 64,
  };

  return { width, height, bp, isSmall, isTablet, hp, wp, cols, cardWidth, fs, pad };
}
