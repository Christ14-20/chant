import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useStoreHydrated } from '@/hooks/use-store-hydrated';
import { useLocalChantSearch } from '@/hooks/use-local-chant-search';
import { createThemedStyles } from '@/utils/themed-styles';
import { goBackSafely } from '@/utils/navigation';

export default function MesChantsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isHydrated = useStoreHydrated();
  const [query, setQuery] = useState('');
  const { items: filteredChants, total, loading, loadingMore, error, hasMore, loadMore } =
    useLocalChantSearch({ personalOnly: true, query }, 150);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>BIBLIOTHÈQUE PERSONNELLE</Text>
          <Text style={[styles.title, { color: theme.text }]}>Mes chants</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Créer un chant"
          onPress={() => router.push('/mes-chants/nouveau')}
          style={styles.addButton}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={[styles.privacyNote, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <MaterialCommunityIcons name="shield-lock-outline" size={19} color="#7A1F3D" />
        <Text style={[styles.privacyText, { color: theme.text }]}>
          Vos chants restent privés et enregistrés sur cet appareil. La sauvegarde en ligne n’est pas activée.
        </Text>
      </View>

      {isHydrated && total > 0 && (
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            accessibilityLabel="Rechercher dans Mes chants"
            value={query}
            onChangeText={setQuery}
            placeholder="Titre, paroles ou auteur"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!isHydrated ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>Restauration de votre bibliothèque locale…</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text accessibilityRole="alert" style={[styles.emptyDescription, { color: theme.textSecondary }]}>{error}</Text>
          </View>
        ) : filteredChants.length === 0 && loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>Recherche dans votre bibliothèque locale…</Text>
          </View>
        ) : filteredChants.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
              <MaterialCommunityIcons name="music-note-plus" size={34} color="#7A1F3D" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {total === 0 && !query.trim() ? 'Votre bibliothèque commence ici' : 'Aucun chant trouvé'}
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
              {total === 0 && !query.trim()
                ? 'Créez une fiche, enregistrez un chant ou ajoutez ses paroles et ses partitions.'
                : 'Essayez un autre titre, un extrait des paroles ou un nom d’auteur.'}
            </Text>
            {total === 0 && !query.trim() && (
              <Pressable onPress={() => router.push('/mes-chants/nouveau')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Créer mon premier chant</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredChants.map((chant) => {
              const audioCount = chant.ressources?.filter((resource) => resource.type === 'audio').length ?? 0;
              const documentCount = chant.ressources?.filter((resource) => resource.type !== 'audio').length ?? 0;
              return (
                <Pressable
                  key={chant.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/mes-chants/[id]', params: { id: chant.id } })}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.cardIcon}>
                    <MaterialCommunityIcons name="music-note" size={22} color="#7A1F3D" />
                  </View>
                  <View style={styles.cardBody}>
                    <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.text }]}>{chant.titre}</Text>
                    <Text numberOfLines={1} style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                      {chant.auteur || 'Chant personnel'} · {chant.categorie.replaceAll('_', ' ')}
                    </Text>
                    <View style={styles.resourceSummary}>
                      {audioCount > 0 && (
                        <Text style={[styles.resourceText, { color: theme.textSecondary }]}>
                          <MaterialCommunityIcons name="microphone-outline" size={13} color={theme.textSecondary} /> {audioCount} audio
                        </Text>
                      )}
                      {documentCount > 0 && (
                        <Text style={[styles.resourceText, { color: theme.textSecondary }]}>
                          <MaterialCommunityIcons name="file-document-outline" size={13} color={theme.textSecondary} /> {documentCount} document{documentCount > 1 ? 's' : ''}
                        </Text>
                      )}
                      {chant.paroles.trim().length > 0 && (
                        <Text style={[styles.resourceText, { color: theme.textSecondary }]}>Paroles</Text>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
                </Pressable>
              );
            })}
            {hasMore && (
              <Pressable accessibilityRole="button" onPress={() => { void loadMore(); }} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{loadingMore ? 'Chargement…' : 'Charger plus'}</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12 },
  backButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 25, fontWeight: '800' },
  addButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#7A1F3D', alignItems: 'center', justifyContent: 'center' },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, padding: 12, borderWidth: 1, borderRadius: 12 },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 17 },
  searchBox: { marginHorizontal: 18, marginTop: 16, borderWidth: 1, borderRadius: 12, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 9 },
  content: { padding: 18, flexGrow: 1 },
  emptyState: { flex: 1, minHeight: 390, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  emptyIcon: { width: 76, height: 76, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { marginTop: 8, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  primaryButton: { marginTop: 22, borderRadius: 12, backgroundColor: '#7A1F3D', paddingHorizontal: 18, paddingVertical: 13 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  list: { gap: 10 },
  card: { minHeight: 82, borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.78 },
  cardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#7A1F3D18', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, textTransform: 'capitalize' },
  resourceSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resourceText: { fontSize: 11 },
});
