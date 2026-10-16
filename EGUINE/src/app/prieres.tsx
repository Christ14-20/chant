import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  RefreshControl,
  Animated,
  LayoutAnimation,
  UIManager,
  FlatList,
  Modal,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive, wp, hp } from "@/hooks/use-responsive";
import { useFontSize } from "@/hooks/use-font-size";
import { PriereCard } from '@/components/priere/PriereCard';
import { useAppStore } from '@/store/useAppStore';

// Active LayoutAnimation pour Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============ CONSTANTES ============

// Catégories principales de prières
const PRAYER_CATEGORIES = {
  quotidienne: 'Prières quotidiennes',
  fondamentale: 'Prières fondamentales',
  mariale: 'Prières mariales',
  intention: 'Prières par intention',
  liturgique: 'Prières liturgiques',
  esprit_saint: 'Prières à l\'Esprit Saint',
  devotion: 'Dévotions',
  defunts: 'Prières pour les défunts',
} as const;

// Sous-catégories
const PRAYER_SUB_CATEGORIES = {
  // Quotidiennes
  matin: 'Prière du matin',
  midi: 'Prière de midi',
  soir: 'Prière du soir',
  avant_dormir: 'Avant de dormir',
  
  // Fondamentales
  notre_pere: 'Notre Père',
  je_vous_salue_marie: 'Je vous salue Marie',
  gloire_au_pere: 'Gloire au Père',
  credo: 'Credo',
  acte_contrition: 'Acte de contrition',
  acte_foi: 'Acte de foi',
  acte_esperance: 'Acte d\'espérance',
  acte_charite: 'Acte de charité',
  
  // Mariales
  rosaire: 'Rosaire',
  chapelet: 'Chapelet',
  angelus: 'Angélus',
  salve_regina: 'Salve Regina',
  magnificat: 'Magnificat',
  litanies_vierge: 'Litanies de la Vierge',
  
  // Intentions
  guerison: 'Pour la guérison',
  paix: 'Pour la paix',
  famille: 'Pour la famille',
  malades: 'Pour les malades',
  defunts: 'Pour les défunts',
  vocations: 'Pour les vocations',
  enfants: 'Pour les enfants',
  etudiants: 'Pour les étudiants',
  travail: 'Pour le travail',
  difficulte: 'Pour les personnes en difficulté',
  
  // Liturgiques
  laudes: 'Laudes',
  tierce: 'Tierce',
  sexte: 'Sexte',
  none: 'None',
  vepres: 'Vêpres',
  complies: 'Complies',
  office_lectures: 'Office des lectures',
  
  // Esprit Saint
  invocation_esprit: 'Invocation à l\'Esprit Saint',
  veni_creator: 'Veni Creator',
  sequoia_pentecote: 'Séquences de Pentecôte',
  
  // Dévotions
  sacre_coeur: 'Sacré-Cœur de Jésus',
  divine_misericorde: 'Divine Miséricorde',
  saint_joseph: 'Saint Joseph',
  saints: 'Saints et saintes',
  anges: 'Anges et archanges',
  chemin_croix: 'Chemin de Croix',
  adoration: 'Adoration eucharistique',
  
  // Défunts
  priere_defunt: 'Prière pour un défunt',
  veillee_funebre: 'Veillée funèbre',
  messe_defunts: 'Messe des défunts',
  commemoration: 'Commémoration des fidèles défunts',
} as const;

// Moments de la journée
const MOMENTS = {
  matin: 'Matin',
  midi: 'Midi',
  soir: 'Soir',
  nuit: 'Nuit',
  tous: 'Tous les moments',
} as const;

type CategoryKey = keyof typeof PRAYER_CATEGORIES;
type SubCategoryKey = keyof typeof PRAYER_SUB_CATEGORIES;
type MomentKey = keyof typeof MOMENTS;

