import { StyleSheet, Text, View } from 'react-native';
import { createThemedStyles } from '@/utils/themed-styles';

export interface ChoiceGroupProps {
  title: string;
  children: React.ReactNode;
}

const styles = createThemedStyles({
  group: { gap: 10, marginTop: 18 },
  title: {
    color: '#0A1F44',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

export function ChoiceGroup({ title, children }: ChoiceGroupProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.options}>{children}</View>
    </View>
  );
}
