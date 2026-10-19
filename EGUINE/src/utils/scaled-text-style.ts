import type { TextStyle } from 'react-native';

export function scaleTextStyle(
  style: TextStyle | undefined,
  scale: number,
  defaultFontSize = 14,
): TextStyle {
  const fontSize = typeof style?.fontSize === 'number' ? style.fontSize : defaultFontSize;
  const scaledFontSize = Math.max(1, Math.round(fontSize * scale));

  return {
    ...style,
    fontSize: scaledFontSize,
    ...(typeof style?.lineHeight === 'number'
      ? { lineHeight: Math.max(1, Math.round(style.lineHeight * scale)) }
      : {}),
    ...(typeof style?.letterSpacing === 'number'
      ? { letterSpacing: style.letterSpacing * scale }
      : {}),
  };
}
