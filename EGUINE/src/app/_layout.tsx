import '../shims/shims';

import { useEffect, useState } from 'react';
import { ActivityIndicator, Appearance, Image, Platform, View } from 'react-native';
import { LocalizedPressable as Pressable, LocalizedText as Text } from '@/i18n/localized-components';
import { Stack, usePathname } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { useStoreHydrated } from '@/hooks/use-store-hydrated';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/use-translation';
import { DiscoveryGuideHost } from '@/components/ui/DiscoveryGuideHost';
import {
  initializeLocalChantDatabase,
  replaceFavorites,
  replaceMassCelebrations,
} from '@/database/chant-database';

export default function RootLayout() {
  const themeMode = useAppStore((state) => state.themeMode);
  const theme = useTheme();
  const { t } = useTranslation();
  const pathname = usePathname();
  const recordRecentActivity = useAppStore((state) => state.recordRecentActivity);
  const isHydrated = useStoreHydrated();
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(themeMode === 'system' ? 'unspecified' : themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    if (databaseReady) recordRecentActivity(pathname);
  }, [databaseReady, pathname, recordRecentActivity]);

  useEffect(() => {
    if (!isHydrated) return;
    let active = true;
    setDatabaseReady(false);
    setDatabaseError(null);
    const state = useAppStore.getState();
    void initializeLocalChantDatabase({
      personalChants: state.personalChants,
      favoriteIds: state.favorites,
      celebrations: state.celebrations,
      hasBootstrappedCelebrations: state.hasBootstrappedCelebrations,
      interfaceLanguage: state.interfaceLanguage,
    })
      .then((initialized) => {
        if (!active) return;
        const activeCelebrationId = state.activeCelebrationId
          && initialized.celebrations.some((celebration) => celebration.id === state.activeCelebrationId)
          ? state.activeCelebrationId
          : initialized.celebrations[0]?.id ?? null;
        useAppStore.setState({
          chants: initialized.chants,
          favorites: initialized.favoriteIds,
          celebrations: initialized.celebrations,
          activeCelebrationId,
          hasBootstrappedCelebrations: initialized.hasBootstrappedCelebrations,
        });
        setDatabaseReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'La base de chants est indisponible.';
        console.error('Initialisation de la bibliothèque locale impossible.', error);
        setDatabaseError(message);
      });
    return () => { active = false; };
  }, [isHydrated, retry]);

  useEffect(() => {
    if (!databaseReady) return;
    return useAppStore.subscribe((state, previous) => {
      if (state.favorites !== previous.favorites) {
        void replaceFavorites(state.favorites).catch((error: unknown) => {
          console.error('Impossible de sauvegarder les favoris dans SQLite.', error);
        });
      }
      if (state.celebrations !== previous.celebrations) {
        void replaceMassCelebrations(state.celebrations).catch((error: unknown) => {
          console.error('Impossible de sauvegarder le programme de Messe dans SQLite.', error);
        });
      }
    });
  }, [databaseReady]);

  if (!databaseReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.background }}>
        {databaseError ? (
          <>
            <Text accessibilityRole="alert" style={{ color: theme.text, fontSize: 15, textAlign: 'center' }}>
              {t('La base de chants est indisponible.')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRetry((value) => value + 1)}
              style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.primary }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t('Réessayer')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Image
              accessibilityLabel="Chorale chantant, logo de Cantique Guinée"
              source={require('../../assets/images/splash-icon.png')}
              resizeMode="contain"
              style={{ width: 220, height: 220, marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 24 }}
            />
            <ActivityIndicator color="#7A1F3D" />
            <Text style={{ marginTop: 12, color: theme.text }}>{t('Ouverture de la bibliothèque hors connexion…')}</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="historique/index" />
      </Stack>
      <DiscoveryGuideHost ready={isHydrated && databaseReady} />
    </>
  );
}
