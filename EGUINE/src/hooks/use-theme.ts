/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/useAppStore';

export function useTheme() {
  const systemScheme = useColorScheme();
  const themeMode = useAppStore((s) => s.themeMode);

  let scheme: 'light' | 'dark';
  if (themeMode === 'light') scheme = 'light';
  else if (themeMode === 'dark') scheme = 'dark';
  else scheme = systemScheme === 'light' || systemScheme === 'dark' ? systemScheme : 'light';

  return Colors[scheme];
}
