import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';
import { useAppStore } from '@/store/useAppStore';
import type { Langue } from '@/types';
import { ActionColors } from '@/constants/theme';

const COLORS = { background: '#FFFFFF', card: '#FFFFFF', gold: ActionColors.primary, rose: ActionColors.primary, text: '#0A1F44', muted: '#0A1F44', border: '#FFFFFF' };

type ContentType = 'all' | 'chants' | 'prieres' | 'lectures';
type FavMood = 'joyeux' | 'priere' | 'meditatif' | 'dynamique' | 'paisible' | 'solennel';
type DurationFilter = 'short' | 'medium' | 'long' | 'veryLong';
type SortOption = 'recent' | 'mostPlayed' | 'mostLiked' | 'titleAsc' | 'titleDesc' | 'durationAsc' | 'durationDesc';

type FavoriteFilters = {
  contentType: ContentType;
  categories: string[];
  languages: string[];
  moods: FavMood[];
  occasions: string[];
  durations: DurationFilter[];
  downloadedOnly: boolean;
};

type FavoriteEntry = {
  id: string;
  title: string;
  artist: string;
  isPriere: boolean;
  language: string;
  categories: string[];
  moods: FavMood[];
  occasions: string[];
  downloaded: boolean;
  playCount: number;
  likeCount: number;
  addedAt: number;
  durationSeconds: number;
};

const EMPTY_FILTERS: FavoriteFilters = { contentType: 'all', categories: [], languages: [], moods: [], occasions: [], durations: [], downloadedOnly: false };
const CATEGORIES = ['Louange', 'Adoration', 'Action de grâce', 'Eucharistie', 'Marie', 'Saint-Esprit', 'Carême', 'Avent', 'Noël', 'Pâques', 'Messe', 'Entrée', 'Offertoire', 'Communion', 'Sortie', 'Méditation', 'Taizé', 'Gospel / Chorale'];
const LANGUAGES = ['Français', 'Soussou', 'Malinké', 'Poular', 'Kissi', 'Guerzé', 'Anglais', 'Latin', 'Autre'];
const OCCASIONS = ['Messe', 'Prière personnelle', 'Prière en famille', 'Groupe de prière', 'Adoration', 'Veillée', 'Funérailles', 'Mariage', 'Baptême', 'Première communion'];
const MOODS: { id: FavMood; label: string; icon: string }[] = [
  { id: 'joyeux', label: 'Joyeux', icon: 'party-popper' },
  { id: 'priere', label: 'Prière', icon: 'hands-pray' },
  { id: 'meditatif', label: 'Méditatif', icon: 'heart-outline' },
  { id: 'dynamique', label: 'Dynamique', icon: 'fire' },
  { id: 'paisible', label: 'Paisible', icon: 'dove' },
  { id: 'solennel', label: 'Solennel', icon: 'church' },
];
const DURATIONS: { id: DurationFilter; label: string; min: number; max: number }[] = [
  { id: 'short', label: '< 3 min', min: 0, max: 180 },
  { id: 'medium', label: '3–5 min', min: 180, max: 300 },
  { id: 'long', label: '5–8 min', min: 300, max: 480 },
  { id: 'veryLong', label: '> 8 min', min: 480, max: Number.MAX_SAFE_INTEGER },
];
const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'recent', label: 'Ajoutés récemment' },
  { id: 'mostPlayed', label: 'Plus écoutés' },
  { id: 'mostLiked', label: 'Plus appréciés' },
  { id: 'titleAsc', label: 'Titre A → Z' },
  { id: 'titleDesc', label: 'Titre Z → A' },
  { id: 'durationAsc', label: 'Durée : courte → longue' },
  { id: 'durationDesc', label: 'Durée : longue → courte' },
];
const LANGUAGE_LABELS: Record<Langue, string> = {
  fr: 'Français', la: 'Latin', es: 'Espagnol', soussou: 'Soussou', poular: 'Poular', malinke: 'Malinké', kissi: 'Kissi',
  guerze: 'Guerzé', toma: 'Toma', kpele: 'Kpelé', baga: 'Baga', loma: 'Loma', mano: 'Mano', kono: 'Kono',
  en: 'Anglais',
};

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function normalizeLabel(value: string): string {
  return value.replaceAll('_', ' ').toLocaleLowerCase();
}