const SORT_OPTIONS = [
  { key: 'recent', label: 'Plus récentes', icon: 'clock' },
  { key: 'title', label: 'Alphabétique', icon: 'textformat' },
  { key: 'popular', label: 'Populaires', icon: 'flame' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['key'];

// ============ COMPOSANTS ============
const FilterButton = ({
  label,
  value,
  onPress,
  onClear,
  active,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
  onClear: () => void;
  active?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.filterButton,
      active && styles.filterButtonActive,
      pressed && styles.filterButtonPressed,
    ]}
  >
    <ThemedText style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
      {value || label}
    </ThemedText>
    <SymbolView name="chevron.down" size={14} tintColor={active ? '#208AEF' : '#8E8E93'} />
    {value && (
      <Pressable
        onPress={onClear}
        style={({ pressed }) => [
          styles.filterClear,
          pressed && styles.filterClearPressed,
        ]}
      >
        <SymbolView name="xmark.circle.fill" size={16} tintColor="#208AEF" />
      </Pressable>
    )}
  </Pressable>
);

// ============ COMPOSANT PRINCIPAL ============
export default function PrieresScreen() {
  const router = useRouter();
  const { pad, fs, wp, hp, isTablet, cardWidth } = useResponsive();
  const { fs: fsScale } = useFontSize();
  const theme = useTheme();
  const prieres = useAppStore((s) => s.prieres);
  const isFavoritePriere = useAppStore((s) => s.isFavoritePriere);
  const toggleFavoritePriere = useAppStore((s) => s.toggleFavoritePriere);

  // États des filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategoryKey | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<MomentKey | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // États des modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showMomentModal, setShowMomentModal] = useState(false);

  // Refs
  const searchInputRef = useRef<TextInput>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Calculs des compteurs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    prieres.forEach((p) => {
      if (p.publie !== false && p.categorie) {
        counts[p.categorie] = (counts[p.categorie] || 0) + 1;
      }
    });
    return counts;
  }, [prieres]);

  const subCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    prieres.forEach((p) => {
      if (p.publie !== false && p.sous_categorie) {
        counts[p.sous_categorie] = (counts[p.sous_categorie] || 0) + 1;
      }
    });
    return counts;
  }, [prieres]);

  const momentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    prieres.forEach((p) => {
      if (p.publie !== false && p.moment) {
        counts[p.moment] = (counts[p.moment] || 0) + 1;
      }
    });
    return counts;
  }, [prieres]);

  // Filtrage et tri
  const filteredPrieres = useMemo(() => {
    let result = prieres.filter((p) => p.publie !== false);

    // Recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.titre.toLowerCase().includes(query) ||
          p.contenu.toLowerCase().includes(query) ||
          p.theme?.toLowerCase().includes(query) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filtre catégorie
    if (selectedCategory) {
      result = result.filter((p) => p.categorie === selectedCategory);
    }

    // Filtre sous-catégorie
    if (selectedSubCategory) {
      result = result.filter((p) => p.sous_categorie === selectedSubCategory);
    }

    // Filtre moment
    if (selectedMoment) {
      result = result.filter((p) => p.moment === selectedMoment);
    }

    // Filtre favoris
    if (showFavoritesOnly) {
      result = result.filter((p) => isFavoritePriere(p.id));
    }

    // Tri
    switch (sortBy) {
      case 'title':
        result = [...result].sort((a, b) => a.titre.localeCompare(b.titre));
        break;
      case 'popular':
        result = [...result].sort((a, b) => (b.vues || 0) - (a.vues || 0));
        break;
      case 'recent':
      default:
        result = [...result].sort((a, b) => {
          const dateA = a.date_creation || a.created_at || '';
          const dateB = b.date_creation || b.created_at || '';
          return dateB.localeCompare(dateA);
        });
        break;
    }

    return result;
  }, [prieres, searchQuery, selectedCategory, selectedSubCategory, selectedMoment, sortBy, showFavoritesOnly, isFavoritePriere]);

  // Callbacks
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleSortChange = useCallback((sort: SortKey) => {
    setSortBy(sort);
    setShowSortOptions(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedMoment(null);
    setSearchQuery('');
    setShowFavoritesOnly(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const handleToggleFavorite = useCallback((id: string) => {
    toggleFavoritePriere(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [toggleFavoritePriere]);

  const handlePrierePress = useCallback((id: string) => {
    router.push(`/priere/${id}`);
  }, [router]);

  // Rendu
  const totalCount = filteredPrieres.length;
  const hasFilters = selectedCategory !== null || 
                     selectedSubCategory !== null || 
                     selectedMoment !== null || 
                     searchQuery.length > 0 || 
                     showFavoritesOnly;

  // ============ COMPOSANTS DE RENDU ============

  const renderModal = <T extends string>(
    visible: boolean,
    onClose: () => void,
    title: string,
    items: Record<string, string>,
    selected: T | null,
    onSelect: (key: T | null) => void,
    counts: Record<string, number>
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <ThemedView style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <ThemedView style={styles.modalHeader}>
            <ThemedText type="subtitle" style={styles.modalTitle}>{title}</ThemedText>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.modalClose, pressed && styles.modalClosePressed]}
            >
              <SymbolView name="xmark" size={20} tintColor="#8E8E93" />
            </Pressable>
          </ThemedView>
          
          <FlatList
            data={Object.entries(items)}
            renderItem={({ item: [key, label] }) => (
              <Pressable
                onPress={() => {
                  onSelect(selected === key ? null : key as T);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.modalItem,
                  selected === key && styles.modalItemActive,
                  pressed && styles.modalItemPressed,
                ]}
              >
                <ThemedText style={[styles.modalItemText, selected === key && styles.modalItemTextActive]}>
                  {label}
                </ThemedText>
                {selected === key && (
                  <SymbolView name="checkmark" size={18} tintColor="#208AEF" />
                )}
                {counts[key] !== undefined && (
                  <ThemedText style={styles.modalItemCount}>{counts[key]}</ThemedText>
                )}
              </Pressable>
            )}
            keyExtractor={([key]) => key}
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
          />
        </ThemedView>
      </Pressable>
    </Modal>
  );

  const renderHeader = () => (
    <>
      {/* En-tête */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerRow}>
          <ThemedText type="title" style={styles.headerTitle}>
            🙏 Prières
          </ThemedText>
          <ThemedView style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.headerAction,
                pressed && styles.headerActionPressed,
              ]}
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              <SymbolView
                name={viewMode === 'list' ? 'square.grid.2x2' : 'list.bullet'}
                size={22}
                tintColor="#8E8E93"
              />
            </Pressable>
          </ThemedView>
        </ThemedView>

        <ThemedText style={styles.subtitle}>
          {totalCount} prière{totalCount !== 1 ? 's' : ''}
          {hasFilters && ' • Filtré'}
        </ThemedText>

        {/* Barre de recherche toujours visible */}
        <ThemedView style={[styles.searchBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <SymbolView name="magnifyingglass" size={18} tintColor="#8E8E93" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Rechercher une prière..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <SymbolView name="xmark.circle.fill" size={18} tintColor="#8E8E93" />
            </Pressable>
          )}
        </ThemedView>
      </ThemedView>

      {/* Filtres */}
      <ThemedView style={styles.filtersContainer}>
        <ThemedView style={styles.filtersRow}>
          <FilterButton
            label="📂 Catégorie"
            value={selectedCategory ? PRAYER_CATEGORIES[selectedCategory] : null}
            onPress={() => setShowCategoryModal(true)}
            onClear={() => setSelectedCategory(null)}
            active={selectedCategory !== null}
          />
          <FilterButton
            label="📑 Sous-catégorie"
            value={selectedSubCategory ? PRAYER_SUB_CATEGORIES[selectedSubCategory] : null}
            onPress={() => setShowSubCategoryModal(true)}
            onClear={() => setSelectedSubCategory(null)}
            active={selectedSubCategory !== null}
          />
        </ThemedView>
        <FilterButton
          label="🕐 Moment"
          value={selectedMoment ? MOMENTS[selectedMoment] : null}
          onPress={() => setShowMomentModal(true)}
          onClear={() => setSelectedMoment(null)}
          active={selectedMoment !== null}
        />
      </ThemedView>

      {/* Barre d'actions */}
      <ThemedView style={styles.actionsBar}>
        <ThemedView style={styles.actionsLeft}>
          {/* Bouton Favoris */}
          <Pressable
            onPress={() => {
              setShowFavoritesOnly(!showFavoritesOnly);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => [
              styles.favoriteButton,
              showFavoritesOnly && styles.favoriteButtonActive,
              pressed && styles.favoriteButtonPressed,
            ]}
          >
            <SymbolView
              name="heart.fill"
              size={16}
              tintColor={showFavoritesOnly ? '#FF3B30' : '#8E8E93'}
            />
          </Pressable>

          {/* Menu de tri */}
          <Pressable
            style={({ pressed }) => [
              styles.sortButton,
              pressed && styles.sortButtonPressed,
            ]}
            onPress={() => setShowSortOptions(!showSortOptions)}
          >
            <SymbolView name="arrow.up.arrow.down" size={16} tintColor="#8E8E93" />
            <ThemedText style={styles.sortButtonText}>
              {SORT_OPTIONS.find((s) => s.key === sortBy)?.label || 'Trier'}
            </ThemedText>
            <SymbolView
              name={showSortOptions ? 'chevron.up' : 'chevron.down'}
              size={12}
              tintColor="#8E8E93"
            />
          </Pressable>

          {/* Effacer les filtres */}
          {hasFilters && (
            <Pressable
              onPress={handleClearFilters}
              style={({ pressed }) => [
                styles.clearFiltersButton,
                pressed && styles.clearFiltersButtonPressed,
              ]}
            >
              <SymbolView name="xmark" size={14} tintColor="#8E8E93" />
              <ThemedText style={styles.clearFiltersText}>Effacer</ThemedText>
            </Pressable>
          )}
        </ThemedView>
        <ThemedText style={styles.resultCount}>{totalCount}</ThemedText>
      </ThemedView>

      {/* Options de tri */}
      {showSortOptions && (
        <ThemedView style={[styles.sortOptions, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.sortOption,
                sortBy === option.key && styles.sortOptionActive,
              ]}
              onPress={() => handleSortChange(option.key)}
            >
              <SymbolView
                name={option.icon}
                size={16}
                tintColor={sortBy === option.key ? '#208AEF' : '#8E8E93'}
              />
              <ThemedText
                style={[
                  styles.sortOptionText,
                  sortBy === option.key && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </ThemedText>
              {sortBy === option.key && (
                <SymbolView name="checkmark" size={14} tintColor="#208AEF" />
              )}
            </Pressable>
          ))}
        </ThemedView>
      )}
    </>
  );

  const renderEmptyState = () => (
    <ThemedView style={styles.empty}>
      <SymbolView
        name={searchQuery ? 'magnifyingglass' : 'heart.slash'}
        size={56}
        tintColor="#8E8E93"
      />
      <ThemedText style={styles.emptyTitle}>
        {searchQuery ? 'Aucun résultat' : 'Aucune prière'}
      </ThemedText>
      <ThemedText style={styles.emptyText}>
        {searchQuery
          ? `Aucune prière ne correspond à "${searchQuery}"`
          : 'Aucune prière disponible avec ces filtres'}
      </ThemedText>
      {searchQuery && (
        <Pressable
          style={styles.emptyButton}
          onPress={() => setSearchQuery('')}
        >
          <ThemedText style={styles.emptyButtonText}>
            Effacer la recherche
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <Animated.FlatList
        data={filteredPrieres}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ThemedView style={viewMode === 'grid' ? styles.gridItemWrapper : undefined}>
            <PriereCard
              priere={item}
              onPress={() => handlePrierePress(item.id)}
              onFavoritePress={() => handleToggleFavorite(item.id)}
              isFavorite={isFavoritePriere(item.id)}
              variant={viewMode === 'grid' ? 'compact' : 'default'}
            />
          </ThemedView>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridWrapper : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
      />

      {/* Modals de filtres */}
      {renderModal(
        showCategoryModal,
        () => setShowCategoryModal(false),
        'Choisir une catégorie',
        PRAYER_CATEGORIES,
        selectedCategory,
        (key) => setSelectedCategory(key as CategoryKey | null),
        categoryCounts
      )}

      {renderModal(
        showSubCategoryModal,
        () => setShowSubCategoryModal(false),
        'Choisir une sous-catégorie',
        PRAYER_SUB_CATEGORIES,
        selectedSubCategory,
        (key) => setSelectedSubCategory(key as SubCategoryKey | null),
        subCategoryCounts
      )}

      {renderModal(
        showMomentModal,
        () => setShowMomentModal(false),
        'Choisir un moment',
        MOMENTS,
        selectedMoment,
        (key) => setSelectedMoment(key as MomentKey | null),
        momentCounts
      )}
    </ThemedView>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: BottomTabInset + wp(4),
  },
  header: {
    paddingHorizontal: wp(4),
    paddingTop: wp(8),
    gap: wp(2),
    paddingBottom: wp(2),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: wp(7),
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: wp(2),
  },
  headerAction: {
    padding: wp(1),
    borderRadius: wp(2),
  },
  headerActionPressed: {
    opacity: 0.7,
  },
  subtitle: {
    fontSize: wp(3.5),
    opacity: 0.6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: wp(2),
    borderRadius: wp(2),
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: wp(4),
    paddingVertical: Platform.OS === 'ios' ? 0 : 0,
  },
  filtersContainer: {
    paddingHorizontal: wp(4),
    paddingTop: wp(2),
    gap: wp(2),
  },
  filtersRow: {
    flexDirection: 'row',
    gap: wp(2),
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(3),
    paddingVertical: wp(2),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
    minHeight: 40,
  },
  filterButtonActive: {
    borderColor: '#208AEF',
    backgroundColor: 'rgba(32,138,239,0.08)',
  },
  filterButtonPressed: {
    opacity: 0.7,
  },
  filterButtonText: {
    flex: 1,
    fontSize: wp(3.5),
    fontWeight: '500',
    opacity: 0.6,
  },
  filterButtonTextActive: {
    color: '#208AEF',
    opacity: 1,
  },
  filterClear: {
    padding: 2,
    marginLeft: -4,
  },
  filterClearPressed: {
    opacity: 0.7,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: wp(2),
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  favoriteButton: {
    padding: wp(2),
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.15)',
  },
  favoriteButtonPressed: {
    opacity: 0.7,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingVertical: wp(1),
    paddingHorizontal: wp(2),
    borderRadius: wp(1),
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sortButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  sortButtonText: {
    fontSize: wp(3.5),
    opacity: 0.7,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2),
    paddingVertical: wp(1),
    borderRadius: 999,
    backgroundColor: 'rgba(255,59,48,0.06)',
  },
  clearFiltersButtonPressed: {
    backgroundColor: 'rgba(255,59,48,0.12)',
  },
  clearFiltersText: {
    fontSize: wp(3),
    color: '#FF3B30',
    opacity: 0.7,
  },
  resultCount: {
    fontSize: wp(3.5),
    opacity: 0.4,
    fontWeight: '500',
  },
  sortOptions: {
    marginHorizontal: wp(4),
    padding: wp(2),
    borderRadius: wp(2),
    borderWidth: 1,
    gap: wp(1),
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingVertical: wp(2),
    paddingHorizontal: wp(2),
    borderRadius: wp(1),
  },
  sortOptionActive: {
    backgroundColor: 'rgba(32,138,239,0.08)',
  },
  sortOptionText: {
    flex: 1,
    fontSize: wp(3.5),
    opacity: 0.7,
  },
  sortOptionTextActive: {
    opacity: 1,
    color: '#208AEF',
    fontWeight: '600',
  },
  gridWrapper: {
    gap: wp(2),
    paddingHorizontal: wp(2),
  },
  gridItemWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: wp(8),
    gap: wp(3),
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: wp(5),
    fontWeight: '600',
    opacity: 0.7,
  },
  emptyText: {
    fontSize: wp(4),
    opacity: 0.5,
    textAlign: 'center',
    paddingHorizontal: wp(4),
  },
  emptyButton: {
    paddingHorizontal: wp(4),
    paddingVertical: wp(2),
    borderRadius: wp(2),
    backgroundColor: 'rgba(32,138,239,0.12)',
    marginTop: wp(2),
  },
  emptyButtonText: {
    color: '#208AEF',
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: wp(4),
    paddingBottom: wp(6),
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: wp(3),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalTitle: {
    fontSize: wp(5),
    fontWeight: '600',
  },
  modalClose: {
    padding: wp(1),
    borderRadius: 999,
  },
  modalClosePressed: {
    opacity: 0.7,
  },
  modalList: {
    paddingTop: wp(2),
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: wp(3),
    paddingHorizontal: wp(2),
    borderRadius: 12,
  },
  modalItemActive: {
    backgroundColor: 'rgba(32,138,239,0.08)',
  },
  modalItemPressed: {
    opacity: 0.7,
  },
  modalItemText: {
    fontSize: wp(4),
    fontWeight: '500',
    flex: 1,
  },
  modalItemTextActive: {
    color: '#208AEF',
  },
  modalItemCount: {
    fontSize: wp(3.5),
    opacity: 0.4,
    marginLeft: wp(2),
  },
});