import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';

const COLORS = { background: '#FFFFFF', surface: '#FFFFFF', navy: '#0A1F44', gold: '#7A1F3D', text: '#0A1F44', muted: '#0A1F44', border: '#FFFFFF', green: '#7A1F3D' };

export default function KotlinLectureScreen() {
  useTheme();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={21} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.topTitle}>Liturgie</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="book-open-page-variant" size={34} color={COLORS.gold} />
        <Text style={styles.emptyTitle}>Contenu liturgique indisponible</Text>
        <Text style={styles.emptyMessage}>Aucune lecture, fiche de saint ou horaire de messe n’est enregistré pour le moment.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: COLORS.navy, fontSize: 18, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 28 },
  emptyTitle: { color: COLORS.navy, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { color: COLORS.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  hero: { gap: 8, padding: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.surface },
  date: { color: COLORS.muted, fontSize: 12, fontWeight: '500' },
  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seasonDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.green },
  season: { color: COLORS.navy, fontSize: 18, fontWeight: '700' },
  sectionHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 8 },
  sectionTitle: { color: COLORS.navy, fontSize: 15, fontWeight: '700' },
  sectionAction: { color: COLORS.gold, fontSize: 11, fontWeight: '600' },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 8 },
  shortcut: { width: '31.7%', minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, backgroundColor: COLORS.surface },
  shortcutIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  shortcutLabel: { color: COLORS.text, fontSize: 11, fontWeight: '500' },
  readingList: { gap: 7, paddingHorizontal: 8 },
  readingCard: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.surface },
  readingIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  readingCopy: { flex: 1, gap: 2 },
  readingKind: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  readingReference: { color: COLORS.navy, fontSize: 14, fontWeight: '600' },
  readingPreview: { color: COLORS.muted, fontSize: 11 },
  readingDuration: { color: COLORS.muted, fontSize: 10 },
  saintList: { gap: 10, paddingHorizontal: 8 },
  saintCard: { width: 140, minHeight: 116, gap: 7, padding: 12, borderRadius: 14, backgroundColor: COLORS.surface },
  saintIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  saintName: { color: COLORS.navy, fontSize: 13, fontWeight: '700' },
  saintEpithet: { color: COLORS.muted, fontSize: 10 },
  meditationCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 8, padding: 14, borderRadius: 14, backgroundColor: COLORS.surface },
  meditationCopy: { flex: 1, gap: 4 },
  meditationLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meditationLabelText: { color: '#7A1F3D', fontSize: 11, fontWeight: '700' },
  meditationTitle: { color: COLORS.navy, fontSize: 15, fontWeight: '700' },
  meditationExcerpt: { color: COLORS.muted, fontSize: 11, lineHeight: 16 },
  meditationPlay: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#7A1F3D1A' },
  massList: { gap: 7, paddingHorizontal: 8 },
  massCard: { minHeight: 76, flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 13, backgroundColor: COLORS.surface },
  massIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFFFFF0D' },
  massCopy: { flex: 1, gap: 7 },
  massHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  massName: { flex: 1, color: COLORS.navy, fontSize: 13, fontWeight: '700' },
  massDistance: { color: COLORS.muted, fontSize: 10 },
  massTimes: { flexDirection: 'row', gap: 7 },
  massTime: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: '#0A1F4414', color: COLORS.text, fontSize: 10, fontWeight: '700' },
  massTimeNext: { backgroundColor: COLORS.gold, color: COLORS.navy },
});
