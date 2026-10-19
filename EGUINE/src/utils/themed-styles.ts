import { Appearance, StyleSheet } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

function parseHexColor(value: string): [number, number, number] | null {
  const match = value.match(/^#([0-9a-f]{3,8})$/i);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3 || hex.length === 4) {
    hex = [...hex].slice(0, 3).map((digit) => `${digit}${digit}`).join('');
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)) as [number, number, number];
}

function isAccent([red, green, blue]: [number, number, number]): boolean {
  return red > 90 && red < 160 && green < 70 && blue > 35 && blue < 100;
}

function darkColor(property: string, value: unknown): unknown {
  if (typeof value !== 'string' || !property.toLowerCase().includes('color')) return value;
  const rgb = parseHexColor(value);
  if (!rgb) return value;
  const [red, green, blue] = rgb;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  if (property === 'backgroundColor') {
    if (brightness > 225) return '#0A1F44';
    if (brightness > 180 && !isAccent(rgb)) return '#12294D';
    return value;
  }
  if (property.toLowerCase().includes('border')) {
    if (brightness < 100) return '#FFFFFF66';
    if (brightness > 180) return '#FFFFFF40';
    return value;
  }
  if (property === 'shadowColor') return '#000000';
  if (isAccent(rgb)) return '#D98BA0';
  if (brightness < 150) return '#FFFFFF';
  if (brightness < 205) return '#C9D4E4';
  return value;
}

function transformStyles<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => transformStyles(item)) as T;
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, typeof child === 'string' ? darkColor(key, child) : transformStyles(child)])
  ) as T;
}

export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(definitions: T): T {
  const lightStyles = StyleSheet.create(definitions);
  const darkStyles = StyleSheet.create(transformStyles(definitions));

  return new Proxy(lightStyles, {
    get(target, property, receiver) {
      if (typeof property !== 'string' || !(property in definitions)) {
        return Reflect.get(target, property, receiver);
      }
      const mode = useAppStore.getState().themeMode;
      const dark = mode === 'dark' || (mode === 'system' && Appearance.getColorScheme() === 'dark');
      const key = property as keyof T;
      return dark ? darkStyles[key] : target[key];
    },
  });
}
