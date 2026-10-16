import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';

const COLORS = { background: '#F9FAFB', surface: '#FFFFFF', navy: '#0A1F44', gold: '#D4AF37', text: '#111827', muted: '#6B7280', border: '#E5E7EB', green: '#059669' };

const SHORTCUTS = [
  { title: 'Lectures', icon: 'book-open-page-variant', color: '#3498DB' },
  { title: 'Évangile', icon: 'book-open-variant', color: '#E67E22' },
  { title: 'Méditation', icon: 'meditation', color: '#9B59B6' },
  { title: 'Couleurs', icon: 'palette-outline', color: '#E74C3C' },
  { title: 'Fêtes', icon: 'white-balance-sunny', color: '#D4A617' },
  { title: 'Temps', icon: 'history', color: '#7F8C8D' },
];
const READINGS = [
  { id: 'r1', label: '1ʳᵉ lecture', reference: 'Sg 2, 12.17-20', preview: '« Condamnons le juste à une mort infâme… »', icon: 'book-open-page-variant', color: '#3498DB', duration: '2 min' },
  { id: 'r2', label: 'Psaume', reference: 'Ps 53 (54)', preview: '« Le Seigneur est mon appui, il me soutient. »', icon: 'music-note', color: '#9B59B6', duration: '1 min' },
  { id: 'r3', label: '2ᵉ lecture', reference: 'Jc 3, 16 – 4, 3', preview: "« La sagesse d'en haut est pure et pacifique… »", icon: 'book-open-page-variant', color: '#3498DB', duration: '2 min' },
  { id: 'r4', label: 'Évangile', reference: 'Mc 9, 30-37', preview: '« Si quelqu’un veut être le premier, qu’il soit le serviteur de tous. »', icon: 'book-open-variant', color: '#E67E22', duration: '3 min' },
];
const SAINTS = [
  { id: 's1', name: 'Saint Matthieu', epithet: 'Apôtre & Évangéliste', color: COLORS.gold },
  { id: 's2', name: 'Sainte Thérèse', epithet: 'De Lisieux · 1897', color: '#D96A8E' },
  { id: 's3', name: 'Saint Maurice', epithet: 'Martyr · 287', color: '#8E5A9E' },
];
const MASSES = [
  { id: 'm1', name: 'Sainte Marie — Conakry', distance: '0,8 km', hours: ['08:30', '10:30', '18:00'], next: true },
  { id: 'm2', name: 'Cathédrale — Conakry', distance: '2,3 km', hours: ['07:00', '09:00', '11:00'], next: false },
  { id: 'm3', name: 'Saint Joseph — Matam', distance: '3,1 km', hours: ['08:00', '17:30'], next: false },
];

export default function KotlinLectureScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={21} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.topTitle}>Liturgie</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.date}>Dimanche 22 septembre 2024</Text>
          <View style={styles.seasonRow}>
            <View style={styles.seasonDot} />
            <Text style={styles.season}>25ᵉ dimanche du temps ordinaire</Text>
          </View>
        </View>

        <SectionHeader title="Explorer la liturgie" />
        <View style={styles.shortcutGrid}>
          {SHORTCUTS.map((shortcut) => (
            <Pressable key={shortcut.title} onPress={() => {}} style={styles.shortcut}>
              <View style={[styles.shortcutIcon, { backgroundColor: `${shortcut.color}20` }]}>
                <MaterialCommunityIcons name={shortcut.icon as any} size={20} color={shortcut.color} />
              </View>
              <Text style={styles.shortcutLabel}>{shortcut.title}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Lectures du jour" action="Tout lire" />
        <View style={styles.readingList}>
          {READINGS.map((reading) => (
            <Pressable key={reading.id} onPress={() => {}} style={styles.readingCard}>
              <View style={[styles.readingIcon, { backgroundColor: `${reading.color}20` }]}>
                <MaterialCommunityIcons name={reading.icon as any} size={22} color={reading.color} />
              </View>
              <View style={styles.readingCopy}>
                <Text style={[styles.readingKind, { color: reading.color }]}>{reading.label.toLocaleUpperCase()}</Text>
                <Text style={styles.readingReference}>{reading.reference}</Text>
                <Text numberOfLines={1} style={styles.readingPreview}>{reading.preview}</Text>
              </View>
              <Text style={styles.readingDuration}>{reading.duration}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF66" />
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Saints du jour" action="Voir tout" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.saintList}>
          {SAINTS.map((saint) => (
            <Pressable key={saint.id} onPress={() => {}} style={styles.saintCard}>
              <View style={[styles.saintIcon, { backgroundColor: `${saint.color}26` }]}>
                <MaterialCommunityIcons name="account-outline" size={21} color={saint.color} />
              </View>
              <Text numberOfLines={1} style={styles.saintName}>{saint.name}</Text>
              <Text numberOfLines={1} style={styles.saintEpithet}>{saint.epithet}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="Méditation du jour" />
        <View style={styles.meditationCard}>
          <View style={styles.meditationCopy}>
            <View style={styles.meditationLabel}>
              <MaterialCommunityIcons name="meditation" size={16} color="#9B59B6" />
              <Text style={styles.meditationLabelText}>Méditation</Text>
            </View>
            <Text style={styles.meditationTitle}>Être serviteur</Text>
            <Text numberOfLines={2} style={styles.meditationExcerpt}>Jésus nous rappelle que la grandeur se mesure à l’humilité et au service. Aujourd'hui, comment puis-je servir concrètement ?</Text>
          </View>
          <View style={styles.meditationPlay}><MaterialCommunityIcons name="play-circle" size={28} color="#9B59B6" /></View>
        </View>

        <SectionHeader title="Messes à proximité" action="Carte" />
        <View style={styles.massList}>
          {MASSES.map((mass) => (
            <Pressable key={mass.id} onPress={() => {}} style={styles.massCard}>
              <View style={styles.massIcon}><MaterialCommunityIcons name="church" size={20} color={COLORS.gold} /></View>
              <View style={styles.massCopy}>
                <View style={styles.massHeading}>
                  <Text numberOfLines={1} style={styles.massName}>{mass.name}</Text>
                  <Text style={styles.massDistance}>{mass.distance}</Text>
                </View>
                <View style={styles.massTimes}>
                  {mass.hours.map((hour, index) => <Text key={hour} style={[styles.massTime, mass.next && index === 0 && styles.massTimeNext]}>{hour}</Text>)}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && <Pressable onPress={() => {}}><Text style={styles.sectionAction}>{action}</Text></Pressable>}</View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: COLORS.navy, fontSize: 18, fontWeight: '700' },
  content: { gap: 11, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 32 },
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
  meditationLabelText: { color: '#9B59B6', fontSize: 11, fontWeight: '700' },
  meditationTitle: { color: COLORS.navy, fontSize: 15, fontWeight: '700' },
  meditationExcerpt: { color: COLORS.muted, fontSize: 11, lineHeight: 16 },
  meditationPlay: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#9B59B61A' },
  massList: { gap: 7, paddingHorizontal: 8 },
  massCard: { minHeight: 76, flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 13, backgroundColor: COLORS.surface },
  massIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFFFFF0D' },
  massCopy: { flex: 1, gap: 7 },
  massHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  massName: { flex: 1, color: COLORS.navy, fontSize: 13, fontWeight: '700' },
  massDistance: { color: COLORS.muted, fontSize: 10 },
  massTimes: { flexDirection: 'row', gap: 7 },
  massTime: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: '#0F172A14', color: COLORS.text, fontSize: 10, fontWeight: '700' },
  massTimeNext: { backgroundColor: COLORS.gold, color: COLORS.navy },
});
