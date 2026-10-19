import { createThemedStyles } from '@/utils/themed-styles';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFontSize } from '@/hooks/use-font-size';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { fs } = useFontSize();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'], fontFamily: Fonts.sans },
        type === 'default' && { ...styles.default, fontSize: fs(16) },
        type === 'title' && { ...styles.title, fontSize: fs(48) },
        type === 'small' && { ...styles.small, fontSize: fs(14) },
        type === 'smallBold' && { ...styles.smallBold, fontSize: fs(14) },
        type === 'subtitle' && { ...styles.subtitle, fontSize: fs(32) },
        type === 'link' && { ...styles.link, fontSize: fs(14) },
        type === 'linkPrimary' && { ...styles.linkPrimary, fontSize: fs(14) },
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = createThemedStyles({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#0A1F44',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
