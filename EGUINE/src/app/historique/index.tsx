import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { showLocalizedAlert } from '@/i18n/alert';
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from '@/i18n/localized-components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { getChantHistory, removeChantHistoryEntry, clearChantHistory } from '@/database/chant-database';
import type { ChantHistoryEntry } from '@/database/chant-database';
import type { Celebration } from '@/types';
import { goBackSafely } from '@/utils/navigation';
import { ActionColors } from '@/constants/theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useTranslation } from '@/i18n/use-translation';

const COLORS = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  ink: '#0A1F44',
  muted: '#607087',
  accent: ActionColors.primary,
  border: '#E7EAF0',
};

function routeTitle(path: string): string {
  if (path.startsWith('/mes-chants')) return 'Mes chants personnels';
  if (path.startsWith('/search')) return 'Recherche';
  if (path.startsWith('/priere/')) return 'Consulter une prière';
  if (path.startsWith('/prieres')) return 'Mes prières';
  if (path.startsWith('/saint/')) return 'Découvrir un saint';
  if (path.startsWith('/agenda')) return 'Agenda';
  if (path.startsWith('/notifications')) return 'Notifications';
  if (path.startsWith('/favoris')) return 'Favoris';
  if (path.startsWith('/parametres')) return 'Réglages';
  if (path.startsWith('/profile')) return 'Profil';
  if (path.startsWith('/aide')) return 'Aide';
  return 'Continuer votre activité';
}

function dateLabel(value: string | undefined, language: 'fr' | 'en'): string {
  if (!value) return 'Date non précisée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getPreparationChantCount(celebration: Celebration): number {
  return new Set(Object.values(celebration.selectedChants).flatMap((ids) => ids ?? [])).size;
}

