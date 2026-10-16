import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, StyleSheet, TextInput, Animated, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  onSubmit?: (text: string) => void;
  disabled?: boolean;
  testID?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher...',
  placeholderTextColor = '#8E8E93',
  autoFocus = false,
  onFocus,
  onBlur,
  onClear,
  onSubmit,
  disabled = false,
  testID,
}: SearchBarProps) {
  const theme = useTheme();
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value, localValue]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    onFocus?.();
  }, [focusAnim, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    onBlur?.();
  }, [focusAnim, onBlur]);

  const handleChangeText = useCallback((text: string) => {
    setLocalValue(text);
    onChangeText(text);
  }, [onChangeText]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
  }, [onChangeText, onClear]);

  const handleSubmit = useCallback(() => {
    onSubmit?.(localValue);
    inputRef.current?.blur();
  }, [localValue, onSubmit]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, '#208AEF'],
  });

  return (
    <ThemedView style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundElement },
          isFocused && styles.containerFocused,
          disabled && styles.containerDisabled,
          { borderColor },
        ]}
        testID={testID}
      >
        <ThemedView style={styles.iconContainer}>
          <SymbolView name="magnifyingglass" size={18} tintColor={isFocused ? '#208AEF' : '#8E8E93'} />
        </ThemedView>

        <TextInput
          ref={inputRef}
          value={localValue}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          autoFocus={autoFocus}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          style={[styles.input, { color: theme.text }]}
          testID={`${testID}-input`}
        />

        {localValue.length > 0 && (
          <Pressable onPress={handleClear} hitSlop={8} accessibilityLabel="Effacer la recherche" accessibilityRole="button">
            <SymbolView name="xmark.circle.fill" size={18} tintColor="#8E8E93" />
          </Pressable>
        )}
      </Animated.View>

      {isFocused && localValue.length === 0 && (
        <ThemedView style={styles.bottomBar}>
          <ThemedText style={styles.hintText}>Rechercher un chant, une prière ou un thème</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? Spacing.two : Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 2,
  },
  containerFocused: { borderColor: '#208AEF' },
  containerDisabled: { opacity: 0.5 },
  iconContainer: { marginRight: Spacing.two },
  input: { flex: 1, fontSize: 16 },
  bottomBar: { paddingHorizontal: Spacing.four },
  hintText: { fontSize: 12, opacity: 0.7 },
});
