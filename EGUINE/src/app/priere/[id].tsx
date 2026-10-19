import { createThemedStyles } from '@/utils/themed-styles';
import { ScrollView, StyleSheet, Pressable, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { goBackSafely } from '@/utils/navigation';

const MOMENT_CONFIG = {
  matin: { icon: 'sun.max.fill', color: '#7A1F3D', label: 'Matin' },
  midi: { icon: 'sun.min.fill', color: '#7A1F3D', label: 'Midi' },
  soir: { icon: 'moon.fill', color: '#725A61', label: 'Soir' },
  nuit: { icon: 'moon.stars.fill', color: '#725A61', label: 'Nuit' },
} as const;

export default function PriereDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const prieres = useAppStore((s) => s.prieres);
  const isFavoritePriere = useAppStore((s) => s.isFavoritePriere);
  const toggleFavoritePriere = useAppStore((s) => s.toggleFavoritePriere);
  const priere = prieres.find((item) => item.id === id);
  const isFav = id ? isFavoritePriere(id) : false;

  const handleFavorite = () => {
    if (!id) return;
    toggleFavoritePriere(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShare = async () => {
    if (!priere) return;
    await Share.share({ message: `${priere.titre}\n\n${priere.contenu}`, title: priere.titre });
  };

  if (!priere) {
    return (
      <ThemedView style={styles.errorContainer}>
        <SymbolView name="exclamationmark.triangle" size={48} tintColor="#7A1F3D" />
        <ThemedText style={styles.errorText}>Prière introuvable</ThemedText>
        <Pressable style={[styles.errorButton, { backgroundColor: theme.backgroundElement }]} onPress={goBackSafely}>
          <ThemedText style={{ color: theme.textSecondary, fontWeight: '600' }}>Retour</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const momentKey = priere.moment_jour as keyof typeof MOMENT_CONFIG | undefined;
  const moment = momentKey ? MOMENT_CONFIG[momentKey] : null;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top bar */}
        <ThemedView style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, { backgroundColor: theme.backgroundElement }, pressed && { opacity: 0.7 }]}
            onPress={goBackSafely}
          >
            <SymbolView name="chevron.left" size={16} tintColor={theme.textSecondary} />
            <ThemedText style={styles.backText}>Retour</ThemedText>
          </Pressable>
          <ThemedView style={styles.topActions}>
            <Pressable style={[styles.actionBtn, { backgroundColor: theme.backgroundElement }]} onPress={handleFavorite}>
              <SymbolView name={isFav ? 'heart.fill' : 'heart'} size={20} tintColor={isFav ? '#7A1F3D' : theme.textSecondary} />
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: theme.backgroundElement }]} onPress={handleShare}>
              <SymbolView name="square.and.arrow.up" size={20} tintColor={theme.textSecondary} />
            </Pressable>
          </ThemedView>
        </ThemedView>

        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedView style={[styles.iconBubble, { backgroundColor: `${moment?.color ?? theme.textSecondary}18` }]}>
            <SymbolView name={(moment?.icon ?? 'heart.fill') as any} size={28} tintColor={moment?.color ?? theme.textSecondary} />
          </ThemedView>
          <ThemedText style={styles.title}>{priere.titre}</ThemedText>
          <ThemedView style={styles.metaRow}>
            {moment && (
              <ThemedView style={[styles.metaChip, { backgroundColor: `${moment.color}15` }]}>
                <SymbolView name={moment.icon as any} size={12} tintColor={moment.color} />
                <ThemedText style={[styles.metaText, { color: moment.color }]}>{moment.label}</ThemedText>
              </ThemedView>
            )}
            <ThemedView style={[styles.metaChip, { backgroundColor: theme.backgroundSelected }]}>
              <SymbolView name="globe" size={12} tintColor={theme.textSecondary} />
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>{priere.langue}</ThemedText>
            </ThemedView>
            {priere.theme && (
              <ThemedView style={[styles.metaChip, { backgroundColor: theme.backgroundSelected }]}>
                <SymbolView name="tag" size={12} tintColor={theme.textSecondary} />
                <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>{priere.theme}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>

        {/* Contenu */}
        <ThemedView style={[styles.contentBlock, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText style={[styles.content, { color: theme.text }]}>{priere.contenu}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.amenRow}>
          <ThemedText style={[styles.amenText, { color: theme.textSecondary }]}>✝️ Amen</ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = createThemedStyles({
  scrollContent: { paddingBottom: 40 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingTop: Spacing.six, paddingBottom: Spacing.two,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 8,
  },
  backText: { color: '#000000', fontWeight: '600', fontSize: 15 },
  topActions: { flexDirection: 'row', gap: Spacing.two },
  actionBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, gap: Spacing.two },
  iconBubble: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', lineHeight: 32 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 8,
  },
  metaText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  contentBlock: {
    marginHorizontal: Spacing.four, padding: Spacing.four,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  content: { fontSize: 16, lineHeight: 28 },
  amenRow: { alignItems: 'center', paddingVertical: Spacing.four },
  amenText: { fontSize: 15, fontStyle: 'italic' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  errorText: { fontSize: 18 },
  errorButton: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 10 },
});
