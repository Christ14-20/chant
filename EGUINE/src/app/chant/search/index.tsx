import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useLocalChantSearch } from '@/hooks/use-local-chant-search';
import { ActionColors } from '@/constants/theme';

const COLORS = { background: '#FFFFFF', card: '#FFFFFF', gold: '#7A1F3D', teal: '#725A61', text: '#000000', muted: '#4A4A4A', border: '#E5E5E5' };

export default function ChantSearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const [query, setQuery] = useState('');
  const {
    items: filteredChants,
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
  } = useLocalChantSearch({ query }, 180);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <SymbolView name="chevron.left" size={18} tintColor={theme.textSecondary} />
        </Pressable>
        <View style={styles.searchField}>
          <SymbolView name="magnifyingglass" size={17} tintColor={ActionColors.discovery} />
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
              <SymbolView name="xmark.circle.fill" size={18} tintColor={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.count}>{total} chant{total === 1 ? '' : 's'} trouvé{total === 1 ? '' : 's'}</Text>
      {error ? (
        <View style={styles.emptyState}>
          <Text accessibilityRole="alert" style={styles.emptyText}>{error}</Text>
        </View>
      ) : filteredChants.length === 0 && loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Recherche dans la bibliothèque locale…</Text>
        </View>
      ) : filteredChants.length === 0 ? (
        <View style={styles.emptyState}>
          <SymbolView name="magnifyingglass" size={40} tintColor={theme.textSecondary} />
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
                    <SymbolView name="music.note" size={21} tintColor={ActionColors.primary} />
                  </View>
                  <View style={styles.chantCopy}>
                    <Text numberOfLines={1} style={styles.chantTitle}>{chant.titre}</Text>
                    <Text numberOfLines={1} style={styles.chantMeta}>{chant.auteur || 'Chorale eGuine'} · {chant.langue.toUpperCase()}</Text>
                  </View>
                  <SymbolView name="chevron.right" size={15} tintColor={theme.textSecondary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  hitSlop={8}
                  onPress={() => toggleFavorite(chant.id)}
                  style={styles.favoriteButton}
                >
                  <SymbolView name={isFavorite ? 'heart.fill' : 'heart'} size={19} tintColor={isFavorite ? ActionColors.primary : theme.textSecondary} />
                </Pressable>
              </View>
            );
          })}
          {hasMore && (
            <Pressable accessibilityRole="button" onPress={() => { void loadMore(); }} style={styles.loadMore}>
              <Text style={styles.loadMoreLabel}>{loadingMore ? 'Chargement…' : 'Charger plus'}</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  backButton: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchField: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.card },
  input: { flex: 1, minHeight: 42, color: COLORS.text, fontSize: 14 },
  count: { paddingHorizontal: 16, paddingVertical: 10, color: '#4A4A4A', fontSize: 13 },
  list: { gap: 8, paddingHorizontal: 12, paddingBottom: 28 },
  loadMore: { alignItems: 'center', paddingVertical: 16 },
  loadMoreLabel: { color: COLORS.gold, fontSize: 14, fontWeight: '700' },
  chantRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.card },
  chantOpen: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11 },
  chantIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: `${COLORS.teal}40` },
  chantCopy: { flex: 1, gap: 4 },
  chantTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  chantMeta: { color: '#777777', fontSize: 12 },
  favoriteButton: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 24 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
});