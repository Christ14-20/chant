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

function isNavy([red, green, blue]: [number, number, number]): boolean {
  return red === 10 && green === 31 && blue === 68;
}

function withAccentAlpha(value: string): string {
  const hex = value.slice(1);
  if (hex.length === 8) return `#7A1F3D${hex.slice(6)}`;
  if (hex.length === 4) return `#7A1F3D${hex[3].repeat(2)}`;
  return '#7A1F3D';
}

function themedColor(property: string, value: unknown, dark: boolean): unknown {
  if (typeof value !== 'string' || !property.toLowerCase().includes('color')) return value;
  const rgb = parseHexColor(value);
  if (!rgb) return value;
  const [red, green, blue] = rgb;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  const navy = isNavy(rgb);

  if (!dark) {
    if (!navy) return value;
    if (property === 'backgroundColor') return withAccentAlpha(value);
    if (property.toLowerCase().includes('border')) return '#E5E5E5';
    return '#000000';
  }

  if (property === 'backgroundColor') {
    if (navy) return withAccentAlpha(value);
    if (brightness > 225) {
      const hex = value.slice(1);
      return hex.length === 8 && hex.slice(6).toLowerCase() !== 'ff' ? value : '#000000';
    }
    if (brightness > 180 && !isAccent(rgb)) return '#111111';
    return value;
  }
  if (property.toLowerCase().includes('border')) {
    if (navy || brightness < 100) return '#FFFFFF26';
    if (brightness > 180) return '#FFFFFF1F';
    return value;
  }
  if (property === 'shadowColor') return '#000000';
  if (isAccent(rgb)) return '#D98BA0';
  if (navy) return '#F5F5F5';
  if (brightness < 150) return '#FFFFFF';
  if (brightness < 205) return '#B8B8B8';
  return value;
}

function transformStyles<T>(value: T, dark: boolean): T {
  if (Array.isArray(value)) return value.map((item) => transformStyles(item, dark)) as T;
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      typeof child === 'string' ? themedColor(key, child, dark) : transformStyles(child, dark),
    ])
  ) as T;
}

export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(definitions: T): T {
  const lightStyles = StyleSheet.create(transformStyles(definitions, false));
  const darkStyles = StyleSheet.create(transformStyles(definitions, true));

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
