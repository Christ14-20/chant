import { Platform, Pressable, StyleSheet, Animated } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useState, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Chant } from '@/types';
import { useAppStore } from '@/store/useAppStore';

// ============ CONSTANTES ============
const CATEGORIE_LABELS: Record<string, string> = {
  entree: 'Entrée',
  kyrie: 'Kyrie',
  gloria: 'Gloria',
  psaume: 'Psaume',
  acclamation: 'Acclamation',
  offertoire: 'Offertoire',
  sanctus: 'Sanctus',
  agnus_dei: 'Agnus Dei',
  communion: 'Communion',
  action_grace: 'Action de grâce',
  chant_final: 'Chant final',
  louange: 'Louange',
  adoration: 'Adoration',
  penitence: 'Pénitence',
  marial: 'Marial',
  funerailles: 'Funérailles',
  autre: 'Autre',
};

const CATEGORIE_COLORS: Record<string, string> = {
  entree: '#34C759',
  kyrie: '#FF9500',
  gloria: '#FFCC00',
  psaume: '#5856D6',
  acclamation: '#AF52DE',
  offertoire: '#FF2D55',
  sanctus: '#FF3B30',
  agnus_dei: '#FF6B6B',
  communion: '#208AEF',
  action_grace: '#34C759',
  chant_final: '#FF9500',
  louange: '#FFD700',
  adoration: '#AF52DE',
  penitence: '#8E8E93',
  marial: '#E91E63',
  funerailles: '#4A4A4A',
  autre: '#8E8E93',
};

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  soussou: '🇬🇳',
  poular: '🇬🇳',
  malinke: '🇬🇳',
};

// ============ COMPOSANT ============
interface ChantCardProps {
  chant: Chant;
  onPress?: () => void;
  onFavoritePress?: (id: string) => void;
  isFavorite?: boolean;
  style?: any;
  variant?: 'default' | 'compact' | 'featured';
  showPlayButton?: boolean;
}

