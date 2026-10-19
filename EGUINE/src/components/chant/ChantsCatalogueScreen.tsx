import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Animated, LayoutAnimation, Platform, Keyboard } from 'react-native';
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from '@/i18n/localized-components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/store/useAppStore';
import { useLocalChantSearch } from '@/hooks/use-local-chant-search';
import { getCategoryCounts, getLanguageCounts, getLiturgicalSeasonCounts } from '@/database/chant-database';
import { ActiveFilters, FilterSheet, type ChantFilters, EMPTY_FILTERS } from '@/components/filters';
import type { Categorie, Langue } from '@/types';
import { ActionColors } from '@/constants/theme';

// ============ DESIGN TOKENS ============
const TOKENS = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  ink: '#000000',
  inkMuted: '#4A4A4A',
  inkSubtle: '#777777',
  gold: '#7A1F3D',
  goldSoft: '#7A1F3D',
  teal: '#725A61',
  tealSoft: '#FFFFFF',
  border: '#E5E5E5',
  pink: '#7A1F3D',
};

// ============ OPTIONS DE FILTRE (chant) ============
// Même système de filtres que Favoris : état partagé ChantFilters, UI partagée.
const CATEGORIES: { value: Categorie; label: string }[] = [
  { value: 'entree', label: 'Entrée' }, { value: 'kyrie', label: 'Kyrie' },
  { value: 'gloria', label: 'Gloria' }, { value: 'psaume', label: 'Psaume' },
  { value: 'acclamation', label: 'Acclamation' }, { value: 'credo', label: 'Credo' },
  { value: 'priere_universelle', label: 'Prière universelle' }, { value: 'offertoire', label: 'Offertoire' },
  { value: 'sanctus', label: 'Sanctus' }, { value: 'agnus_dei', label: 'Agnus Dei' },
  { value: 'communion', label: 'Communion' }, { value: 'action_grace', label: 'Action de grâce' },
  { value: 'chant_final', label: 'Chant final' }, { value: 'louange', label: 'Louange' },
  { value: 'adoration', label: 'Adoration' }, { value: 'penitence', label: 'Pénitence' },
  { value: 'marial', label: 'Marial' }, { value: 'funerailles', label: 'Funérailles' },
  { value: 'autre', label: 'Autre' },
];

const LANGUAGE_LABELS: Record<Langue, string> = {
  fr: 'Français', la: 'Latin', es: 'Espagnol', soussou: 'Soussou', poular: 'Poular', malinke: 'Malinké',
  kissi: 'Kissi', guerze: 'Guerzé', toma: 'Toma', kpele: 'Kpelé', baga: 'Baga',
  loma: 'Loma', mano: 'Mano', kono: 'Kono', en: 'Anglais',
};

const SEASON_LABELS: Record<string, string> = {
  toute_annee: 'Toute l’année',
  avent: 'Avent', noel: 'Noël', careme: 'Carême', triduum_pascal: 'Triduum pascal',
  temps_pascal: 'Temps pascal', temps_ordinaire: 'Temps ordinaire',
};

const MOODS: { id: string; label: string; icon: string; color: string }[] = [
  { id: 'paix', label: "Besoin de paix", icon: 'weather-sunset', color: '#7A1F3D' },
  { id: 'priere', label: 'Je veux prier', icon: 'hands-pray', color: '#725A61' },
  { id: 'adoration', label: 'Je veux adorer', icon: 'heart-outline', color: '#7A1F3D' },
  { id: 'louange', label: 'Je veux louer', icon: 'fire', color: '#7A1F3D' },
  { id: 'consolation', label: 'Consolation', icon: 'hand-heart-outline', color: '#725A61' },
];

const moodOptions = MOODS.map((item) => ({ id: item.id, label: item.label, icon: item.icon, color: item.color }));

