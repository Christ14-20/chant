import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';
import { useAppStore } from '@/store/useAppStore';

const COLORS = { background: '#FFFFFF', card: '#FFFFFF', gold: '#D4AF37', teal: '#006B76', text: '#111827', muted: '#6B7280', border: '#E5E7EB' };

export default function ChantSearchScreen() {
  const router = useRouter();
  const chants = useAppStore((state) => state.chants);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const [query, setQuery] = useState('');

  const filteredChants = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return chants.filter((chant) => !term || [chant.titre, chant.paroles, chant.auteur, chant.compositeur].some((value) => value?.toLocaleLowerCase().includes(term)));
  }, [chants, query]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <SymbolView name="chevron.left" size={18} tintColor={COLORS.text} />
        </Pressable>
        <View style={styles.searchField}>
          <SymbolView name="magnifyingglass" size={17} tintColor={COLORS.muted} />
          <TextInput
            accessibilityLabel="Rechercher un chant, un auteur ou des paroles"
            autoFocus
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="Titre, auteur, paroles…"
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
          {query.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Effacer" onPress={() => setQuery('')}>
              <SymbolView name="xmark.circle.fill" size={18} tintColor={COLORS.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.count}>{filteredChants.length} chant{filteredChants.length === 1 ? '' : 's'} trouvé{filteredChants.length === 1 ? '' : 's'}</Text>
      {filteredChants.length === 0 ? (
        <View style={styles.emptyState}>
          <SymbolView name="magnifyingglass" size={40} tintColor={COLORS.muted} />
          <Text style={styles.emptyTitle}>Aucun chant trouvé</Text>
          <Text style={styles.emptyText}>Essayez un autre mot-clé pour votre recherche.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {filteredChants.map((chant) => {
            const isFavorite = favorites.includes(chant.id);
            return (
              <View key={chant.id} style={styles.chantRow}>
                <Pressable onPress={() => router.push(`/chant/${chant.id}`)} style={styles.chantOpen}>
                  <View style={styles.chantIcon}>
                    <SymbolView name="music.note" size={21} tintColor={COLORS.gold} />
                  </View>
                  <View style={styles.chantCopy}>
                    <Text numberOfLines={1} style={styles.chantTitle}>{chant.titre}</Text>
                    <Text numberOfLines={1} style={styles.chantMeta}>{chant.auteur || 'Chorale eGuine'} · {chant.langue.toUpperCase()}</Text>
                  </View>
                  <SymbolView name="chevron.right" size={15} tintColor={COLORS.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  hitSlop={8}
                  onPress={() => toggleFavorite(chant.id)}
                  style={styles.favoriteButton}
                >
                  <SymbolView name={isFavorite ? 'heart.fill' : 'heart'} size={19} tintColor={isFavorite ? '#EC4899' : COLORS.muted} />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  backButton: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchField: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.card },
  input: { flex: 1, minHeight: 42, color: COLORS.text, fontSize: 14 },
  count: { paddingHorizontal: 16, paddingVertical: 10, color: '#111827B3', fontSize: 13 },
  list: { gap: 8, paddingHorizontal: 12, paddingBottom: 28 },
  chantRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.card },
  chantOpen: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11 },
  chantIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: `${COLORS.teal}40` },
  chantCopy: { flex: 1, gap: 4 },
  chantTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  chantMeta: { color: '#11182799', fontSize: 12 },
  favoriteButton: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 24 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
});