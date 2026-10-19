import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createThemedStyles } from '@/utils/themed-styles';
import { SORT_OPTIONS, type SortOption } from './filters';

export interface SortSheetProps {
  visible: boolean;
  sort: SortOption;
  onChange: (sort: SortOption) => void;
  onDismiss: () => void;
}

const styles = createThemedStyles({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sortSheet: {
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  sheetTitle: { color: '#000000', fontSize: 19, fontWeight: '700', marginBottom: 10 },
  sortOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5E5',
  },
  sortLabel: { color: '#000000', fontSize: 13 },
  selectedSortLabel: { color: '#7A1F3D', fontWeight: '800' },
});

export function SortSheet({ visible, sort, onChange, onDismiss }: SortSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le tri" onPress={onDismiss} style={styles.scrim} />
        <View style={styles.sortSheet}>
          <Text style={styles.sheetTitle}>Trier par</Text>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => { onChange(option.id); onDismiss(); }}
              style={styles.sortOption}
            >
              <Text style={[styles.sortLabel, sort === option.id && styles.selectedSortLabel]}>
                {option.label}
              </Text>
              {sort === option.id && <MaterialCommunityIcons name="check" size={19} color="#7A1F3D" />}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
