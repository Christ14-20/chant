import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import type { Categorie, Langue, TempsLiturgique } from '@/types';

const COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  gold: '#D4AF37',
  teal: '#006B76',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
};

const FILTER_CHIPS = ['Tous', 'Messes', 'Louange', 'Adoration', 'Humeur', 'Langues'] as const;
type MainFilter = (typeof FILTER_CHIPS)[number];

type AdvancedFilters = {
  language: Langue | null;
  category: Categorie | null;
  season: TempsLiturgique | null;
  audioOnly: boolean;
  lyricsOnly: boolean;
  partitionOnly: boolean;
};

const LANGUAGES: { id: string; label: string; code: Langue; description: string; flag: string }[] = [
  { id: 'SOUSSOU', label: 'Soussou', code: 'soussou', description: 'Langue locale · Guinée', flag: '🇬🇳' },
  { id: 'POULAR', label: 'Poular', code: 'poular', description: 'Langue locale · Guinée', flag: '🇬🇳' },
  { id: 'MALINKE', label: 'Malinké', code: 'malinke', description: 'Langue locale · Guinée', flag: '🇬🇳' },
  { id: 'KISSI', label: 'Kissi', code: 'kissi', description: 'Langue locale · Guinée', flag: '🇬🇳' },
  { id: 'GUERZE', label: 'Guerzé', code: 'guerze', description: 'Langue locale · Guinée', flag: '🇬🇳' },
  { id: 'KPELE', label: 'Kpelé', code: 'kpele', description: 'Langue locale · Guinée', flag: '🇬🇳' },
  { id: 'FRANCAIS', label: 'Français', code: 'fr', description: 'Langue officielle', flag: '🇫🇷' },
];

const MOODS = [
  { id: 'paix', label: "J'ai besoin de paix", icon: 'weather-sunset' },
  { id: 'priere', label: 'Je veux prier', icon: 'hands-pray' },
  { id: 'adoration', label: 'Je veux adorer', icon: 'heart-outline' },
  { id: 'louange', label: 'Je veux louer', icon: 'fire' },
  { id: 'consolation', label: 'Besoin de consolation', icon: 'hand-heart-outline' },
];

const GENRES = [
  { title: 'Chants de Messe', type: 'moments', id: 'all', icon: 'church', color: '#006B76' },
  { title: 'Chants par pays', type: 'pays', id: 'all', icon: 'earth', color: '#184E77' },
  { title: 'Temps liturgique', type: 'temps', id: 'all', icon: 'calendar-month', color: '#765D20' },
  { title: 'Louange & Adoration', type: 'humeurs', id: 'all', icon: 'fire', color: '#71445D' },
  { title: 'Mon humeur', type: 'humeurs', id: 'all', icon: 'emoticon-outline', color: '#3E625B' },
  { title: 'Top tendances', type: 'playlist', id: 'top', icon: 'star-outline', color: '#475569' },
];

const CATEGORIES: { value: Categorie; label: string }[] = [
  { value: 'entree', label: 'Entrée' }, { value: 'kyrie', label: 'Kyrie' },
  { value: 'gloria', label: 'Gloria' }, { value: 'psaume', label: 'Psaume' },
  { value: 'acclamation', label: 'Acclamation' }, { value: 'offertoire', label: 'Offertoire' },
  { value: 'sanctus', label: 'Sanctus' }, { value: 'agnus_dei', label: 'Agnus Dei' },
  { value: 'communion', label: 'Communion' }, { value: 'action_grace', label: 'Action de grâce' },
  { value: 'chant_final', label: 'Chant final' }, { value: 'louange', label: 'Louange' },
  { value: 'adoration', label: 'Adoration' }, { value: 'penitence', label: 'Pénitence' },
];

const SEASONS: { value: TempsLiturgique; label: string }[] = [
  { value: 'avent', label: 'Avent' }, { value: 'noel', label: 'Noël' },
  { value: 'careme', label: 'Carême' }, { value: 'triduum_pascal', label: 'Triduum pascal' },
  { value: 'temps_pascal', label: 'Temps pascal' }, { value: 'temps_ordinaire', label: 'Temps ordinaire' },
];

const EMPTY_FILTERS: AdvancedFilters = {
  language: null,
  category: null,
  season: null,
  audioOnly: false,
  lyricsOnly: false,
  partitionOnly: false,
};

