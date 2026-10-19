import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createThemedStyles } from '@/utils/themed-styles';
import { DURATIONS, EMPTY_FILTERS, type ChantFilters } from './filters';

export interface ActiveFiltersProps {
  filters: ChantFilters;
  onChange: (filters: ChantFilters) => void;
  moodLabels?: Record<string, string>;
  categoryLabels?: Record<string, string>;
  languageLabels?: Record<string, string>;
  seasonLabels?: Record<string, string>;
}

const styles = createThemedStyles({
  chips: { gap: 6, paddingHorizontal: 16 },
  chip: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: '#0A1F44',
  },
  chipLabel: { color: '#FFFFFF', fontSize: 11 },
  clearAll: { minHeight: 31, justifyContent: 'center', paddingHorizontal: 8 },
  clearAllLabel: { color: '#7A1F3D', fontSize: 11, fontWeight: '700' },
});

const CONTENT_TYPE_LABELS: Record<string, string> = {
  chants: 'Chants',
  prieres: 'Prières',
  lectures: 'Lectures',
};

export function ActiveFilters({
  filters, onChange, moodLabels, categoryLabels, languageLabels, seasonLabels,
}: ActiveFiltersProps) {
  const chips = [
    ...filters.categories.map((value) => ({
      key: `category:${value}`,
      label: categoryLabels?.[value] ?? value,
      remove: () =>
        onChange({ ...filters, categories: filters.categories.filter((item) => item !== value) }),
    })),
    ...filters.languages.map((value) => ({
      key: `language:${value}`,
      label: languageLabels?.[value] ?? value,
      remove: () =>
        onChange({ ...filters, languages: filters.languages.filter((item) => item !== value) }),
    })),
    ...filters.seasons.map((value) => ({
      key: `season:${value}`,
      label: seasonLabels?.[value] ?? value.replaceAll('_', ' '),
      remove: () => onChange({ ...filters, seasons: filters.seasons.filter((item) => item !== value) }),
    })),
    ...filters.moods.map((value) => ({
      key: `mood:${value}`,
      label: moodLabels?.[value] ?? value,
      remove: () => onChange({ ...filters, moods: filters.moods.filter((item) => item !== value) }),
    })),
    ...filters.occasions.map((value) => ({
      key: `occasion:${value}`,
      label: value,
      remove: () =>
        onChange({ ...filters, occasions: filters.occasions.filter((item) => item !== value) }),
    })),
    ...filters.durations.map((value) => ({
      key: `duration:${value}`,
      label: DURATIONS.find((duration) => duration.id === value)?.label ?? value,
      remove: () =>
        onChange({ ...filters, durations: filters.durations.filter((item) => item !== value) }),
    })),
    ...(filters.downloadedOnly
      ? [{ key: 'downloaded', label: 'Téléchargé', remove: () => onChange({ ...filters, downloadedOnly: false }) }]
      : []),
  ];
  if (filters.contentType !== 'all') {
    chips.push({
      key: 'contentType',
      label: CONTENT_TYPE_LABELS[filters.contentType] ?? filters.contentType,
      remove: () => onChange({ ...filters, contentType: 'all' }),
    });
  }
  if (chips.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {chips.map((chip) => (
        <Pressable key={chip.key} onPress={chip.remove} style={styles.chip}>
          <Text style={styles.chipLabel}>{chip.label}</Text>
          <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
        </Pressable>
      ))}
      <Pressable onPress={() => onChange(EMPTY_FILTERS)} style={styles.clearAll}>
        <Text style={styles.clearAllLabel}>Effacer tout</Text>
      </Pressable>
    </ScrollView>
  );
}
