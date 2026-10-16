import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';
import { lectures, saints } from '@/data/mockData';
import { useAppStore } from '@/store/useAppStore';

const COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  gold: '#D4AF37',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  blue: '#1877F2',
  rose: '#D96A8E',
  violet: '#8E5A9E',
};

const FILTERS = ['Tout', 'Chants', 'Prières', 'Saints', 'Lectures'] as const;
type SearchFilter = (typeof FILTERS)[number];

const POPULAR_SEARCHES = [
  { title: 'Je louerai ton nom', icon: 'music-note', color: '#3B82F6' },
  { title: 'Peuple de baptisés', icon: 'church', color: COLORS.gold },
  { title: 'Prière du matin', icon: 'hands-pray', color: COLORS.rose },
  { title: 'Adoration', icon: 'book-open-page-variant', color: '#10B981' },
];

export default function SearchScreen() {
  const router = useRouter();
  const chants = useAppStore((state) => state.chants);
  const prieres = useAppStore((state) => state.prieres);
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SearchFilter>('Tout');
  const [recentSearches, setRecentSearches] = useState(['Veni Creator', 'Ave Maria', 'Psaume 23', 'Chapelet']);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const allResults = useMemo(() => {
    if (!normalizedQuery) return { chants: [], prieres: [], saints: [], lectures: [] };
    const matches = (value?: string) => value?.toLocaleLowerCase().includes(normalizedQuery) ?? false;
    return {
      chants: chants.filter((item) => matches(item.titre)),
      prieres: prieres.filter((item) => matches(item.titre)),
      saints: saints.filter((item) => matches(item.nom)),
      lectures: lectures.filter((item) => matches(item.reference) || matches(item.evangile)),
    };
  }, [chants, lectures, normalizedQuery, prieres]);

  const results = selectedFilter === 'Tout' ? allResults : {
    chants: selectedFilter === 'Chants' ? allResults.chants : [],
    prieres: selectedFilter === 'Prières' ? allResults.prieres : [],
    saints: selectedFilter === 'Saints' ? allResults.saints : [],
    lectures: selectedFilter === 'Lectures' ? allResults.lectures : [],
  };
  const totalResults = results.chants.length + results.prieres.length + results.saints.length + results.lectures.length;
  const filterCounts: Record<SearchFilter, number> = {
    Tout: allResults.chants.length + allResults.prieres.length + allResults.saints.length + allResults.lectures.length,
    Chants: allResults.chants.length,
    Prières: allResults.prieres.length,
    Saints: allResults.saints.length,
    Lectures: allResults.lectures.length,
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
          <MaterialCommunityIcons name="arrow-left" size={19} color={COLORS.text} />
        </Pressable>
        <View style={styles.searchField}>
          <MaterialCommunityIcons name="magnify" size={19} color={COLORS.muted} />
          <TextInput
            accessibilityLabel="Rechercher dans l’application"
            autoFocus
            autoCapitalize="none"
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            placeholder="Chants, prières, saints…"
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
          {query.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => setQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={19} color={COLORS.muted} />
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recherches populaires</Text>
              <View style={styles.popularGrid}>
                {POPULAR_SEARCHES.map((item) => (
                  <Pressable key={item.title} onPress={() => openSearch(item.title)} style={styles.popularCard}>
                    <View style={[styles.popularIcon, { backgroundColor: `${item.color}20` }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={17} color={item.color} />
                    </View>
                    <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : totalResults === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="magnify" size={28} color={COLORS.muted} />
            </View>
            <Text style={styles.emptyTitle}>Aucun résultat</Text>
            <Text style={styles.emptySubtitle}>Aucun contenu ne correspond à « {query.trim()} ».</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultSummary}>
              {totalResults} résultat{totalResults > 1 ? 's' : ''} pour « {query.trim()} »
            </Text>
            {results.chants.length > 0 && (
              <ResultSection title={`Chants (${results.chants.length})`}>
                {results.chants.map((chant) => (
                  <ResultRow
                    key={chant.id}
                    icon="music-note"
                    iconColor={COLORS.blue}
                    title={chant.titre}
                    subtitle={`${chant.langue.toUpperCase()} · ${chant.categorie.replace('_', ' ')}`}
                    onPress={() => router.push(`/chant/${chant.id}`)}
                  />
                ))}
              </ResultSection>
            )}
            {results.prieres.length > 0 && (
              <ResultSection title={`Prières (${results.prieres.length})`}>
                {results.prieres.map((priere) => (
                  <ResultRow
                    key={priere.id}
                    icon="hands-pray"
                    iconColor={COLORS.rose}
                    title={priere.titre}
                    subtitle={`${priere.langue.toUpperCase()} · ${priere.categorie}`}
                    onPress={() => router.push(`/priere/${priere.id}`)}
                  />
                ))}
              </ResultSection>
            )}
            {results.saints.length > 0 && (
              <ResultSection title={`Saints (${results.saints.length})`}>
                {results.saints.map((saint) => (
                  <ResultRow
                    key={saint.id}
                    icon="account-outline"
                    iconColor={COLORS.gold}
                    title={saint.nom}
                    subtitle={saint.pays ?? 'Saint du calendrier liturgique'}
                    onPress={() => router.push(`/saint/${saint.id}`)}
                  />
                ))}
              </ResultSection>
            )}
            {results.lectures.length > 0 && (
              <ResultSection title={`Lectures (${results.lectures.length})`}>
                {results.lectures.map((lecture) => (
                  <ResultRow
                    key={lecture.id}
                    icon="book-open-page-variant"
                    iconColor={COLORS.violet}
                    title={lecture.reference ?? 'Lecture du jour'}
                    subtitle={lecture.evangile.slice(0, 100)}
                    onPress={() => router.push('/lecture')}
                  />
                ))}
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
  return (
    <Pressable onPress={onPress} style={styles.resultRow}>
      <View style={[styles.resultIcon, { backgroundColor: `${iconColor}20` }]}>
        <MaterialCommunityIcons name={icon as any} size={19} color={iconColor} />
      </View>
      <View style={styles.resultCopy}>
        <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={15} color={COLORS.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  backButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchField: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderRadius: 12, backgroundColor: COLORS.card },
  input: { flex: 1, minHeight: 44, color: COLORS.text, fontSize: 15 },
  filters: { gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  filterChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, backgroundColor: COLORS.card },
  filterChipActive: { borderColor: COLORS.blue, backgroundColor: '#1877F220' },
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
  resultRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.card },
  resultIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  resultCopy: { flex: 1, gap: 4 },
  rowSubtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  emptyState: { alignItems: 'center', paddingTop: 76, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: COLORS.card },
  emptyTitle: { marginTop: 18, color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptySubtitle: { marginTop: 7, color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});