export default function ChantsCatalogueScreen() {
  const theme = useTheme();
  const router = useRouter();
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const playChant = useAppStore((state) => state.playChant);
  const languagePref = useAppStore((state) => state.languagePref);

  const [filters, setFilters] = useState<ChantFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ChantFilters>(EMPTY_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [languageCounts, setLanguageCounts] = useState<Record<string, number>>({});
  const [seasonCounts, setSeasonCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    void Promise.all([getCategoryCounts(), getLanguageCounts(), getLiturgicalSeasonCounts()])
      .then(([categories, languages, seasons]) => {
        if (!active) return;
        setCategoryCounts(categories);
        setLanguageCounts(languages);
        setSeasonCounts(seasons);
      })
      .catch((error: unknown) => {
        console.error('Impossible de charger les totaux du catalogue.', error);
      });
    return () => { active = false; };
  }, []);

  const categoryOptions = useMemo(() => CATEGORIES
    .filter((item) => (categoryCounts[item.value] ?? 0) > 0)
    .map((item) => ({ ...item, label: `${item.label} (${categoryCounts[item.value]})` })), [categoryCounts]);
  const languageOptions = useMemo(() => Object.entries(languageCounts)
    .filter(([code]) => code in LANGUAGE_LABELS)
    .map(([code, count]) => ({
      id: code,
      code: code as Langue,
      label: `${LANGUAGE_LABELS[code as Langue]} (${count})`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'fr')), [languageCounts]);
  const seasonOptions = useMemo(() => Object.entries(seasonCounts)
    .filter(([season]) => season in SEASON_LABELS)
    .map(([season, count]) => ({
      value: season,
      label: `${SEASON_LABELS[season]} (${count})`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'fr')), [seasonCounts]);

  const searchOptions = useMemo(() => ({
    query: searchQuery,
    categories: filters.categories.length ? filters.categories : undefined,
    languages: filters.languages.length ? filters.languages : undefined,
    liturgicalSeasons: filters.seasons.length ? filters.seasons : undefined,
    mood: filters.moods.length ? filters.moods[0] : undefined,
    audioOnly: filters.audioOnly,
    lyricsOnly: filters.lyricsOnly,
    partitionOnly: filters.partitionOnly,
    preferredLanguage: languagePref,
  }), [filters, languagePref, searchQuery]);
  const {
    items: filteredChants,
    total: filteredTotal,
    loading: chantsLoading,
    loadingMore,
    error: searchError,
    hasMore,
    loadMore,
  } = useLocalChantSearch(searchOptions, 300);

  const openChant = useCallback((chantId: string) => {
    router.push(`/chant/${chantId}`);
  }, [router]);

  const openFilters = useCallback(() => {
    setDraftFilters(filters);
    setFiltersVisible(true);
  }, [filters]);

  const applyFilter = () => { setFilters(draftFilters); setFiltersVisible(false); };

  const activeFilters = Number(filters.categories.length > 0)
    + Number(filters.languages.length > 0)
    + Number(filters.seasons.length > 0)
    + Number(filters.moods.length > 0)
    + Number(filters.audioOnly)
    + Number(filters.lyricsOnly)
    + Number(filters.partitionOnly);

  const animateFilterChange = () => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const sectionTitle = (() => {
    if (searchQuery) return `Résultats pour "${searchQuery}"`;
    if (filters.categories.length) return `${filters.categories.length} catégorie(s)`;
    if (filters.languages.length) return `${filters.languages.length} langue(s)`;
    if (filters.seasons.length) return `${filters.seasons.length} temps liturgique(s)`;
    if (filters.moods.length) return `${filters.moods.length} ambiance(s)`;
    return 'Tous les morceaux';
  })();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>RÉPERTOIRE</Text>
            <Text style={styles.title}>Chants Catholiques</Text>
            <Text style={styles.subtitle}>Le répertoire liturgique de Guinée</Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton icon="plus" onPress={() => router.push('/chant/nouveau')} />
            <IconButton icon="heart-outline" onPress={() => router.push('/favoris')} />
            <IconButton icon="music-box-multiple-outline" onPress={() => router.push('/mes-chants')} />
            <IconButton icon="history" onPress={() => router.push('/historique')} />
          </View>
        </View>

        {/* ═══ RECHERCHE INTÉGRÉE ═══ */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={19} color={ActionColors.discovery} />
            <TextInput
              style={styles.searchInput}
              placeholder="Titre, auteur, paroles…"
              placeholderTextColor={TOKENS.inkMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {searchQuery ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => setSearchQuery('')}
                hitSlop={6}
                style={styles.searchClear}
              >
                <MaterialCommunityIcons name="close" size={16} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <IconButton
            icon="tune-variant"
            onPress={openFilters}
            badge={activeFilters > 0 ? activeFilters : undefined}
            highlight={activeFilters > 0}
          />
        </View>

        {/* ═══ FILTRES ACTIFS ═══ */}
        {activeFilters > 0 && (
          <ActiveFilters
            filters={filters}
            moodLabels={Object.fromEntries(MOODS.map((m) => [m.id, m.label]))}
            categoryLabels={Object.fromEntries(CATEGORIES.map((item) => [item.value, item.label]))}
            languageLabels={LANGUAGE_LABELS}
            seasonLabels={SEASON_LABELS}
            onChange={(next) => {
              setDraftFilters(next);
              animateFilterChange();
            }}
          />
        )}

        {/* ═══ LISTE ═══ */}
        <Section
          title={sectionTitle}
          subtitle={`${filteredTotal} chant${filteredTotal > 1 ? 's' : ''}`}
        >
          {searchError ? (
            <Text accessibilityRole="alert" style={styles.sectionSubtitle}>{searchError}</Text>
          ) : filteredChants.length === 0 && chantsLoading ? (
            <Text style={styles.sectionSubtitle}>Recherche dans la bibliothèque locale…</Text>
          ) : filteredChants.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.trackList}>
              {filteredChants.map((chant) => (
                <TrackRow
                  key={chant.id}
                  title={chant.titre}
                  artist={chant.auteur || chant.compositeur || 'Chorale Sainte-Marie'}
                  language={chant.langue.toUpperCase()}
                  category={chant.categorie.replaceAll('_', ' ')}
                  favorite={favorites.includes(chant.id)}
                  onOpen={() => openChant(chant.id)}
                  onPlay={() => playChant(chant.id)}
                  onFavorite={() => toggleFavorite(chant.id)}
                />
              ))}
              {hasMore && (
                <Pressable accessibilityRole="button" onPress={() => { void loadMore(); }} style={styles.sectionActionButton}>
                  <Text style={styles.sectionAction}>{loadingMore ? 'Chargement…' : 'Charger plus'}</Text>
                </Pressable>
              )}
            </View>
          )}
        </Section>
      </ScrollView>

      <FilterSheet
        visible={filtersVisible}
        filters={draftFilters}
        onChange={setDraftFilters}
        onDismiss={() => setFiltersVisible(false)}
        onApply={applyFilter}
        categoryOptions={categoryOptions}
        languageOptions={languageOptions}
        moodOptions={moodOptions}
        seasonOptions={seasonOptions}
        showSeasons
        showMedia
        showDurations={false}
        showOccasions={false}
        showDownloaded={false}
        applyLabel="Afficher les chants"
      />
    </SafeAreaView>
  );
}

// ============ COMPOSANTS UTILITAIRES ============

function Section({
  title, subtitle, action, children,
}: {
  title: string; subtitle?: string; action?: { label: string; onPress: () => void }; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={styles.sectionAction}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function IconButton({
  icon, onPress, badge, highlight,
}: {
  icon: string; onPress: () => void; badge?: number; highlight?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        icon === 'plus' ? 'Créer un chant'
          : icon === 'heart-outline' ? 'Favoris'
          : icon === 'music-box-multiple-outline' ? 'Mes chants personnels'
            : icon === 'history' ? 'Mon historique'
              : 'Filtres avancés'
      }
      style={({ pressed }) => [
        styles.iconButton,
        pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
      ]}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={highlight ? TOKENS.gold : theme.text}
      />
      {badge !== undefined && (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function TrackRow({
  title, artist, language, category, favorite, onOpen, onPlay, onFavorite,
}: {
  title: string; artist: string; language: string; category: string;
  favorite: boolean; onOpen: () => void; onPlay: () => void; onFavorite: () => void;
}) {
  const theme = useTheme();
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 60 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    onFavorite();
  };

  return (
    <View style={styles.trackRow}>
      <Pressable onPress={onOpen} style={styles.trackMain}>
        <LinearGradient
          colors={['#7A1F3D22', '#725A6111']}
          style={styles.trackArtwork}
        >
          <MaterialCommunityIcons name="music-note" size={18} color="#7A1F3D" />
        </LinearGradient>
        <View style={styles.trackCopy}>
          <Text style={styles.trackTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.trackMeta}>{category} · {language}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onPlay} hitSlop={8} style={styles.trackAction}>
        <MaterialCommunityIcons name="play" size={18} color="#7A1F3D" />
      </Pressable>
      <Pressable onPress={handleFavorite} style={styles.trackAction} hitSlop={6}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <MaterialCommunityIcons
            name={favorite ? 'heart' : 'heart-outline'}
            size={20}
            color={favorite ? ActionColors.primary : theme.textSecondary}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  const theme = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons name="music-note-off" size={32} color={theme.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>Aucun chant disponible</Text>
      <Text style={styles.emptySubtitle}>Essayez une autre langue ou catégorie.</Text>
    </View>
  );
}

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// ============ STYLES ============
const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: TOKENS.bg },
  content: { paddingBottom: 20 },

  // Header
  header: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: TOKENS.surface,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: ActionColors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: TOKENS.ink,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    color: TOKENS.inkMuted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: TOKENS.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: TOKENS.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  searchClear: {
    padding: 4,
    borderRadius: 6,
  },

  // Section
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeading: { flex: 1, minWidth: 0 },
  sectionTitle: {
    color: TOKENS.ink,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sectionSubtitle: {
    color: TOKENS.inkMuted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  sectionActionButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  sectionAction: {
    color: ActionColors.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Track list
  trackList: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 20,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: TOKENS.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.border,
  },
  trackMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  trackArtwork: {
    width: 40, height: 40,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  trackCopy: { flex: 1, minWidth: 0 },
  trackTitle: {
    color: TOKENS.ink,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  trackMeta: {
    color: TOKENS.inkMuted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  trackAction: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  iconButton: {
    width: 40, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
  },
  iconBadge: {
    minWidth: 18, height: 18,
    borderRadius: 9,
    backgroundColor: ActionColors.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  iconBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  // Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: 32,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.border,
  },
  emptyTitle: {
    color: TOKENS.ink,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: TOKENS.inkMuted,
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.1,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Icon button (mobile)
  iconButtonMobile: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: TOKENS.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.border,
  },

  // Mobile responsive actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
  },
  actionLabel: {
    color: TOKENS.inkMuted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activeAction: {
    color: ActionColors.primary,
  },
  inactiveAction: {
    color: TOKENS.inkSubtle,
  },

  // Filter active list
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: TOKENS.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ActionColors.primarySoft,
  },
  filterPillText: {
    color: ActionColors.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  filterPillRemove: {
    width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  // Section header variations
  sectionHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    minHeight: 40,
  },
  sectionTitleCompact: {
    color: TOKENS.ink,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionSubtitleCompact: {
    color: TOKENS.inkMuted,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  // Search result meta
  searchResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchCount: {
    color: TOKENS.ink,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  searchCountTotal: {
    color: TOKENS.inkSubtle,
    fontSize: 13,
    fontWeight: '400',
  },
  searchClearAll: {
    color: ActionColors.primary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Empty state variations
  emptyStateSearch: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
    maxWidth: 320,
  },
  emptyIconLarge: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.border,
    marginBottom: 8,
  },
  emptyTitleLarge: {
    color: TOKENS.ink,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  emptySubtitleLarge: {
    color: TOKENS.inkMuted,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.1,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Loading state
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: 40,
  },
  loadingText: {
    color: TOKENS.inkMuted,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  loadingSpinner: {
    width: 40, height: 40,
  },

  // Error state
  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: 24,
  },
  errorText: {
    color: ActionColors.danger,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  errorRetry: {
    marginTop: 16,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ActionColors.primary,
  },
  errorRetryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Scroll view
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Safe area variations
  safeAreaTop: {
    paddingTop: 20,
  },
  safeAreaBottom: {
    paddingBottom: 20,
  },

  // Card variations
  cardDefault: {
    borderRadius: 12,
    backgroundColor: TOKENS.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.border,
  },
  cardElevated: {
    borderRadius: 16,
    backgroundColor: TOKENS.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  cardCompact: {
    borderRadius: 10,
    backgroundColor: TOKENS.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.border,
    padding: 8,
  },

  // Badge variations
  badgeDefault: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: ActionColors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: {
    color: ActionColors.primary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeDanger: {
    backgroundColor: ActionColors.dangerSoft,
  },
  badgeDangerText: {
    color: ActionColors.danger,
  },
  badgeSuccess: {
    backgroundColor: ActionColors.successSoft,
  },
  badgeSuccessText: {
    color: ActionColors.success,
  },

  // Shadow variations
  shadowSm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  shadowLg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },

  // Animation variations
  fadeIn: {
    opacity: 0,
  },
  slideUp: {
    transform: [{ translateY: 20 }],
  },
  scaleIn: {
    transform: [{ scale: 0.95 }],
  },
  pulse: {
    opacity: 0.6,
  },

  // Gradient variations
  gradientPrimary: {
    backgroundColor: ActionColors.primary,
  },
  gradientSecondary: {
    backgroundColor: TOKENS.gold,
  },
  gradientNeutral: {
    backgroundColor: TOKENS.ink,
  },

  // Text variations
  textXs: { fontSize: 10 },
  textSm: { fontSize: 12 },
  textBase: { fontSize: 14 },
  textLg: { fontSize: 16 },
  textXl: { fontSize: 18 },
  text2Xl: { fontSize: 20 },
  text3Xl: { fontSize: 24 },

  // Spacing utilities
  m0: { margin: 0 },
  m1: { margin: 4 },
  m2: { margin: 8 },
  m3: { margin: 12 },
  m4: { margin: 16 },
  m5: { margin: 20 },
  m6: { margin: 24 },

  p0: { padding: 0 },
  p1: { padding: 4 },
  p2: { padding: 8 },
  p3: { padding: 12 },
  p4: { padding: 16 },
  p5: { padding: 20 },
  p6: { padding: 24 },

  // Border radius
  roundedNone: { borderRadius: 0 },
  roundedSm: { borderRadius: 4 },
  roundedMd: { borderRadius: 8 },
  roundedLg: { borderRadius: 12 },
  roundedXl: { borderRadius: 16 },
  roundedFull: { borderRadius: 9999 },

  // Flex utilities
  flex1: { flex: 1 },
  flexRow: { flexDirection: 'row' },
  flexCol: { flexDirection: 'column' },
  itemsCenter: { alignItems: 'center' },
  itemsStart: { alignItems: 'flex-start' },
  itemsEnd: { alignItems: 'flex-end' },
  justifyCenter: { justifyContent: 'center' },
  justifyBetween: { justifyContent: 'space-between' },
  justifyEnd: { justifyContent: 'flex-end' },

  // Position utilities
  absolute: { position: 'absolute' },
  relative: { position: 'relative' },
  top0: { top: 0 },
  left0: { left: 0 },
  right0: { right: 0 },
  bottom0: { bottom: 0 },

  // Opacity
  opacity0: { opacity: 0 },
  opacity50: { opacity: 0.5 },
  opacity75: { opacity: 0.75 },
  opacity100: { opacity: 1 },

  // Overflow
  overflowHidden: { overflow: 'hidden' },
  overflowVisible: { overflow: 'visible' },

  // Display
  hidden: { display: 'none' },
  block: { display: 'flex' },

  // Border
  borderNone: { borderWidth: 0 },
  borderDefault: { borderWidth: StyleSheet.hairlineWidth },
  borderThick: { borderWidth: 2 },
  borderColorPrimary: { borderColor: ActionColors.primary },
  borderColorDefault: { borderColor: TOKENS.border },
  borderColorMuted: { borderColor: TOKENS.border },

  // Background colors
  bgTransparent: { backgroundColor: 'transparent' },
  bgWhite: { backgroundColor: '#FFFFFF' },
  bgBlack: { backgroundColor: '#000000' },

  // Color variants
  textPrimary: { color: ActionColors.primary },
  textSecondary: { color: TOKENS.ink },
  textMuted: { color: TOKENS.inkMuted },
  textSubtle: { color: TOKENS.inkSubtle },
  textDanger: { color: ActionColors.danger },
  textSuccess: { color: ActionColors.success },
  textWarning: { color: ActionColors.warning },
  textInfo: { color: ActionColors.info },
  textDiscovery: { color: ActionColors.discovery },
  textPlayback: { color: ActionColors.playback },

  // Theme specific styles
  themedBg: {
    backgroundColor: TOKENS.bg,
  },
  themedSurface: {
    backgroundColor: TOKENS.surface,
  },
  themedText: {
    color: TOKENS.ink,
  },
  themedTextMuted: {
    color: TOKENS.inkMuted,
  },
  themedBorder: {
    borderColor: TOKENS.border,
  },

  // Interaction states
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  selected: { backgroundColor: ActionColors.primarySoft },
  hover: { backgroundColor: TOKENS.surface },

  // Z-index
  z0: { zIndex: 0 },
  z1: { zIndex: 10 },
  z2: { zIndex: 20 },
  z3: { zIndex: 30 },
  z4: { zIndex: 40 },
  z5: { zIndex: 50 },
  z6: { zIndex: 60 },
});