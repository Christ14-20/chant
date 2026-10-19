import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackTo } from '@/utils/navigation';
import { countChants } from '@/database/chant-database';
import { useLocalChantSearch } from '@/hooks/use-local-chant-search';

const COLORS = { background: '#FFFFFF', card: '#FFFFFF', gold: '#0A1F44', text: '#0A1F44', muted: '#0A1F44', border: '#FFFFFF', teal: '#0A1F44' };
const EMPTY_COLLECTIONS: { id: string; title: string; type: string }[] = [];

const COLLECTIONS: Record<string, { id: string; title: string; type: string }[]> = {
  moment: [
    { id: 'entree', title: 'Chant d’entrée', type: 'moment' },
    { id: 'kyrie', title: 'Kyrie', type: 'categorie' },
    { id: 'gloria', title: 'Gloria', type: 'categorie' },
    { id: 'psaume', title: 'Psaume responsorial', type: 'categorie' },
    { id: 'acclamation', title: 'Acclamation de l’Évangile', type: 'categorie' },
    { id: 'offertoire', title: 'Offertoire', type: 'categorie' },
    { id: 'sanctus', title: 'Sanctus', type: 'categorie' },
    { id: 'communion', title: 'Communion', type: 'categorie' },
    { id: 'action_grace', title: 'Action de grâce', type: 'categorie' },
    { id: 'chant_final', title: 'Chant final et envoi', type: 'categorie' },
  ],
  langue: [
    { id: 'soussou', title: 'Soussou', type: 'langue' },
    { id: 'poular', title: 'Poular', type: 'langue' },
    { id: 'malinke', title: 'Malinké', type: 'langue' },
    { id: 'kissi', title: 'Kissi', type: 'langue' },
    { id: 'guerze', title: 'Guerzé', type: 'langue' },
    { id: 'toma', title: 'Toma', type: 'langue' },
    { id: 'kpele', title: 'Kpelé', type: 'langue' },
    { id: 'fr', title: 'Français', type: 'langue' },
    { id: 'en', title: 'Latin et anglais', type: 'langue' },
  ],
  temps: [
    { id: 'avent', title: 'Temps de l’Avent', type: 'temps' },
    { id: 'noel', title: 'Temps de Noël', type: 'temps' },
    { id: 'careme', title: 'Temps du Carême', type: 'temps' },
    { id: 'temps_pascal', title: 'Temps pascal', type: 'temps' },
    { id: 'temps_ordinaire', title: 'Temps ordinaire', type: 'temps' },
  ],
  theme: [
    { id: 'louange', title: 'Je veux louer', type: 'humeur' },
    { id: 'adoration', title: 'Je veux adorer', type: 'humeur' },
    { id: 'paix', title: "J'ai besoin de paix", type: 'humeur' },
    { id: 'priere', title: 'Je veux prier', type: 'humeur' },
    { id: 'consolation', title: 'Besoin de consolation', type: 'humeur' },
  ],
};

const TYPE_TITLES: Record<string, string> = {
  moment: 'Chants de Messe',
  langue: 'Chants par langue',
  temps: 'Temps liturgiques',
  theme: 'Thèmes spirituels',
  categorie: 'Catégorie',
};

function collectionOptions(type: string, id: string) {
  const key = id.toLocaleLowerCase().replaceAll('-', '_');
  if (type === 'langue') return { language: key };
  if (type === 'temps') return { liturgicalSeason: key };
  if (type === 'moment') return { momentOrCategory: key };
  if (type === 'theme' || type === 'humeur') return { mood: key };
  return { category: key };
}