export function ChantCard({
  chant, onPress, onFavoritePress, isFavorite: externalIsFavorite, style, variant = 'default', showPlayButton = false,
}: ChantCardProps) {
  const theme = useTheme();
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const internalIsFavorite = useAppStore((s) => s.isFavorite(chant.id));
  const isFav = externalIsFavorite !== undefined ? externalIsFavorite : internalIsFavorite;

  // État local
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Callbacks
  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [scaleAnim]);

  const handleFavoritePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onFavoritePress) {
      onFavoritePress(chant.id);
    } else {
      toggleFavorite(chant.id);
    }
  }, [chant.id, onFavoritePress, toggleFavorite]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      router.push(`/chant/${chant.id}`);
    }
  }, [chant.id, onPress]);

  // Rendu
  const categorieLabel = CATEGORIE_LABELS[chant.categorie] || chant.categorie;
  const categorieColor = CATEGORIE_COLORS[chant.categorie] || '#8E8E93';
  const langFlag = LANG_FLAGS[chant.langue] || '🌍';
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: '#FFFFFF', // 👈 Fond blanc
            borderColor: theme.border,
            borderWidth: StyleSheet.hairlineWidth,
          },
          isCompact && styles.cardCompact,
          isFeatured && { borderColor: 'rgba(32,138,239,0.25)', borderWidth: 1 },
          pressed && Platform.OS !== 'web' && { backgroundColor: '#F2F2F7' }, // 👈 gris clair au press
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Chant: ${chant.titre}`}
      >
        <ThemedView style={[styles.cardContent, isFeatured && styles.cardContentFeatured, { backgroundColor: 'transparent' }]}>
          {/* Badge catégorie */}
          <ThemedView style={[styles.categoryBadge, { backgroundColor: `${categorieColor}20` }]}>
            <ThemedView style={[styles.categoryDot, { backgroundColor: categorieColor }]} />
            <ThemedText style={[styles.categoryText, { color: categorieColor }]}>
              {categorieLabel}
            </ThemedText>
          </ThemedView>

          {/* En-tête */}
          <ThemedView style={styles.header}>
            <ThemedView style={styles.titleContainer}>
              <ThemedText type="default" style={[styles.title, isFeatured && styles.titleFeatured]}>
                {chant.titre}
              </ThemedText>
              {chant.tonalite && (
                <ThemedView style={styles.tonaliteBadge}>
                  <ThemedText style={styles.tonaliteText}>{chant.tonalite}</ThemedText>
                </ThemedView>
              )}
            </ThemedView>

            <ThemedView style={styles.headerActions}>
              {showPlayButton && (
                <Pressable
                  style={({ pressed }) => [
                    styles.playButton,
                    pressed && styles.playButtonPressed,
                  ]}
                  onPress={handlePress}
                  accessibilityLabel="Écouter le chant"
                >
                  <SymbolView name="play.circle.fill" size={28} tintColor="#208AEF" />
                </Pressable>
              )}
              <Pressable
                onPress={handleFavoritePress}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.favoriteButton,
                  pressed && styles.favoriteButtonPressed,
                ]}
                accessibilityLabel={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                accessibilityRole="button"
                accessibilityState={{ selected: isFav }}
              >
                <SymbolView
                  name={isFav ? 'heart.fill' : 'heart'}
                  tintColor={isFav ? '#E91E63' : '#8E8E93'}
                  size={isCompact ? 18 : 22}
                />
              </Pressable>
            </ThemedView>
          </ThemedView>

          {/* Métadonnées */}
          <ThemedView style={styles.metaContainer}>
            <ThemedView style={styles.metaItem}>
              <ThemedText style={styles.metaText}>
                {langFlag} {chant.langue === 'fr' ? 'Français' : chant.langue}
              </ThemedText>
            </ThemedView>
            {chant.temps_liturgique && (
              <ThemedView style={styles.metaItem}>
                <SymbolView name="calendar" size={12} tintColor="#8E8E93" />
                <ThemedText style={styles.metaText}>
                  {chant.temps_liturgique.replace('_', ' ')}
                </ThemedText>
              </ThemedView>
            )}
            {chant.vues !== undefined && (
              <ThemedView style={styles.metaItem}>
                <SymbolView name="eye" size={12} tintColor="#8E8E93" />
                <ThemedText style={styles.metaText}>
                  {chant.vues} vues
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>

          {/* Auteur */}
          {chant.auteur && (
            <ThemedText style={styles.auteur}>
              ✍️ {chant.auteur}
            </ThemedText>
          )}

          {/* Tags */}
          {chant.tags && chant.tags.length > 0 && (
            <ThemedView style={styles.tags}>
              {chant.tags.slice(0, isCompact ? 2 : 4).map((tag) => (
                <ThemedView key={tag.id} style={[styles.tag, { backgroundColor: `${theme.backgroundSelected}` }]}>
                  <ThemedText type="small" style={[styles.tagText, { color: '#208AEF' }]}>
                    #{tag.nom}
                  </ThemedText>
                </ThemedView>
              ))}
              {chant.tags.length > (isCompact ? 2 : 4) && (
                <ThemedView style={[styles.tagMore, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small" style={styles.tagMoreText}>
                    +{chant.tags.length - (isCompact ? 2 : 4)}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          )}

          {/* Extrait des paroles (pour la version featured) */}
          {isFeatured && chant.paroles && (
            <ThemedText style={styles.parolesExtrait} numberOfLines={2}>
              {chant.paroles.slice(0, 120)}...
            </ThemedText>
          )}

          {/* Indicateur de téléchargement */}
          {chant.downloaded && (
            <ThemedView style={styles.downloadBadge}>
              <SymbolView name="checkmark.circle.fill" size={14} tintColor="#34C759" />
              <ThemedText style={styles.downloadBadgeText}>Téléchargé</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    // Ombre légère pour faire ressortir le fond blanc
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCompact: {
    marginHorizontal: Spacing.two,
    marginVertical: Spacing.one,
  },
  cardFeatured: {
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  cardContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    borderRadius: Spacing.three,
  },
  cardContentFeatured: {
    padding: Spacing.five,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  titleFeatured: {
    fontSize: 20,
    fontWeight: '700',
  },
  tonaliteBadge: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.half,
  },
  tonaliteText: {
    fontSize: 10,
    opacity: 0.5,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  playButton: {
    padding: Spacing.one,
  },
  playButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  favoriteButton: {
    padding: Spacing.one,
  },
  favoriteButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.9 }],
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.5,
    textTransform: 'capitalize',
  },
  auteur: {
    fontSize: 12,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  tagText: {
    fontSize: 11,
    color: '#208AEF',
    textTransform: 'capitalize',
  },
  tagMore: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  tagMoreText: {
    fontSize: 11,
    opacity: 0.5,
  },
  parolesExtrait: {
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 20,
    fontStyle: 'italic',
    paddingTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  downloadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
    backgroundColor: 'rgba(52,199,89,0.1)',
  },
  downloadBadgeText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500',
  },
});