export default function HistoryScreen() {
  const { language } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const chants = useAppStore((state) => state.chants);
  const personalChants = useAppStore((state) => state.personalChants);
  const celebrations = useAppStore((state) => state.celebrations);
  const setActiveCelebration = useAppStore((state) => state.setActiveCelebration);
  const duplicateCelebration = useAppStore((state) => state.duplicateCelebration);
  const deleteCelebration = useAppStore((state) => state.deleteCelebration);
  const recentActivities = useAppStore((state) => state.recentActivities);
  const removeRecentActivity = useAppStore((state) => state.removeRecentActivity);
  const clearRecentActivities = useAppStore((state) => state.clearRecentActivities);
  const [chantHistory, setChantHistory] = useState<ChantHistoryEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshHistory = useCallback(() => {
    void getChantHistory()
      .then((entries) => {
        setChantHistory(entries);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        console.error('Impossible de charger l’historique des chants.', error);
        setLoadError('L’historique des chants est momentanément indisponible.');
      });
  }, []);

  useFocusEffect(refreshHistory);

  const visibleActivities = recentActivities.filter(
    (activity) => activity.path !== '/historique'
      && activity.path !== '/messe'
      && !/^\/chant\/[^/]+$/.test(activity.path),
  );
  const preparations = [...celebrations]
    .filter((celebration) => !searchQuery.trim() || celebration.title.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()))
    .sort((a, b) =>
      (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? '')
    );
  const recentPersonalChants = [...personalChants]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 10);

  const confirmClearChantHistory = () => {
    showLocalizedAlert(
      'Effacer l’historique des chants ?',
      'Les chants restent dans votre bibliothèque et vos favoris.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            void clearChantHistory()
              .then(() => setChantHistory([]))
              .catch((error: unknown) => {
                console.error('Impossible d’effacer l’historique des chants.', error);
                showLocalizedAlert('Effacement impossible', 'L’historique n’a pas pu être effacé.');
              });
          },
        },
      ],
    );
  };

  const confirmDeletePreparation = (celebration: Celebration) => {
    showLocalizedAlert(
      'Supprimer cette préparation ?',
      `« ${celebration.title} » et sa sélection de chants seront supprimés. Les chants originaux ne seront pas touchés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteCelebration(celebration.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.topAction}>
          <MaterialCommunityIcons name="chevron-left" size={27} color={theme.textSecondary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Mon historique</Text>
          <Text style={styles.subtitle}>Retrouvez vos chants et préparations</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Chants consultés</Text>
            <Text style={styles.sectionSubtitle}>Les plus récemment ouverts</Text>
          </View>
          {chantHistory.length > 0 && (
            <Pressable accessibilityRole="button" onPress={confirmClearChantHistory} hitSlop={8}>
              <Text style={styles.actionText}>Tout effacer</Text>
            </Pressable>
          )}
        </View>
        {loadError ? (
          <Text accessibilityRole="alert" style={styles.emptyText}>{loadError}</Text>
        ) : chantHistory.length === 0 ? (
          <Text style={styles.emptyText}>Les chants que vous ouvrez apparaîtront ici.</Text>
        ) : chantHistory.map((entry) => {
          const chant = chants.find((item) => item.id === entry.chantId);
          if (!chant) return null;
          return (
            <View key={entry.chantId} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/chant/${entry.chantId}`)}
                style={styles.rowMain}
              >
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name="music-note" size={20} color={COLORS.accent} />
                </View>
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowTitle}>{chant.titre}</Text>
                  <Text numberOfLines={1} style={styles.rowDetail}>
                    {dateLabel(entry.lastViewedAt, language)} · {entry.viewCount} consultation{entry.viewCount === 1 ? '' : 's'}
                  </Text>
                  {entry.listenCount > 0 && (
                    <Text numberOfLines={1} style={styles.rowDetail}>
                      Dernière écoute : {dateLabel(entry.lastListenedAt ?? undefined, language)} · {entry.listenCount} écoute{entry.listenCount === 1 ? '' : 's'}
                    </Text>
                  )}
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${chant.titre} de l’historique`}
                onPress={() => {
                  void removeChantHistoryEntry(entry.chantId)
                    .then(() => setChantHistory((current) => current.filter((item) => item.chantId !== entry.chantId)))
                    .catch((error: unknown) => {
                      console.error(`Impossible de retirer le chant ${entry.chantId} de l’historique.`, error);
                      showLocalizedAlert('Action impossible', 'Ce chant n’a pas pu être retiré de l’historique.');
                    });
                }}
                style={styles.removeButton}
              >
                <MaterialCommunityIcons name="close" size={19} color={theme.textSecondary} />
              </Pressable>
            </View>
          );
        })}

        {recentPersonalChants.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Mes chants personnels</Text>
                <Text style={styles.sectionSubtitle}>Créés ou modifiés récemment</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => router.push('/mes-chants')} hitSlop={8}>
                <Text style={styles.actionText}>Tout voir</Text>
              </Pressable>
            </View>
            {recentPersonalChants.map((chant) => (
              <Pressable
                key={chant.id}
                accessibilityRole="button"
                onPress={() => router.push(`/mes-chants/${chant.id}`)}
                style={styles.row}
              >
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name="music-box-multiple-outline" size={20} color={COLORS.accent} />
                </View>
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowTitle}>{chant.titre}</Text>
                  <Text numberOfLines={1} style={styles.rowDetail}>
                    Modifié le {dateLabel(chant.updated_at, language)}
                    {chant.ressources?.length ? ` · ${chant.ressources.length} fichier(s)` : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Préparations de Messe</Text>
            <Text style={styles.sectionSubtitle}>Enregistrées sur cet appareil</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/messe')} hitSlop={8}>
            <Text style={styles.actionText}>Ouvrir</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color={COLORS.accent} />
          <TextInput
            accessibilityLabel="Rechercher une préparation"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Nom de la messe…"
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        {preparations.length === 0 ? (
          <Text style={styles.emptyText}>{searchQuery.trim() ? 'Aucune préparation ne correspond à cette recherche.' : 'Aucune préparation enregistrée.'}</Text>
        ) : preparations.map((celebration) => (
          <View key={celebration.id} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setActiveCelebration(celebration.id);
                router.push('/messe');
              }}
              style={styles.rowMain}
            >
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="church" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.rowCopy}>
                <Text numberOfLines={1} style={styles.rowTitle}>{celebration.title}</Text>
                <Text numberOfLines={1} style={styles.rowDetail}>
                  {dateLabel(celebration.date, language)} · {getPreparationChantCount(celebration)} chant(s)
                  {celebration.status === 'completed' ? ' · Terminée' : ' · Brouillon'}
                </Text>
                <Text numberOfLines={1} style={styles.rowDetail}>
                  Créée {dateLabel(celebration.created_at, language)} · modifiée {dateLabel(celebration.updated_at, language)}
                </Text>
              </View>
            </Pressable>
            <View style={styles.actionStack}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dupliquer la préparation ${celebration.title}`}
                onPress={() => duplicateCelebration(celebration.id)}
                style={styles.smallAction}
              >
                <MaterialCommunityIcons name="content-copy" size={18} color={COLORS.accent} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Supprimer la préparation ${celebration.title}`}
                onPress={() => confirmDeletePreparation(celebration)}
                style={styles.smallAction}
              >
                <MaterialCommunityIcons name="delete-outline" size={18} color={ActionColors.danger} />
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Autres activités récentes</Text>
            <Text style={styles.sectionSubtitle}>Vos derniers écrans consultés</Text>
          </View>
          {visibleActivities.length > 0 && (
            <Pressable accessibilityRole="button" onPress={clearRecentActivities} hitSlop={8}>
              <Text style={styles.actionText}>Effacer</Text>
            </Pressable>
          )}
        </View>
        {visibleActivities.length === 0 ? (
          <Text style={styles.emptyText}>Les autres activités visitées apparaîtront ici.</Text>
        ) : visibleActivities.map((activity) => (
          <View key={activity.path} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(activity.path as never)}
              style={styles.rowMain}
            >
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="history" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.rowCopy}>
                <Text numberOfLines={1} style={styles.rowTitle}>{routeTitle(activity.path)}</Text>
                <Text numberOfLines={1} style={styles.rowDetail}>{activity.path}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Retirer ${routeTitle(activity.path)} de l’historique`}
              onPress={() => removeRecentActivity(activity.path)}
              style={styles.removeButton}
            >
              <MaterialCommunityIcons name="close" size={19} color={theme.textSecondary} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  topAction: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  title: { color: COLORS.ink, fontSize: 21, fontWeight: '800' },
  subtitle: { color: COLORS.muted, fontSize: 12 },
  content: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 },
  sectionHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  sectionTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { marginTop: 3, color: COLORS.muted, fontSize: 11 },
  actionText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  emptyText: { paddingVertical: 16, color: COLORS.muted, fontSize: 13 },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  rowMain: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#7A1F3D12' },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  rowDetail: { color: COLORS.muted, fontSize: 11 },
  searchBox: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: '#FFFFFF' },
  searchInput: { flex: 1, color: COLORS.ink, fontSize: 13 },
  actionStack: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F4F6F9' },
  removeButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
