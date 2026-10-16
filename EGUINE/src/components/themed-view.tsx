import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor | 'card' | 'transparent';
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  if (type === 'transparent') {
    return <View style={style} {...otherProps} />;
  }

  if (type === 'card') {
    return (
      <View
        style={[
          {
            backgroundColor: theme.backgroundElement,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border,
            borderRadius: 12,
          },
          style,
        ]}
        {...otherProps}
      />
    );
  }

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}
