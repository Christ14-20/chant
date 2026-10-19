import { createThemedStyles } from '@/utils/themed-styles';
import { Platform, Pressable, StyleSheet, Animated, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useState, useRef, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ActionColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Chant } from '@/types';
import { useAppStore } from '@/store/useAppStore';

// ============ CONSTANTES ============
const CATEGORIE_LABELS: Record<string, string> = {
  entree: 'Entrée', kyrie: 'Kyrie', gloria: 'Gloria', psaume: 'Psaume',
  acclamation: 'Acclamation', offertoire: 'Offertoire', sanctus: 'Sanctus',
  agnus_dei: 'Agnus Dei', communion: 'Communion', action_grace: 'Action de grâce',
  chant_final: 'Chant final', louange: 'Louange', adoration: 'Adoration',
  penitence: 'Pénitence', marial: 'Marial', funerailles: 'Funérailles', autre: 'Autre',
};

const CATEGORIE_COLORS: Record<string, string> = {
  entree: '#7A1F3D', kyrie: '#7A1F3D', gloria: '#7A1F3D', psaume: '#725A61',
  acclamation: '#7A1F3D', offertoire: '#7A1F3D', sanctus: '#7A1F3D',
  agnus_dei: '#7A1F3D', communion: '#725A61', action_grace: '#7A1F3D',
  chant_final: '#7A1F3D', louange: '#7A1F3D', adoration: '#7A1F3D',
  penitence: '#725A61', marial: '#7A1F3D', funerailles: '#725A61', autre: '#725A61',
};

