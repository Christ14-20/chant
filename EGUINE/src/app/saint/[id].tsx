import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saints } from '@/data/mockData';
import { goBackSafely } from '@/utils/navigation';

const COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  gold: '#D4AF37',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
};

export default function SaintDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const saint = useMemo(() => saints.find((item) => item.id === id), [id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <SymbolView name="chevron.left" size={19} tintColor={COLORS.text} />
        </Pressable>
        <Text style={styles.topTitle}>Saint du jour</Text>
        <View style={styles.backButton} />
      </View>
      {saint ? (
        <ScrollView contentContainerStyle={styles.content}>
          {saint.image_url ? (
            <Image source={{ uri: saint.image_url }} style={styles.portrait} />
          ) : (
            <View style={styles.portraitPlaceholder}>
              <SymbolView name="person.fill" size={44} tintColor={COLORS.gold} />
            </View>
          )}
          <Text style={styles.name}>{saint.nom}</Text>
          <View style={styles.feastBadge}>
            <SymbolView name="calendar" size={14} tintColor={COLORS.gold} />
            <Text style={styles.feastText}>Fête : {saint.date_fete}</Text>
          </View>
          {(saint.pays || saint.diocèse) && (
            <Text style={styles.location}>{[saint.pays, saint.diocèse].filter(Boolean).join(' · ')}</Text>
          )}
          <View style={styles.biography}>
            <Text style={styles.sectionTitle}>Biographie</Text>
            <Text style={styles.bodyText}>{saint.biographie || 'Aucune biographie disponible pour le moment.'}</Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.notFound}>
          <SymbolView name="person.crop.circle.badge.questionmark" size={44} tintColor={COLORS.muted} />
          <Text style={styles.notFoundTitle}>Saint introuvable</Text>
          <Text style={styles.bodyText}>Cette fiche n’est pas disponible.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  content: { alignItems: 'center', padding: 22, paddingBottom: 40 },
  portrait: { width: 148, height: 148, borderRadius: 74 },
  portraitPlaceholder: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 74, backgroundColor: COLORS.card },
  name: { marginTop: 22, color: COLORS.text, fontSize: 25, fontWeight: '700', textAlign: 'center' },
  feastBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.card },
  feastText: { color: COLORS.gold, fontSize: 13, fontWeight: '600' },
  location: { marginTop: 10, color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  biography: { alignSelf: 'stretch', gap: 10, marginTop: 30, padding: 18, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.card },
  sectionTitle: { color: COLORS.gold, fontSize: 15, fontWeight: '700' },
  bodyText: { color: COLORS.text, fontSize: 14, lineHeight: 22 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  notFoundTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
});