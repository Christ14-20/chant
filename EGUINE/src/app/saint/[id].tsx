import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';

const COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  gold: '#7A1F3D',
  text: '#0A1F44',
  muted: '#0A1F44',
  border: '#E5E5E5',
};

export default function SaintDetailScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <SymbolView name="chevron.left" size={19} tintColor={theme.textSecondary} />
        </Pressable>
        <Text style={styles.topTitle}>Saint du jour</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.notFound}>
        <SymbolView name="person.crop.circle.badge.questionmark" size={44} tintColor={theme.textSecondary} />
        <Text style={styles.notFoundTitle}>Aucune fiche disponible</Text>
        <Text style={styles.bodyText}>Les fiches de saints ne sont pas encore enregistrées dans la bibliothèque.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  bodyText: { color: COLORS.text, fontSize: 14, lineHeight: 22 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  notFoundTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
});