const LANG_LABELS: Record<string, string> = {
  fr: 'Français', la: 'Latin', es: 'Espagnol', soussou: 'Soussou', poular: 'Poular', malinke: 'Malinké',
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
  chant, onPress, onFavoritePress, isFavorite: externalIsFavorite,
  style, variant = 'default', showPlayButton = false,
}: ChantCardProps) {
  const theme = useTheme();
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const internalIsFavorite = useAppStore((s) => s.isFavorite(chant.id));
  const isFav = externalIsFavorite !== undefined ? externalIsFavorite : internalIsFavorite;

  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, speed: 14, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 50 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  }, [scaleAnim]);

  const handleFavoritePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, speed: 60 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    if (onFavoritePress) onFavoritePress(chant.id);
    else toggleFavorite(chant.id);
  }, [chant.id, onFavoritePress, toggleFavorite, heartScale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) onPress();
    else router.push(`/chant/${chant.id}`);
  }, [chant.id, onPress]);

  const categorieLabel = CATEGORIE_LABELS[chant.categorie] || chant.categorie;
  const categorieColor = CATEGORIE_COLORS[chant.categorie] || '#725A61';
  const langLabel = LANG_LABELS[chant.langue] || chant.langue;
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  const isDark = theme.background === '#000000';
  const cardBg = isDark ? '#000000' : '#FFFFFF';
  const cardPressedBg = isDark ? '#000000' : '#FFFFFF';
  const mutedColor = isDark ? 'rgba(255,255,255,0.55)' : '#4A4A4A';

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ translateY }, { scale: scaleAnim }] },
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          isCompact && styles.cardCompact,
          isFeatured && styles.cardFeatured,
          {
            backgroundColor: isPressed && Platform.OS !== 'web' ? cardPressedBg : cardBg,
            shadowColor: '#000000',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Chant: ${chant.titre}`}
      >
        {/* Ligne d'accent colorée à gauche (signature visuelle) */}
        <View style={[styles.accentBar, { backgroundColor: categorieColor }]} />

        <View style={[styles.cardContent, isFeatured && styles.cardContentFeatured]}>
          {/* ── HEADER : badge catégorie + langue + favori ── */}
          <View style={styles.header}>
            <View style={[styles.categoryPill, { backgroundColor: `${categorieColor}1A` }]}>
              <View style={[styles.categoryDot, { backgroundColor: categorieColor }]} />
              <ThemedText style={[styles.categoryText, { color: categorieColor }]}>
                {categorieLabel}
              </ThemedText>
            </View>

            <View style={styles.headerActions}>
              {/* Badge langue pill */}
              <View style={[styles.langPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(122,31,61,0.06)' }]}>
                {!isCompact && (
                  <ThemedText style={[styles.langText, { color: mutedColor }]} numberOfLines={1}>
                    {langLabel}
                  </ThemedText>
                )}
              </View>

              {/* Bouton favori avec animation */}
              <Pressable
                onPress={handleFavoritePress}
                hitSlop={10}
                style={styles.favoriteButton}
                accessibilityLabel={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <SymbolView
                    name={isFav ? 'heart.fill' : 'heart'}
                    tintColor={isFav ? ActionColors.primary : mutedColor}
                    size={isCompact ? 18 : 20}
                  />
                </Animated.View>
              </Pressable>
            </View>
          </View>

          {/* ── TITRE + AUTEUR ── */}
          <View style={styles.titleBlock}>
            <ThemedText
              style={[styles.title, isFeatured && styles.titleFeatured]}
              numberOfLines={2}
            >
              {chant.titre}
            </ThemedText>
            {chant.auteur && (
              <ThemedText style={[styles.auteur, { color: mutedColor }]} numberOfLines={1}>
                {chant.auteur}
              </ThemedText>
            )}
          </View>

          {/* ── EXTRAIT PAROLES (featured) ── */}
          {isFeatured && chant.paroles && (
            <ThemedText style={[styles.parolesExtrait, { color: mutedColor }]} numberOfLines={2}>
              “{chant.paroles.slice(0, 110).trim()}…”
            </ThemedText>
          )}

          {/* ── DIVIDER ── */}
          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

          {/* ── META INFOS INLINE ── */}
          <View style={styles.metaRow}>
            {chant.tonalite && (
              <MetaItem icon="music.note" label={chant.tonalite} color={mutedColor} />
            )}
            {chant.temps_liturgique && (
              <MetaItem
                icon="calendar"
                label={chant.temps_liturgique.replace('_', ' ')}
                color={mutedColor}
              />
            )}
            {chant.vues !== undefined && (
              <MetaItem icon="eye" label={`${chant.vues}`} color={mutedColor} />
            )}
            {chant.downloaded && (
              <View style={styles.downloadDot}>
                <SymbolView name="checkmark.circle.fill" size={12} tintColor={ActionColors.success} />
                <ThemedText style={[styles.downloadText, { color: '#7A1F3D' }]}>
                  Hors-ligne
                </ThemedText>
              </View>
            )}
          </View>

          {/* ── TAGS ── */}
          {chant.tags && chant.tags.length > 0 && (
            <View style={styles.tags}>
              {chant.tags.slice(0, isCompact ? 2 : 3).map((tag) => (
                <View
                  key={tag.id}
                  style={[
                    styles.tag,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(122,31,61,0.06)' },
                  ]}
                >
                  <ThemedText style={styles.tagText}>#{tag.nom}</ThemedText>
                </View>
              ))}
              {chant.tags.length > (isCompact ? 2 : 3) && (
                <View style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(122,31,61,0.08)' }]}>
                  <ThemedText style={[styles.tagText, { color: mutedColor }]}>
                    +{chant.tags.length - (isCompact ? 2 : 3)}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {/* ── CTA PLAY (optionnel) ── */}
          {showPlayButton && (
            <Pressable
              onPress={handlePress}
              style={({ pressed }) => [
                styles.playCTA,
                { backgroundColor: ActionColors.playback },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <SymbolView name="play.fill" size={14} tintColor="#FFFFFF" />
              <ThemedText style={styles.playCTAText}>Écouter</ThemedText>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Petits composants utilitaires ──
function MetaItem({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.metaItem}>
      <SymbolView name={icon as any} size={12} tintColor={color} />
      <ThemedText style={[styles.metaText, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

// ============ STYLES ============
const styles = createThemedStyles({
  card: {
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5E5',
  },
  cardCompact: {
    marginHorizontal: Spacing.two,
    marginVertical: Spacing.one,
    borderRadius: 14,
  },
  cardFeatured: {
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
    borderRadius: 22,
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  cardContent: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  cardContentFeatured: {
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    maxWidth: 110,
  },
  langText: { fontSize: 11, fontWeight: '500' },
  favoriteButton: { padding: 4 },

  // Titre
  titleBlock: { gap: 2 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  titleFeatured: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  auteur: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '400',
  },

  // Extrait
  parolesExtrait: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  downloadDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  downloadText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Tags
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#0A1F44',
    fontWeight: '600',
    textTransform: 'lowercase',
  },

  // CTA play
  playCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  playCTAText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});