export default function FavorisScreen() {
  useTheme();
  const router = useRouter();
  const chants = useAppStore((state) => state.chants);
  const prieres = useAppStore((state) => state.prieres);
  const favorites = useAppStore((state) => state.favorites);
  const favoritePrieres = useAppStore((state) => state.favoritePrieres);
  const downloadedChants = useAppStore((state) => state.downloadedChants);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const toggleFavoritePriere = useAppStore((state) => state.toggleFavoritePriere);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortOption>('recent');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);

  const allEntries = useMemo<FavoriteEntry[]>(() => [
    ...chants.filter((chant) => favorites.includes(chant.id)).map((chant) => {
      const name = LANGUAGE_LABELS[chant.langue];
      const moodTags = chant.tags.filter((tag) => tag.type === 'humeur').map((tag) => tag.nom.toLocaleLowerCase());
      const moods = moodTags.filter((mood): mood is FavMood => MOODS.some((option) => option.id === mood));
      return {
        id: chant.id,
        title: chant.titre,
        artist: chant.auteur || chant.compositeur || 'Chorale eGuine',
        isPriere: false,
        language: name,
        categories: [normalizeLabel(chant.categorie), ...(chant.temps_liturgique ? [normalizeLabel(chant.temps_liturgique)] : [])],
        moods,
        occasions: [chant.moment_messe ? 'Messe' : '', chant.categorie === 'adoration' ? 'Adoration' : ''].filter(Boolean),
        downloaded: downloadedChants.includes(chant.id),
        playCount: chant.nombre_vues,
        likeCount: chant.nombre_favoris,
        addedAt: new Date(chant.created_at).getTime(),
        durationSeconds: 240,
      };
    }),
    ...prieres.filter((priere) => favoritePrieres.includes(priere.id)).map((priere) => ({
      id: priere.id,
      title: priere.titre,
      artist: priere.categorie,
      isPriere: true,
      language: LANGUAGE_LABELS[priere.langue],
      categories: [normalizeLabel(priere.categorie)],
      moods: [] as FavMood[],
      occasions: ['Prière personnelle'],
      downloaded: false,
      playCount: priere.vues ?? 0,
      likeCount: 0,
      addedAt: new Date(priere.created_at).getTime(),
      durationSeconds: 120,
    })),
  ], [chants, downloadedChants, favoritePrieres, favorites, prieres]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    let entries = allEntries.filter((entry) => !term || entry.title.toLocaleLowerCase().includes(term) || entry.artist.toLocaleLowerCase().includes(term));
    if (filters.contentType === 'chants') entries = entries.filter((entry) => !entry.isPriere);
    if (filters.contentType === 'prieres') entries = entries.filter((entry) => entry.isPriere);
    if (filters.contentType === 'lectures') entries = [];
    if (filters.categories.length) entries = entries.filter((entry) => entry.categories.some((category) => filters.categories.includes(category)));
    if (filters.languages.length) entries = entries.filter((entry) => filters.languages.includes(entry.language));
    if (filters.moods.length) entries = entries.filter((entry) => entry.moods.some((mood) => filters.moods.includes(mood)));
    if (filters.occasions.length) entries = entries.filter((entry) => entry.occasions.some((occasion) => filters.occasions.includes(occasion)));
    if (filters.durations.length) entries = entries.filter((entry) => filters.durations.some((duration) => {
      const range = DURATIONS.find((item) => item.id === duration);
      return range !== undefined && entry.durationSeconds >= range.min && entry.durationSeconds < range.max;
    }));
    if (filters.downloadedOnly) entries = entries.filter((entry) => entry.downloaded);

    return entries.sort((a, b) => {
      switch (sort) {
        case 'mostPlayed': return b.playCount - a.playCount;
        case 'mostLiked': return b.likeCount - a.likeCount;
        case 'titleAsc': return a.title.localeCompare(b.title);
        case 'titleDesc': return b.title.localeCompare(a.title);
        case 'durationAsc': return a.durationSeconds - b.durationSeconds;
        case 'durationDesc': return b.durationSeconds - a.durationSeconds;
        default: return b.addedAt - a.addedAt;
      }
    });
  }, [allEntries, filters, query, sort]);

  const activeFilterCount = Number(filters.contentType !== 'all') + Number(filters.categories.length > 0)
    + Number(filters.languages.length > 0) + Number(filters.moods.length > 0) + Number(filters.occasions.length > 0)
    + Number(filters.durations.length > 0) + Number(filters.downloadedOnly);

  const applyFilter = () => { setFilters(draftFilters); setFilterVisible(false); };
  const toggleList = <T,>(key: 'categories' | 'languages' | 'moods' | 'occasions' | 'durations', value: T) => {
    setDraftFilters((current) => ({ ...current, [key]: toggleValue(current[key] as T[], value) }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={21} color={COLORS.text} />
        </Pressable>
        <Text style={styles.topTitle}>Chants favoris</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Trier : ${SORT_OPTIONS.find((option) => option.id === sort)?.label}`} onPress={() => setSortVisible(true)} style={styles.topAction}>
          <MaterialCommunityIcons name="sort-variant" size={21} color={COLORS.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Filtrer" onPress={() => { setDraftFilters(filters); setFilterVisible(true); }} style={styles.topAction}>
          <MaterialCommunityIcons name="tune-variant" size={21} color={activeFilterCount > 0 ? ActionColors.discovery : COLORS.text} />
          {activeFilterCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{activeFilterCount}</Text></View>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsHeader}>
          <View style={styles.statsIcon}>
            <MaterialCommunityIcons name="heart" size={22} color={COLORS.text} />
          </View>
          <View style={styles.statsCopy}>
            <Text style={styles.statsTitle}>Mes chants favoris</Text>
            <Text style={styles.statsSubtitle}>{filtered.length > 0 ? `${filtered.length} chant${filtered.length > 1 ? 's' : ''} sauvegardé${filtered.length > 1 ? 's' : ''}` : 'Aucun chant favori'}</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color={ActionColors.discovery} />
          <TextInput accessibilityLabel="Rechercher un chant favori" value={query} onChangeText={setQuery} placeholder="Rechercher un chant…" placeholderTextColor={COLORS.muted} style={styles.searchInput} />
          {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => setQuery('')}><MaterialCommunityIcons name="close-circle" size={19} color={COLORS.muted} /></Pressable>}
        </View>

        <ActiveFilters filters={filters} onChange={setFilters} />

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="heart-outline" size={56} color="#0A1F4480" />
            <Text style={styles.emptyText}>
              {query.trim() ? `Aucun résultat pour « ${query.trim()} »` : activeFilterCount > 0 ? 'Aucun chant favori ne correspond aux filtres' : 'Aucun chant favori pour le moment'}
            </Text>
          </View>
        ) : filtered.map((entry) => (
          <FavoriteRow
            key={`${entry.isPriere ? 'priere' : 'chant'}-${entry.id}`}
            entry={entry}
            onOpen={() => router.push(entry.isPriere ? `/priere/${entry.id}` : `/chant/${entry.id}`)}
            onRemove={() => entry.isPriere ? toggleFavoritePriere(entry.id) : toggleFavorite(entry.id)}
          />
        ))}
      </ScrollView>

      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer les filtres" onPress={() => setFilterVisible(false)} style={styles.scrim} />
          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filtrer les chants</Text>
              <Pressable onPress={() => setDraftFilters(EMPTY_FILTERS)}><Text style={styles.resetText}>Réinitialiser</Text></Pressable>
            </View>
            <ScrollView style={styles.filterScroll}>
              <ChoiceGroup title="Type de contenu">
                {(['all', 'chants', 'prieres', 'lectures'] as ContentType[]).map((value) => <ChoicePill key={value} label={{ all: 'Tout', chants: 'Chants', prieres: 'Prières', lectures: 'Lectures' }[value]} selected={draftFilters.contentType === value} onPress={() => setDraftFilters((current) => ({ ...current, contentType: value }))} />)}
              </ChoiceGroup>
              <ChoiceGroup title="Catégorie">
                {CATEGORIES.map((value) => <ChoicePill key={value} label={value} selected={draftFilters.categories.includes(normalizeLabel(value))} onPress={() => toggleList('categories', normalizeLabel(value))} />)}
              </ChoiceGroup>
              <ChoiceGroup title="Langue">
                {LANGUAGES.map((value) => <ChoicePill key={value} label={value} selected={draftFilters.languages.includes(value)} onPress={() => toggleList('languages', value)} />)}
              </ChoiceGroup>
              <ChoiceGroup title="Ambiance">
                {MOODS.map((mood) => <ChoicePill key={mood.id} label={mood.label} selected={draftFilters.moods.includes(mood.id)} onPress={() => toggleList('moods', mood.id)} />)}
              </ChoiceGroup>
              <ChoiceGroup title="Durée">
                {DURATIONS.map((duration) => <ChoicePill key={duration.id} label={duration.label} selected={draftFilters.durations.includes(duration.id)} onPress={() => toggleList('durations', duration.id)} />)}
              </ChoiceGroup>
              <ChoiceGroup title="Occasion">
                {OCCASIONS.map((value) => <ChoicePill key={value} label={value} selected={draftFilters.occasions.includes(value)} onPress={() => toggleList('occasions', value)} />)}
              </ChoiceGroup>
              <ChoiceGroup title="Disponibilité">
                <ChoicePill label="Téléchargé uniquement" selected={draftFilters.downloadedOnly} onPress={() => setDraftFilters((current) => ({ ...current, downloadedOnly: !current.downloadedOnly }))} />
              </ChoiceGroup>
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={applyFilter} style={styles.applyButton}>
              <Text style={styles.applyLabel}>Afficher {filtered.length} résultat{filtered.length === 1 ? '' : 's'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={sortVisible} transparent animationType="fade" onRequestClose={() => setSortVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer le tri" onPress={() => setSortVisible(false)} style={styles.scrim} />
          <View style={styles.sortSheet}>
            <Text style={styles.sheetTitle}>Trier par</Text>
            {SORT_OPTIONS.map((option) => (
              <Pressable key={option.id} onPress={() => { setSort(option.id); setSortVisible(false); }} style={styles.sortOption}>
                <Text style={[styles.sortLabel, sort === option.id && styles.selectedSortLabel]}>{option.label}</Text>
                {sort === option.id && <MaterialCommunityIcons name="check" size={19} color={COLORS.gold} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FavoriteRow({ entry, onOpen, onRemove }: { entry: FavoriteEntry; onOpen: () => void; onRemove: () => void }) {
  return (
    <View style={styles.favoriteRow}>
      <Pressable onPress={onOpen} style={styles.rowMain}>
        <View style={styles.rowArtwork}>
          <MaterialCommunityIcons name={entry.isPriere ? 'hands-pray' : 'music-note'} size={21} color="#0A1F44" />
        </View>
        <View style={styles.rowCopy}>
          <Text numberOfLines={1} style={styles.rowTitle}>{entry.title}</Text>
          <Text numberOfLines={1} style={styles.rowArtist}>{entry.artist}</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Retirer des favoris" onPress={onRemove} style={styles.heartButton}>
        <MaterialCommunityIcons name="heart" size={20} color={COLORS.rose} />
      </Pressable>
    </View>
  );
}

function ActiveFilters({ filters, onChange }: { filters: FavoriteFilters; onChange: (filters: FavoriteFilters) => void }) {
  const chips = [
    ...filters.categories.map((value) => ({ key: `category:${value}`, label: value, remove: () => onChange({ ...filters, categories: filters.categories.filter((item) => item !== value) }) })),
    ...filters.languages.map((value) => ({ key: `language:${value}`, label: value, remove: () => onChange({ ...filters, languages: filters.languages.filter((item) => item !== value) }) })),
    ...filters.moods.map((value) => ({ key: `mood:${value}`, label: MOODS.find((mood) => mood.id === value)?.label ?? value, remove: () => onChange({ ...filters, moods: filters.moods.filter((item) => item !== value) }) })),
    ...filters.occasions.map((value) => ({ key: `occasion:${value}`, label: value, remove: () => onChange({ ...filters, occasions: filters.occasions.filter((item) => item !== value) }) })),
    ...filters.durations.map((value) => ({ key: `duration:${value}`, label: DURATIONS.find((duration) => duration.id === value)?.label ?? value, remove: () => onChange({ ...filters, durations: filters.durations.filter((item) => item !== value) }) })),
    ...(filters.downloadedOnly ? [{ key: 'downloaded', label: 'Téléchargé', remove: () => onChange({ ...filters, downloadedOnly: false }) }] : []),
  ];
  if (filters.contentType !== 'all') chips.push({ key: 'contentType', label: { chants: 'Chants', prieres: 'Prières', lectures: 'Lectures' }[filters.contentType], remove: () => onChange({ ...filters, contentType: 'all' }) });
  if (chips.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChips}>
      {chips.map((chip) => <Pressable key={chip.key} onPress={chip.remove} style={styles.activeChip}><Text style={styles.activeChipLabel}>{chip.label}</Text><MaterialCommunityIcons name="close" size={14} color={COLORS.text} /></Pressable>)}
      <Pressable onPress={() => onChange(EMPTY_FILTERS)} style={styles.clearAll}><Text style={styles.clearAllLabel}>Effacer tout</Text></Pressable>
    </ScrollView>
  );
}

function ChoiceGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.choiceGroup}><Text style={styles.choiceTitle}>{title}</Text><View style={styles.choiceOptions}>{children}</View></View>;
}

function ChoicePill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choicePill, selected && styles.choicePillSelected]}><Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text></Pressable>;
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: '700' },
  topAction: { position: 'relative', width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 3, right: 0, width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: COLORS.gold },
  badgeText: { color: COLORS.background, fontSize: 9, fontWeight: '800' },
  content: { gap: 12, paddingBottom: 34 },
  statsHeader: { height: 80, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#0A1F44' },
  statsIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#7A1F3D55' },
  statsCopy: { flex: 1, gap: 3 },
  statsTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  statsSubtitle: { color: '#FFFFFFCC', fontSize: 12 },
  searchBox: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.card },
  searchInput: { flex: 1, minHeight: 42, color: COLORS.text, fontSize: 14 },
  activeChips: { gap: 6, paddingHorizontal: 16 },
  activeChip: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 16, backgroundColor: '#0A1F44' },
  activeChipLabel: { color: COLORS.text, fontSize: 11 },
  clearAll: { minHeight: 31, justifyContent: 'center', paddingHorizontal: 8 },
  clearAllLabel: { color: COLORS.gold, fontSize: 11, fontWeight: '700' },
  favoriteRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0A1F44' },
  rowMain: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowArtwork: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#0A1F4426' },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  rowArtist: { color: COLORS.muted, fontSize: 12 },
  heartButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  emptyState: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 28 },
  emptyText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#00000088' },
  filterSheet: { maxHeight: '90%', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: COLORS.background },
  sheetHandle: { width: 38, height: 4, alignSelf: 'center', marginBottom: 12, borderRadius: 2, backgroundColor: '#FFFFFF45' },
  sheetHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: COLORS.text, fontSize: 19, fontWeight: '700' },
  resetText: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  filterScroll: { flexShrink: 1 },
  choiceGroup: { gap: 9, marginTop: 14 },
  choiceTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  choiceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choicePill: { minHeight: 31, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.card },
  choicePillSelected: { borderColor: COLORS.gold, backgroundColor: COLORS.gold },
  choiceLabel: { color: COLORS.text, fontSize: 11 },
  choiceLabelSelected: { color: COLORS.background, fontWeight: '700' },
  applyButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderRadius: 14, backgroundColor: COLORS.gold },
  applyLabel: { color: COLORS.background, fontSize: 14, fontWeight: '700' },
  sortSheet: { marginHorizontal: 18, marginBottom: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.card },
  sortOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  sortLabel: { color: COLORS.text, fontSize: 13 },
  selectedSortLabel: { color: COLORS.gold, fontWeight: '700' },
});