export default function ChantsCatalogueScreen() {
  const router = useRouter();
  const chants = useAppStore((state) => state.chants);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const playChant = useAppStore((state) => state.playChant);
  const [selectedFilter, setSelectedFilter] = useState<MainFilter>('Tous');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);

  const popularChants = useMemo(
    () => [...chants].sort((a, b) => (b.vues ?? b.nombre_vues) - (a.vues ?? a.nombre_vues)).slice(0, 6),
    [chants]
  );
  const featuredChant = popularChants[0] ?? chants[0];

  const filteredChants = useMemo(() => chants.filter((chant) => {
    const mainMatches = selectedFilter === 'Tous'
      || (selectedFilter === 'Messes' && (chant.moment_messe !== undefined || ['entree', 'kyrie', 'gloria', 'psaume', 'acclamation', 'offertoire', 'sanctus', 'agnus_dei', 'communion', 'action_grace', 'chant_final'].includes(chant.categorie)))
      || (selectedFilter === 'Louange' && chant.categorie === 'louange')
      || (selectedFilter === 'Adoration' && chant.categorie === 'adoration')
      || (selectedFilter === 'Humeur' && Boolean(chant.theme || chant.tags.some((tag) => tag.type === 'humeur')))
      || (selectedFilter === 'Langues' && chant.langue !== 'fr');
    const languageMatches = selectedLanguage === null || chant.langue.toUpperCase() === selectedLanguage;
    const moodMatches = selectedMood === null || chant.theme === selectedMood || chant.categorie === selectedMood || chant.tags.some((tag) => tag.nom === selectedMood);
    const advancedMatches = (filters.language === null || chant.langue === filters.language)
      && (filters.category === null || chant.categorie === filters.category)
      && (filters.season === null || chant.temps_liturgique === filters.season)
      && (!filters.audioOnly || Boolean(chant.audio_url))
      && (!filters.lyricsOnly || Boolean(chant.paroles.trim()))
      && (!filters.partitionOnly || Boolean(chant.partition_url));
    return mainMatches && languageMatches && moodMatches && advancedMatches;
  }), [chants, filters, selectedFilter, selectedLanguage, selectedMood]);

  const navigateToCategory = (type: string, id: string) => {
    router.push({ pathname: '/chant/category/[type]/[id]', params: { type, id } });
  };

  const openChant = (chantId: string) => {
    playChant(chantId);
    router.push(`/chant/${chantId}`);
  };

  const openFilters = () => {
    setDraftFilters(filters);
    setFiltersVisible(true);
  };

  const activeFilters = Number(filters.language !== null) + Number(filters.category !== null) + Number(filters.season !== null)
    + Number(filters.audioOnly) + Number(filters.lyricsOnly) + Number(filters.partitionOnly);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Chants Catholiques</Text>
            <Text style={styles.subtitle}>Le répertoire liturgique de Guinée</Text>
          </View>
          <View style={styles.headerActions}>
            <HeaderButton icon="magnify" label="Rechercher" onPress={() => router.push('/chant/search')} />
            <HeaderButton icon="heart-outline" label="Favoris" onPress={() => router.push('/favoris')} />
            <Pressable accessibilityRole="button" accessibilityLabel="Filtres" onPress={openFilters} style={styles.filterButton}>
              <MaterialCommunityIcons name="tune-variant" size={21} color={activeFilters > 0 ? COLORS.gold : COLORS.text} />
              {activeFilters > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilters}</Text></View>}
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {FILTER_CHIPS.map((filter) => {
            const active = selectedFilter === filter;
            const onSelect = () => {
              if (filter === 'Messes') {
                navigateToCategory('moments', 'all');
              } else if (filter === 'Langues') {
                navigateToCategory('langues', 'all');
              } else if (filter === 'Louange' || filter === 'Adoration' || filter === 'Humeur') {
                navigateToCategory('humeurs', 'all');
              } else {
                setSelectedFilter('Tous');
              }
            };
            return (
              <Pressable key={filter} onPress={onSelect} style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>{filter}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {selectedFilter === 'Tous' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explorer par catégorie</Text>
            <View style={styles.genreGrid}>
              {GENRES.map((genre) => (
                <Pressable key={genre.title} onPress={() => navigateToCategory(genre.type, genre.id)} style={[styles.genreCard, { backgroundColor: genre.color }]}>
                  <MaterialCommunityIcons name={genre.icon as any} size={25} color={COLORS.text} />
                  <Text numberOfLines={2} style={styles.genreTitle}>{genre.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {(selectedFilter === 'Tous' || selectedFilter === 'Humeur') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comment te sens-tu aujourd’hui ?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodChips}>
              {MOODS.map((mood) => (
                <Pressable key={mood.id} onPress={() => navigateToCategory('humeur', mood.id)} style={styles.moodChip}>
                  <MaterialCommunityIcons name={mood.icon as any} size={17} color={COLORS.text} />
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {(selectedFilter === 'Tous' || selectedFilter === 'Langues') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeading}>
                <MaterialCommunityIcons name="sort-variant" size={19} color="#111827B3" />
                <Text style={styles.sectionTitle}>Langues de Guinée</Text>
              </View>
              {selectedLanguage !== null && (
                <Pressable onPress={() => setSelectedLanguage(null)}>
                  <Text style={styles.resetLabel}>Réinitialiser</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.languageList}>
              {LANGUAGES.map((language) => {
                const count = chants.filter((chant) => chant.langue === language.code).length;
                return (
                  <Pressable key={language.id} onPress={() => navigateToCategory('langue', language.id)} style={styles.languageRow}>
                    <View style={styles.languageArtwork}><Text style={styles.languageFlag}>{language.flag}</Text></View>
                    <View style={styles.languageCopy}>
                      <Text style={styles.languageName}>{language.label}</Text>
                      <Text style={styles.languageMeta}>{language.description} · {count} chants</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#11182780" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {selectedFilter === 'Tous' && selectedLanguage === null && selectedMood === null && featuredChant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommandé pour vous</Text>
            <View style={styles.featuredCard}>
              <View style={styles.featuredArtwork}>
                <MaterialCommunityIcons name="music-note" size={35} color={COLORS.text} />
              </View>
              <Pressable onPress={() => openChant(featuredChant.id)} style={styles.featuredCopy}>
                <Text style={styles.featuredEyebrow}>Recommandation Catholic eGuine</Text>
                <Text numberOfLines={1} style={styles.featuredTitle}>{featuredChant.titre}</Text>
                <Text numberOfLines={1} style={styles.featuredArtist}>{featuredChant.auteur || 'Chorale Sainte-Marie'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Écouter ${featuredChant.titre}`} onPress={() => playChant(featuredChant.id)} style={styles.featuredPlay}>
                <MaterialCommunityIcons name="play" size={26} color={COLORS.background} />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedLanguage ? `Morceaux en ${LANGUAGES.find((item) => item.id === selectedLanguage)?.label ?? selectedLanguage} (${filteredChants.length})` : `Tous les morceaux (${filteredChants.length})`}
          </Text>
          {filteredChants.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="music-note-off" size={38} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Aucun chant disponible</Text>
              <Text style={styles.emptySubtitle}>Essayez une autre langue ou catégorie.</Text>
            </View>
          ) : filteredChants.map((chant) => (
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
        </View>
      </ScrollView>

      <FilterModal
        visible={filtersVisible}
        filters={draftFilters}
        onChange={setDraftFilters}
        onDismiss={() => setFiltersVisible(false)}
        onApply={() => { setFilters(draftFilters); setFiltersVisible(false); }}
      />
    </SafeAreaView>
  );
}

function HeaderButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.headerButton}>
      <MaterialCommunityIcons name={icon as any} size={21} color={COLORS.text} />
    </Pressable>
  );
}

function TrackRow({
  title,
  artist,
  language,
  category,
  favorite,
  onOpen,
  onPlay,
  onFavorite,
}: {
  title: string;
  artist: string;
  language: string;
  category: string;
  favorite: boolean;
  onOpen: () => void;
  onPlay: () => void;
  onFavorite: () => void;
}) {
  return (
    <View style={styles.trackRow}>
      <Pressable onPress={onOpen} style={styles.trackMain}>
        <View style={styles.trackArtwork}>
          <MaterialCommunityIcons name="music-note" size={21} color={COLORS.gold} />
        </View>
        <View style={styles.trackCopy}>
          <Text numberOfLines={1} style={styles.trackTitle}>{title}</Text>
          <Text numberOfLines={1} style={styles.trackArtist}>{artist} · {language}</Text>
          <Text numberOfLines={1} style={styles.trackCategory}>{category}</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Écouter ${title}`} onPress={onPlay} style={styles.rowAction}>
        <MaterialCommunityIcons name="play" size={22} color={COLORS.gold} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onPress={onFavorite} style={styles.rowAction}>
        <MaterialCommunityIcons name={favorite ? 'heart' : 'heart-outline'} size={20} color={favorite ? '#EC4899' : '#11182780'} />
      </Pressable>
    </View>
  );
}

function FilterModal({
  visible,
  filters,
  onChange,
  onDismiss,
  onApply,
}: {
  visible: boolean;
  filters: AdvancedFilters;
  onChange: (filters: AdvancedFilters) => void;
  onDismiss: () => void;
  onApply: () => void;
}) {
  const toggleChoice = <T extends keyof Pick<AdvancedFilters, 'language' | 'category' | 'season'>>(
    key: T,
    value: AdvancedFilters[T]
  ) => onChange({ ...filters, [key]: filters[key] === value ? null : value });
  const toggleAvailability = (key: 'audioOnly' | 'lyricsOnly' | 'partitionOnly') => onChange({ ...filters, [key]: !filters[key] });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer les filtres" onPress={onDismiss} style={styles.modalScrim} />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filtrer les chants</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onDismiss} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={21} color={COLORS.text} />
            </Pressable>
          </View>
          <ScrollView>
            <ChoiceGroup title="Langue">
              <ChoicePill label="Toutes" selected={filters.language === null} onPress={() => onChange({ ...filters, language: null })} />
              {LANGUAGES.map((item) => <ChoicePill key={item.code} label={item.label} selected={filters.language === item.code} onPress={() => toggleChoice('language', item.code)} />)}
            </ChoiceGroup>
            <ChoiceGroup title="Moment liturgique">
              <ChoicePill label="Tous" selected={filters.category === null} onPress={() => onChange({ ...filters, category: null })} />
              {CATEGORIES.map((item) => <ChoicePill key={item.value} label={item.label} selected={filters.category === item.value} onPress={() => toggleChoice('category', item.value)} />)}
            </ChoiceGroup>
            <ChoiceGroup title="Temps liturgique">
              <ChoicePill label="Tous" selected={filters.season === null} onPress={() => onChange({ ...filters, season: null })} />
              {SEASONS.map((item) => <ChoicePill key={item.value} label={item.label} selected={filters.season === item.value} onPress={() => toggleChoice('season', item.value)} />)}
            </ChoiceGroup>
            <ChoiceGroup title="Contenu disponible">
              <ChoicePill label="Audio" selected={filters.audioOnly} onPress={() => toggleAvailability('audioOnly')} />
              <ChoicePill label="Paroles" selected={filters.lyricsOnly} onPress={() => toggleAvailability('lyricsOnly')} />
              <ChoicePill label="Partition" selected={filters.partitionOnly} onPress={() => toggleAvailability('partitionOnly')} />
            </ChoiceGroup>
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onApply} style={styles.applyButton}>
            <Text style={styles.applyLabel}>Appliquer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ChoiceGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.choiceGroup}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <View style={styles.choiceOptions}>{children}</View>
    </View>
  );
}

function ChoicePill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choicePill, selected && styles.choicePillSelected]}>
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { gap: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  header: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 11 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  filterButton: { position: 'relative', width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: 3, right: 1, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: COLORS.gold },
  filterBadgeText: { color: COLORS.background, fontSize: 9, fontWeight: '800' },
  filterChips: { gap: 8 },
  filterChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 18, backgroundColor: COLORS.card },
  filterChipActive: { backgroundColor: COLORS.gold },
  filterChipLabel: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  filterChipLabelActive: { color: COLORS.background, fontWeight: '800' },
  section: { gap: 11 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genreCard: { width: '48%', minHeight: 116, justifyContent: 'space-between', padding: 13, borderRadius: 15 },
  genreTitle: { maxWidth: 150, color: COLORS.text, fontSize: 14, fontWeight: '700' },
  moodChips: { gap: 8 },
  moodChip: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: 18, backgroundColor: COLORS.card },
  moodLabel: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  resetLabel: { color: COLORS.gold, fontSize: 12 },
  languageList: { gap: 6 },
  languageRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 5, paddingVertical: 7, borderRadius: 12, backgroundColor: '#FFFFFF' },
  languageArtwork: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: COLORS.card },
  languageFlag: { fontSize: 26 },
  languageCopy: { flex: 1, gap: 3 },
  languageName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  languageMeta: { color: '#11182799', fontSize: 11 },
  featuredCard: { minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 15, backgroundColor: COLORS.card },
  featuredArtwork: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.teal },
  featuredCopy: { flex: 1, gap: 4 },
  featuredEyebrow: { color: COLORS.gold, fontSize: 10, fontWeight: '700' },
  featuredTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  featuredArtist: { color: '#111827B3', fontSize: 12 },
  featuredPlay: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: COLORS.gold },
  trackRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 9, borderRadius: 10, backgroundColor: COLORS.card },
  trackMain: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11 },
  trackArtwork: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#006B7638' },
  trackCopy: { flex: 1, gap: 2 },
  trackTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  trackArtist: { color: '#11182799', fontSize: 11 },
  trackCategory: { color: '#11182770', fontSize: 10, textTransform: 'capitalize' },
  rowAction: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 42, paddingHorizontal: 20 },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  emptySubtitle: { color: COLORS.muted, fontSize: 12, textAlign: 'center' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: '#00000088' },
  filterSheet: { maxHeight: '88%', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: COLORS.background },
  sheetHandle: { width: 38, height: 4, alignSelf: 'center', marginBottom: 12, borderRadius: 2, backgroundColor: '#00000045' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  choiceGroup: { gap: 9, marginTop: 14 },
  choiceTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  choiceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choicePill: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 11, borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, backgroundColor: COLORS.card },
  choicePillSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.gold },
  choiceLabel: { color: COLORS.text, fontSize: 11 },
  choiceLabelSelected: { color: COLORS.background, fontWeight: '700' },
  applyButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: 12, backgroundColor: COLORS.gold },
  applyLabel: { color: COLORS.background, fontSize: 14, fontWeight: '800' },
});
