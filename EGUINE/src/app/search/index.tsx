import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from '@/i18n/localized-components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';
import { useLocalChantSearch } from '@/hooks/use-local-chant-search';
import { ActionColors } from '@/constants/theme';

const COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  gold: '#7A1F3D',
  text: '#0A1F44',
  muted: '#0A1F44',
  border: '#E5E5E5',
  blue: '#725A61',
  rose: '#7A1F3D',
  violet: '#7A1F3D',
};

const FILTERS = ['Tout', 'Chants'] as const;
type SearchFilter = (typeof FILTERS)[number];

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SearchFilter>('Tout');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const {
    items: chantResults,
    total: chantTotal,
    loading: chantsLoading,
    loadingMore,
    hasMore,
    loadMore,
    error: chantSearchError,
  } = useLocalChantSearch({ query: normalizedQuery, enabled: normalizedQuery.length > 0 }, 180);

  const visibleChantCount = selectedFilter === 'Tout' || selectedFilter === 'Chants' ? chantTotal : 0;
  const totalResults = visibleChantCount;
  const filterCounts: Record<SearchFilter, number> = {
    Tout: chantTotal,
    Chants: chantTotal,
  };

  const submitSearch = () => {
    const submitted = query.trim();
    if (submitted) setRecentSearches((recent) => [submitted, ...recent.filter((item) => item !== submitted)].slice(0, 8));
  };

  const openSearch = (value: string) => {
    setQuery(value);
    setSelectedFilter('Tout');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={19} color={theme.textSecondary} />
        </Pressable>
        <View style={styles.searchField}>
          <MaterialCommunityIcons name="magnify" size={19} color={ActionColors.discovery} />
          <TextInput
            accessibilityLabel="Rechercher dans l’application"
            autoFocus
            autoCapitalize="none"
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            placeholder="Rechercher un chant…"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
          {query.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => setQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={19} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {normalizedQuery.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((filter) => {
            const active = selectedFilter === filter;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{filter}</Text>
                <Text style={[styles.filterCount, active && styles.filterCountActive]}>{filterCounts[filter]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {!normalizedQuery ? (
          <>
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recherches récentes</Text>
                  <Pressable onPress={() => setRecentSearches([])}>
                    <Text style={styles.clearLabel}>Effacer</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentSearches}>
                  {recentSearches.map((item) => (
                    <View key={item} style={styles.recentChip}>
                      <Pressable onPress={() => openSearch(item)} style={styles.recentSelect}>
                        <MaterialCommunityIcons name="history" size={15} color="#FFFFFFB3" />
                        <Text numberOfLines={1} style={styles.recentLabel}>{item}</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer ${item}`} onPress={() => setRecentSearches((current) => current.filter((entry) => entry !== item))} style={styles.recentRemove}>
                        <MaterialCommunityIcons name="close" size={14} color="#FFFFFFB3" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        ) : chantSearchError ? (
          <View style={styles.emptyState}>
            <Text accessibilityRole="alert" style={styles.emptySubtitle}>{chantSearchError}</Text>
          </View>
        ) : totalResults === 0 && chantsLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptySubtitle}>Recherche dans la bibliothèque locale…</Text>
          </View>
        ) : totalResults === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="magnify" size={28} color={ActionColors.discovery} />
            </View>
            <Text style={styles.emptyTitle}>Aucun résultat</Text>
            <Text style={styles.emptySubtitle}>Aucun contenu ne correspond à « {query.trim()} ».</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultSummary}>
              {totalResults} résultat{totalResults > 1 ? 's' : ''} pour « {query.trim()} »
            </Text>
            {visibleChantCount > 0 && (
              <ResultSection title={`Chants (${chantTotal})`}>
                {chantResults.map((chant) => (
                  <ResultRow
                    key={chant.id}
                    icon="music-note"
                    iconColor={COLORS.blue}
                    title={chant.titre}
                    subtitle={`${chant.langue.toUpperCase()} · ${chant.categorie.replace('_', ' ')}`}
                    onPress={() => router.push(`/chant/${chant.id}`)}
                  />
                ))}
                {hasMore && (
                  <Pressable accessibilityRole="button" onPress={() => { void loadMore(); }} style={styles.loadMore}>
                    <Text style={styles.clearLabel}>{loadingMore ? 'Chargement…' : 'Charger plus de chants'}</Text>
                  </Pressable>
                )}
              </ResultSection>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.resultList}>{children}</View>
    </View>
  );
}

function ResultRow({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.resultRow}>
      <View style={[styles.resultIcon, { backgroundColor: `${iconColor}20` }]}>
        <MaterialCommunityIcons name={icon as any} size={19} color={iconColor} />
      </View>
      <View style={styles.resultCopy}>
        <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={15} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  backButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchField: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderRadius: 12, backgroundColor: COLORS.card },
  input: { flex: 1, minHeight: 44, color: COLORS.text, fontSize: 15 },
  filters: { gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  filterChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, backgroundColor: COLORS.card },
  filterChipActive: { borderColor: COLORS.blue, backgroundColor: '#7A1F3D20' },
  filterLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  filterLabelActive: { color: COLORS.text },
  filterCount: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  filterCountActive: { color: COLORS.text },
  content: { gap: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  clearLabel: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  recentSearches: { gap: 8 },
  recentChip: { minHeight: 36, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 4, borderRadius: 18, backgroundColor: COLORS.card },
  recentSelect: { maxWidth: 185, minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentLabel: { color: COLORS.text, fontSize: 12 },
  recentRemove: { width: 27, height: 32, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600' },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  popularCard: { width: '49%', minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: COLORS.card },
  popularIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  resultSummary: { color: COLORS.muted, fontSize: 13 },
  resultList: { gap: 6 },
  loadMore: { alignItems: 'center', paddingVertical: 14 },
  resultRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.card },
  resultIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  resultCopy: { flex: 1, gap: 4 },
  rowSubtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  emptyState: { alignItems: 'center', paddingTop: 76, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: COLORS.card },
  emptyTitle: { marginTop: 18, color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptySubtitle: { marginTop: 7, color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});