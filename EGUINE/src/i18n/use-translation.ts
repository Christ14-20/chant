import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { translate } from '@/i18n/translations';

type TranslationVariables = Record<string, string | number>;

export function useTranslation() {
  const storedLanguage = useAppStore((state) => state.interfaceLanguage);
  const [webMounted, setWebMounted] = useState(false);
  useEffect(() => setWebMounted(true), []);
  const language = Platform.OS === 'web' && !webMounted ? 'fr' : storedLanguage;
  const t = useCallback((source: string, variables?: TranslationVariables) =>
    translate(source, language, variables), [language]);
  return { t, language };
}
