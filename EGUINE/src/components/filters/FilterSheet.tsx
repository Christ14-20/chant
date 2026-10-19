import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createThemedStyles } from '@/utils/themed-styles';
import { ChoiceGroup } from './ChoiceGroup';
import { ChoicePill } from './ChoicePill';
import { DURATIONS, EMPTY_FILTERS, OCCASIONS, toggleValue, type ChantFilters, type CategoryOption, type DurationFilter, type LanguageOption, type MoodOption } from './filters';
import { useTheme } from '@/hooks/use-theme';

export interface FilterSheetProps {
  visible: boolean;
  filters: ChantFilters;
  onChange: (filters: ChantFilters) => void;
  onDismiss: () => void;
  onApply: (filters: ChantFilters) => void;
  categoryOptions?: CategoryOption[];
  languageOptions?: LanguageOption[];
  moodOptions?: MoodOption[];
  seasonOptions?: { value: string; label: string }[];
  showSeasons?: boolean;
  showMedia?: boolean;
  showDurations?: boolean;
  showOccasions?: boolean;
  showDownloaded?: boolean;
  applyLabel?: string;
}

const styles = createThemedStyles({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  filterSheet: {
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  sheetHandle: { width: 40, height: 5, alignSelf: 'center', marginBottom: 16, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.18)' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sheetTitle: { color: '#0A1F44', fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  closeButton: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E5',
  },
  mediaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E5',
  },
  mediaLabel: { color: '#0A1F44', fontSize: 13, fontWeight: '600' },
  applyButton: {
    minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 24, borderRadius: 16, backgroundColor: '#7A1F3D',
  },
  applyLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});

export function FilterSheet({
  visible, filters, onChange, onDismiss, onApply,
  categoryOptions = [], languageOptions = [], moodOptions = [], seasonOptions = [],
  showSeasons = false, showMedia = false, showDurations = true, showOccasions = true, showDownloaded = true,
  applyLabel = 'Afficher',
}: FilterSheetProps) {
  const theme = useTheme();
  const toggleCategory = (value: string) =>
    onChange({ ...filters, categories: toggleValue(filters.categories, value) });
  const toggleLanguage = (value: string) =>
    onChange({ ...filters, languages: toggleValue(filters.languages, value) });
  const toggleMood = (value: string) =>
    onChange({ ...filters, moods: toggleValue(filters.moods, value) });
  const toggleSeason = (value: string) =>
    onChange({ ...filters, seasons: toggleValue(filters.seasons, value) });
  const toggleDuration = (value: DurationFilter) =>
    onChange({ ...filters, durations: toggleValue(filters.durations, value) });
  const toggleOccasion = (value: string) =>
    onChange({ ...filters, occasions: toggleValue(filters.occasions, value) });
  const toggleMedia = (key: 'audioOnly' | 'lyricsOnly' | 'partitionOnly') =>
    onChange({ ...filters, [key]: !filters[key] });
  const toggleDownloaded = () => onChange({ ...filters, downloadedOnly: !filters.downloadedOnly });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer les filtres" onPress={onDismiss} style={styles.modalScrim} />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filtrer</Text>
            <Pressable onPress={onDismiss} style={styles.closeButton} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>
            {categoryOptions.length > 0 && (
              <ChoiceGroup title="Catégorie">
                {categoryOptions.map((option) => (
                  <ChoicePill
                    key={option.value}
                    label={option.label}
                    selected={filters.categories.includes(String(option.value))}
                    onPress={() => toggleCategory(String(option.value))}
                  />
                ))}
              </ChoiceGroup>
            )}
            {languageOptions.length > 0 && (
              <ChoiceGroup title="Langue">
                {languageOptions.map((option) => (
                  <ChoicePill
                    key={option.id}
                    label={option.label}
                    selected={filters.languages.includes(option.id)}
                    onPress={() => toggleLanguage(option.id)}
                  />
                ))}
              </ChoiceGroup>
            )}
            {moodOptions.length > 0 && (
              <ChoiceGroup title="Ambiance">
                {moodOptions.map((option) => (
                  <ChoicePill
                    key={option.id}
                    label={option.label}
                    selected={filters.moods.includes(option.id)}
                    onPress={() => toggleMood(option.id)}
                  />
                ))}
              </ChoiceGroup>
            )}

            {showSeasons && seasonOptions.length > 0 && (
              <ChoiceGroup title="Temps liturgique">
                {seasonOptions.map((option) => (
                  <ChoicePill
                    key={option.value}
                    label={option.label}
                    selected={filters.seasons.includes(option.value)}
                    onPress={() => toggleSeason(option.value)}
                  />
                ))}
              </ChoiceGroup>
            )}
            {showMedia && (
              <>
                <View style={styles.mediaRow}>
                  <Pressable onPress={() => toggleMedia('audioOnly')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons
                      name={filters.audioOnly ? 'volume-high' : 'volume-off'}
                      size={18}
                      color={filters.audioOnly ? '#7A1F3D' : theme.textSecondary}
                    />
                    <Text style={[styles.mediaLabel, filters.audioOnly && { color: '#7A1F3D', fontWeight: '800' }]}>
                      Audio uniquement
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.mediaRow}>
                  <Pressable onPress={() => toggleMedia('lyricsOnly')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons
                      name="text"
                      size={18}
                      color={filters.lyricsOnly ? '#7A1F3D' : theme.textSecondary}
                    />
                    <Text style={[styles.mediaLabel, filters.lyricsOnly && { color: '#7A1F3D', fontWeight: '800' }]}>
                      Avec paroles
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.mediaRow}>
                  <Pressable onPress={() => toggleMedia('partitionOnly')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons
                      name={filters.partitionOnly ? 'file-music' : 'file-music-outline'}
                      size={18}
                      color={filters.partitionOnly ? '#7A1F3D' : theme.textSecondary}
                    />
                    <Text style={[styles.mediaLabel, filters.partitionOnly && { color: '#7A1F3D', fontWeight: '800' }]}>
                      Partition disponible
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
            {showDurations && (
              <ChoiceGroup title="Durée">
                {DURATIONS.map((duration) => (
                  <ChoicePill
                    key={duration.id}
                    label={duration.label}
                    selected={filters.durations.includes(duration.id)}
                    onPress={() => toggleDuration(duration.id)}
                  />
                ))}
              </ChoiceGroup>
            )}
            {showOccasions && (
              <ChoiceGroup title="Occasion">
                {OCCASIONS.map((occasion) => (
                  <ChoicePill
                    key={occasion}
                    label={occasion}
                    selected={filters.occasions.includes(occasion)}
                    onPress={() => toggleOccasion(occasion)}
                  />
                ))}
              </ChoiceGroup>
            )}
            {showDownloaded && (
              <ChoicePill
                label="Téléchargé uniquement"
                selected={filters.downloadedOnly}
                onPress={toggleDownloaded}
                showCheck={false}
              />
            )}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={() => onApply(filters)} style={styles.applyButton}>
            <Text style={styles.applyLabel}>{applyLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