export default function ChantCategoryScreen() {
  useTheme();
  const router = useRouter();
  const { type = 'moment', id = 'all' } = useLocalSearchParams<{ type: string; id: string }>();
  const normalizedType = type.toLocaleLowerCase();
  const collectionType = normalizedType === 'moments' ? 'moment'
    : ['humeurs', 'humeur_list'].includes(normalizedType) ? 'theme'
    : ['langues', 'langue_list'].includes(normalizedType) ? 'langue'
    : normalizedType;
  const collections = COLLECTIONS[collectionType] ?? EMPTY_COLLECTIONS;
  const isCollectionList = id.toLocaleLowerCase() === 'all' || id.length === 0;
  const selectedCollection = collections.find((item) => item.id === id.toLocaleLowerCase());
  const title = selectedCollection?.title ?? TYPE_TITLES[collectionType] ?? id.replaceAll('_', ' ');

  const queryOptions = useMemo(
    () => ({ ...collectionOptions(collectionType, id), enabled: !isCollectionList }),
    [collectionType, id, isCollectionList],
  );
  const { items: filteredChants, total, loading, loadingMore, error, hasMore, loadMore } =
    useLocalChantSearch(queryOptions);
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isCollectionList) return;
    let active = true;
    void Promise.all(collections.map(async (collection) => [
      collection.id,
      await countChants(collectionOptions(collection.type, collection.id)),
    ] as const))
      .then((entries) => {
        if (active) setCollectionCounts(Object.fromEntries(entries));
      })
      .catch((countError: unknown) => {
        console.error('Impossible de compter les chants des collections locales.', countError);
      });
    return () => { active = false; };
  }, [collections, isCollectionList]);

  const goToCollection = (collection: { id: string; title: string; type: string }) => {
    router.push({ pathname: '/chant/category/[type]/[id]', params: { type: collection.type, id: collection.id } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => goBackTo('/chants')} style={styles.backButton}>
          <SymbolView name="chevron.left" size={18} tintColor={COLORS.text} />
        </Pressable>
        <Text numberOfLines={1} style={styles.topTitle}>{isCollectionList ? title : `Chants · ${title}`}</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          {isCollectionList ? 'Parcourez les chants par moment de messe, langue ou temps liturgique.' : `${total} chant${total === 1 ? '' : 's'} dans cette sélection.`}
        </Text>
        {isCollectionList ? (
          collections.map((collection) => {
            const count = collectionCounts[collection.id] ?? 0;
            return (
              <Pressable key={`${collection.type}-${collection.id}`} onPress={() => goToCollection(collection)} style={styles.collectionRow}>
                <View style={styles.collectionIcon}>
                  <SymbolView name={collection.type === 'langue' ? 'globe' : collection.type === 'temps' ? 'calendar' : 'music.note'} size={20} tintColor={COLORS.gold} />
                </View>
                <View style={styles.collectionCopy}>
                  <Text style={styles.collectionTitle}>{collection.title}</Text>
                  <Text style={styles.collectionMeta}>{count} chant{count === 1 ? '' : 's'}</Text>
                </View>
                <SymbolView name="chevron.right" size={15} tintColor={COLORS.muted} />
              </Pressable>
            );
          })
        ) : error ? (
          <Text accessibilityRole="alert" style={styles.subtitle}>{error}</Text>
        ) : loading && filteredChants.length === 0 ? (
          <Text style={styles.subtitle}>Recherche dans la bibliothèque locale…</Text>
        ) : filteredChants.length > 0 ? (
          <>
            {filteredChants.map((chant) => (
              <Pressable key={chant.id} onPress={() => router.push(`/chant/${chant.id}`)} style={styles.chantRow}>
                <View style={styles.chantIcon}>
                  <SymbolView name="music.note" size={21} tintColor={COLORS.gold} />
                </View>
                <View style={styles.collectionCopy}>
                  <Text numberOfLines={1} style={styles.collectionTitle}>{chant.titre}</Text>
                  <Text style={styles.collectionMeta}>{chant.langue.toUpperCase()} · {chant.auteur || 'Chorale eGuine'}</Text>
                </View>
                <SymbolView name="chevron.right" size={15} tintColor={COLORS.muted} />
              </Pressable>
            ))}
            {hasMore && (
              <Pressable accessibilityRole="button" onPress={() => { void loadMore(); }} style={styles.loadMore}>
                <Text style={styles.loadMoreLabel}>{loadingMore ? 'Chargement…' : 'Charger plus'}</Text>
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <SymbolView name="music.note.list" size={38} tintColor={COLORS.muted} />
            <Text style={styles.emptyTitle}>Aucun chant dans cette sélection</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  content: { gap: 8, padding: 14, paddingBottom: 32 },
  loadMore: { alignItems: 'center', paddingVertical: 14 },
  loadMoreLabel: { color: COLORS.gold, fontSize: 14, fontWeight: '700' },
  subtitle: { marginBottom: 8, color: '#0A1F44B3', fontSize: 13, lineHeight: 19 },
  collectionRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11, backgroundColor: COLORS.card },
  collectionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: `${COLORS.teal}55` },
  collectionCopy: { flex: 1, gap: 4 },
  collectionTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  collectionMeta: { color: COLORS.muted, fontSize: 12 },
  chantRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.card },
  chantIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: `${COLORS.teal}55` },
  emptyState: { alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyTitle: { color: COLORS.muted, fontSize: 14, textAlign: 'center' },
});