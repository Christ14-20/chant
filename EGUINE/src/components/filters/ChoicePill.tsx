import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createThemedStyles } from '@/utils/themed-styles';

export interface ChoicePillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  showCheck?: boolean;
}

const styles = createThemedStyles({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
  },
  pillSelected: { borderColor: '#7A1F3D', backgroundColor: '#7A1F3D' },
  label: { color: '#0A1F44', fontSize: 12, fontWeight: '600' },
  labelSelected: { color: '#FFFFFF', fontWeight: '800' },
});

export function ChoicePill({ label, selected, onPress, showCheck = true }: ChoicePillProps) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}>
      {selected && showCheck && (
        <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
      )}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}
