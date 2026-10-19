import React from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  Pressable as NativePressable,
  StyleSheet,
  type PressableProps,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { useFontSize } from '@/hooks/use-font-size';
import { useTranslation } from '@/i18n/use-translation';
import { scaleTextStyle } from '@/utils/scaled-text-style';

function translateChildren(children: React.ReactNode, t: (source: string) => string): React.ReactNode {
  if (typeof children === 'string') return t(children);
  if (Array.isArray(children)) return children.map((child, index) => (
    <React.Fragment key={index}>{translateChildren(child, t)}</React.Fragment>
  ));
  return children;
}

export function LocalizedText({ children, ...props }: TextProps) {
  const { t } = useTranslation();
  const { scale } = useFontSize();
  return (
    <NativeText
      {...props}
      style={scaleTextStyle(StyleSheet.flatten(props.style), scale)}
    >
      {translateChildren(children, t)}
    </NativeText>
  );
}

export const LocalizedTextInput = React.forwardRef<NativeTextInput, TextInputProps>(
  function LocalizedTextInput({ placeholder, accessibilityLabel, accessibilityHint, ...props }, ref) {
    const { t } = useTranslation();
    const { scale } = useFontSize();
    return (
      <NativeTextInput
        {...props}
        ref={ref}
        style={scaleTextStyle(StyleSheet.flatten(props.style), scale)}
        placeholder={typeof placeholder === 'string' ? t(placeholder) : placeholder}
        accessibilityLabel={typeof accessibilityLabel === 'string' ? t(accessibilityLabel) : accessibilityLabel}
        accessibilityHint={typeof accessibilityHint === 'string' ? t(accessibilityHint) : accessibilityHint}
      />
    );
  },
);

export const LocalizedPressable = React.forwardRef<
  React.ElementRef<typeof NativePressable>,
  PressableProps
>(function LocalizedPressable({ accessibilityLabel, accessibilityHint, ...props }, ref) {
  const { t } = useTranslation();
  return (
    <NativePressable
      {...props}
      ref={ref}
      accessibilityLabel={typeof accessibilityLabel === 'string' ? t(accessibilityLabel) : accessibilityLabel}
      accessibilityHint={typeof accessibilityHint === 'string' ? t(accessibilityHint) : accessibilityHint}
    />
  );
});
