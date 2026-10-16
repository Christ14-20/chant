import { Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Priere } from '@/types';

const MOMENT_ICONS: Record<string, string> = {
  matin: 'sun.max',
  midi: 'sun.min',
  soir: 'moon',
  nuit: 'moon.stars',
};

const MOMENT_COLORS: Record<string, string> = {
  matin: '#FF9500',
  midi: '#FFCC00',
  soir: '#5856D6',
  nuit: '#8E8E93',
};

interface PriereCardProps {
  priere: Priere;
  onPress?: () => void;
  onFavoritePress?: (id: string) => void;
  isFavorite?: boolean;
  style?: any;
  variant?: string;
}

export function PriereCard({ priere, onPress, onFavoritePress, isFavorite, style }: PriereCardProps) {
  const theme = useTheme();
  const momentKey = priere.moment_jour || priere.categorie;
  const icon = MOMENT_ICONS[momentKey] || 'heart';
  const color = MOMENT_COLORS[momentKey] || '#208AEF';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSelected },
        style,
      ]}
    >
      <ThemedView style={styles.header}>
        <ThemedView style={[styles.iconContainer, { backgroundColor: `${color}18` }]}>
          <SymbolView name={icon as any} size={22} tintColor={color} />
        </ThemedView>
        <ThemedView style={styles.textContainer}>
          <ThemedText style={styles.title}>{priere.titre}</ThemedText>
          <ThemedText style={[styles.meta, { color: theme.textSecondary }]}>
            {momentKey}
            {priere.langue !== 'fr' ? ` • ${priere.langue}` : ''}
          </ThemedText>
        </ThemedView>
        {onFavoritePress && (
          <Pressable onPress={() => onFavoritePress(priere.id)} hitSlop={12}>
            <SymbolView
              name={isFavorite ? 'heart.fill' : 'heart'}
              size={20}
              tintColor={isFavorite ? '#E91E63' : '#8E8E93'}
            />
          </Pressable>
        )}
      </ThemedView>
      <ThemedText style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={2}>
        {priere.contenu}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: { flex: 1, gap: Spacing.half },
  title: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, textTransform: 'capitalize' },
  preview: { fontSize: 13, lineHeight: 19 },
});
