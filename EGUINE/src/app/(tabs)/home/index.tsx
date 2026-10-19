import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useState, useMemo, useCallback, useRef } from 'react';
import { Image, StyleSheet, RefreshControl, Animated, View, ScrollView, useWindowDimensions } from 'react-native';
import { LocalizedPressable as Pressable, LocalizedText as Text } from '@/i18n/localized-components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { ActionColors } from '@/constants/theme';
import { useTranslation } from '@/i18n/use-translation';

// ============ DESIGN TOKENS ============
const TOKENS = {
  paper: '#FFFFFF',
  paperDeep: '#FFFFFF',
  surface: '#FFFFFF',
  ink: '#000000',
  inkSoft: '#4A4A4A',
  inkMuted: '#4A4A4A',
  inkSubtle: '#777777',
  rule: '#7A1F3D',
  gold: '#7A1F3D',
  goldWash: '#7A1F3D',
  teal: '#725A61',
  pink: '#7A1F3D',
  green: '#7A1F3D',
  purple: '#7A1F3D',
  red: '#7A1F3D',
};

const LANG_LABELS: Record<string, string> = {
  fr: 'Français', la: 'Latin', es: 'Espagnol', soussou: 'Soussou', poular: 'Poular', malinke: 'Malinké',
};

const CATEGORIE_COLORS: Record<string, string> = {
  entree: '#7A1F3D', kyrie: '#7A1F3D', gloria: '#7A1F3D',
  psaume: '#7A1F3D', acclamation: '#7A1F3D', offertoire: '#7A1F3D',
  sanctus: '#7A1F3D', agnus_dei: '#7A1F3D', communion: '#725A61',
  action_grace: '#7A1F3D', chant_final: '#7A1F3D',
  louange: '#7A1F3D', adoration: '#7A1F3D', penitence: '#725A61',
  marial: '#7A1F3D', funerailles: '#725A61', autre: '#725A61',
};

const CATEGORIE_LABELS: Record<string, string> = {
  entree: 'Entrée', kyrie: 'Kyrie', gloria: 'Gloria', psaume: 'Psaume',
  acclamation: 'Acclamation', offertoire: 'Offertoire', sanctus: 'Sanctus',
  agnus_dei: 'Agnus Dei', communion: 'Communion', action_grace: 'Action de grâce',
  chant_final: 'Chant final', louange: 'Louange', adoration: 'Adoration',
  penitence: 'Pénitence', marial: 'Marial', funerailles: 'Funérailles',
  autre: 'Autre',
};

function getActivityTitle(path: string): string {
  if (path.startsWith('/chant/')) return 'Explorer les chants';
  if (path.startsWith('/priere/')) return 'Consulter une prière';
  if (path.startsWith('/saint/')) return 'Découvrir un saint';
  if (path.startsWith('/mes-chants/')) return 'Mes chants personnels';
  if (path.startsWith('/search')) return 'Recherche';
  if (path.startsWith('/chants')) return 'Catalogue des chants';
  if (path.startsWith('/messe')) return 'Programme de Messe';
  if (path.startsWith('/prieres')) return 'Mes prières';
  if (path.startsWith('/notifications')) return 'Notifications';
  if (path.startsWith('/agenda')) return 'Agenda';
  if (path.startsWith('/favoris')) return 'Favoris';
  if (path.startsWith('/parametres')) return 'Réglages';
  if (path.startsWith('/profile')) return 'Profil';
  return 'Continuer votre activité';
}

function getActivityIcon(path: string): string {
  if (path.startsWith('/chant') || path.startsWith('/mes-chants')) return 'music-note';
  if (path.startsWith('/messe')) return 'church';
  if (path.startsWith('/priere')) return 'hands-pray';
  if (path.startsWith('/saint')) return 'account-heart';
  if (path.startsWith('/search')) return 'magnify';
  if (path.startsWith('/notifications')) return 'bell-outline';
  if (path.startsWith('/agenda')) return 'calendar-month-outline';
  if (path.startsWith('/favoris')) return 'heart-outline';
  if (path.startsWith('/parametres')) return 'cog-outline';
  if (path.startsWith('/profile')) return 'account-outline';
  return 'history';
}

// ============ ÉCRAN ============
export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const chants = useAppStore((s) => s.chants);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const currentChantId = useAppStore((s) => s.currentChantId);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const playChant = useAppStore((s) => s.playChant);
  const togglePlay = useAppStore((s) => s.togglePlay);
  const playbackProgress = useAppStore((s) => s.playbackProgress);
  const unreadNotifications = useAppStore((s) => s.unreadNotifications || 0);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const celebration = useAppStore((s) =>
    s.celebrations.find((item) => item.id === s.activeCelebrationId) ?? s.celebrations[0]
  );
  const recentActivities = useAppStore((s) => s.recentActivities);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const today = new Date();

  // Chant du jour
  const chantDuJour = useMemo(() => {
    const published = chants.filter((c) => c.publie);
    if (!published.length) return null;
    return published[today.getDate() % published.length];
  }, [chants, today]);

  // Chant en cours
  const currentChant = useMemo(
    () => chants.find((c) => c.id === currentChantId),
    [chants, currentChantId]
  );

  const selectedMesseChantCount = useMemo(
    () => new Set(Object.values(celebration?.selectedChants ?? {}).flatMap((ids) => ids ?? [])).size,
    [celebration]
  );
  const resumableActivities = recentActivities
    .filter((activity) => !(selectedMesseChantCount > 0 && activity.path === '/messe'))
    .slice(0, 4);

  // Top 5 tendances
  const trending = useMemo(
    () => [...chants]
      .filter((c) => c.publie)
      .sort((a, b) => (b.nombre_vues ?? b.vues ?? 0) - (a.nombre_vues ?? a.vues ?? 0))
      .slice(0, 5),
    [chants]
  );

  // Nouveautés
  const nouveautes = useMemo(
    () => [...chants].filter((c) => c.publie).slice(-6).reverse(),
    [chants]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((r) => setTimeout(r, 900));
    setIsRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const go = useCallback((path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(path as any);
  }, [router]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={TOKENS.gold}
            />
          }
        >
          {/* ═══ HEADER ═══ */}
          <View style={styles.header}>
            <View
              accessibilityLabel="Logo de Cantique Guinée"
              style={styles.brandMark}
            >
              <Image source={require('../../../../assets/images/icon.png')} style={styles.brandImage} resizeMode="contain" />
            </View>
            <Text style={styles.brandTitle}>Cantique Guinée</Text>
            <View style={styles.headerRight}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Ouvrir mon historique')}
                onPress={() => go('/historique')}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <MaterialCommunityIcons name="history" size={20} color={theme.textSecondary} />
              </Pressable>
              <Pressable onPress={() => go('/notifications')} hitSlop={8} style={styles.iconBtn}>
                <MaterialCommunityIcons name="bell-outline" size={20} color={theme.textSecondary} />
                {notificationsEnabled && unreadNotifications > 0 && <View style={styles.dot} />}
              </Pressable>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Rechercher un chant')}
            onPress={() => go('/search')}
            style={({ pressed }) => [styles.searchBar, pressed && { opacity: 0.75 }]}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={ActionColors.discovery} />
            <Text style={styles.searchPlaceholder}>{t('Rechercher un chant, une langue…')}</Text>
            <View style={styles.searchActionWrap}>
              <MaterialCommunityIcons name="tune-variant" size={18} color={ActionColors.discovery} />
            </View>
          </Pressable>

          {/* ═══ CHANT DU JOUR ═══ */}
          {chantDuJour && (
            <Pressable
              onPress={() => go(`/chant/${chantDuJour.id}`)}
              style={({ pressed }) => [
                styles.hero,
                pressed && { opacity: 0.98 },
              ]}
            >
              <View style={styles.heroTop}>
                <View style={styles.heroEyebrowWrap}>
                  <View style={styles.heroEyebrowBar} />
                  <Text style={styles.heroEyebrow}>{t('CHANT DU JOUR')}</Text>
                </View>
              </View>
              <View style={styles.heroMain}>
                <LinearGradient
                  colors={['#7A1F3D', '#4F1027']}
                  style={styles.heroArtwork}
                >
                  <MaterialCommunityIcons name="music-note" size={30} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {chantDuJour.titre}
                  </Text>
                  <Text style={styles.heroMeta} numberOfLines={1}>
                    {chantDuJour.auteur || 'Anonyme'} · {chantDuJour.tonalite || '—'} ·{' '}
                    {LANG_LABELS[chantDuJour.langue] || chantDuJour.langue}
                  </Text>
                </View>
              </View>
              <View style={styles.heroActions}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    playChant(chantDuJour.id);
                  }}
                  style={({ pressed }) => [
                    styles.heroPlay,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <MaterialCommunityIcons name="play" size={16} color="#FFFFFF" />
                  <Text style={styles.heroPlayText}>{t('Écouter')}</Text>
                </Pressable>
                <View style={styles.heroCategorie}>
                  <View
                    style={[
                      styles.heroCategorieDot,
                      { backgroundColor: CATEGORIE_COLORS[chantDuJour.categorie] || TOKENS.gold },
                    ]}
                  />
                  <Text style={styles.heroCategorieText}>
                    {t(CATEGORIE_LABELS[chantDuJour.categorie] || chantDuJour.categorie)}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* ═══ EN COURS ═══ */}
          {currentChant && (
            <Pressable
              onPress={() => go(`/chant/${currentChant.id}`)}
              style={({ pressed }) => [
                styles.nowPlaying,
                pressed && { opacity: 0.95 },
              ]}
            >
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  togglePlay();
                }}
                style={styles.nowPlayBtn}
              >
                <MaterialCommunityIcons
                  name={isPlaying ? 'pause' : 'play'}
                  size={18}
                  color="#FFFFFF"
                />
              </Pressable>
              <View style={styles.nowCopy}>
                <Text style={styles.nowEyebrow}>{t('EN COURS')}</Text>
                <Text style={styles.nowTitle} numberOfLines={1}>
                  {currentChant.titre}
                </Text>
              </View>
              <View style={styles.nowProgress}>
                <View style={styles.nowProgressTrack}>
                  <View
                    style={[
                      styles.nowProgressFill,
                      { width: `${playbackProgress * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </Pressable>
          )}

          {(selectedMesseChantCount > 0 || resumableActivities.length > 0) && (
            <Section eyebrow={t('VOTRE ESPACE')} title={t('Reprendre')}>
              <View style={styles.resumeList}>
                {selectedMesseChantCount > 0 && (
                  <ResumeActivityCard
                    icon="church"
                    title={t('Programme de Messe')}
                    detail={t('{{count}} chants ajoutés', { count: selectedMesseChantCount })}
                    onPress={() => go('/messe')}
                  />
                )}
                {resumableActivities.map((activity) => (
                  <ResumeActivityCard
                    key={activity.path}
                    icon={getActivityIcon(activity.path)}
                    title={t(getActivityTitle(activity.path))}
                    detail={t('Accéder à votre dernière activité')}
                    onPress={() => go(activity.path)}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* ═══ TENDANCES ═══ */}
          {trending.length > 0 && (
            <Section
              eyebrow={t('CETTE SEMAINE')}
              title={t('Tendances')}
              action={{ label: t('Voir tout'), onPress: () => go('/chants') }}
            >
              <View style={styles.trendingGrid}>
                {trending.map((chant, index) => (
                  <TrendingRow
                    key={chant.id}
                    index={index + 1}
                    chant={chant}
                    cardWidth={(screenWidth - 54) / 2}
                    isFavorite={favorites.includes(chant.id)}
                    onPress={() => go(`/chant/${chant.id}`)}
                    onPlay={() => playChant(chant.id)}
                    onFavorite={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleFavorite(chant.id);
                    }}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* ═══ NOUVEAUTÉS ═══ */}
          {nouveautes.length > 0 && (
            <Section
              eyebrow={t('FRAÎCHEMENT AJOUTÉS')}
              title={t('Nouveautés')}
              action={{ label: t('Voir tout'), onPress: () => go('/chants') }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.newScroll}
              >
                {nouveautes.map((chant) => (
                  <Pressable
                    key={chant.id}
                    onPress={() => go(`/chant/${chant.id}`)}
                    style={({ pressed }) => [
                      styles.newCard,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        CATEGORIE_COLORS[chant.categorie] || TOKENS.teal,
                        '#725A61',
                      ]}
                      style={styles.newArtwork}
                    >
                      <MaterialCommunityIcons name="music-note" size={24} color="#FFFFFF" />
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>{t('NOUVEAU')}</Text>
                      </View>
                    </LinearGradient>
                    <Text style={styles.newTitle} numberOfLines={2}>
                      {chant.titre}
                    </Text>
                    <Text style={styles.newMeta} numberOfLines={1}>
                      {t(CATEGORIE_LABELS[chant.categorie] || chant.categorie)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}

          {/* Pied */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <MaterialCommunityIcons name="music-clef-treble" size={16} color={theme.textSecondary} />
            <Text style={styles.footerText}>Ad Majorem Dei Gloriam</Text>
            <View style={styles.footerLine} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ============ SOUS-COMPOSANTS ============

function Section({
  eyebrow, title, action, children,
}: {
  eyebrow: string; title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          <View style={styles.sectionEyebrowWrap}>
            <View style={styles.sectionEyebrowBar} />
            <Text style={styles.sectionEyebrow}>{t(eyebrow)}</Text>
          </View>
          <Text style={styles.sectionTitle}>{t(title)}</Text>
        </View>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={styles.sectionAction}>{t(action.label)}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function TrendingRow({
  index, chant, cardWidth, isFavorite, onPress, onPlay, onFavorite,
}: {
  index: number; chant: any; cardWidth: number; isFavorite: boolean;
  onPress: () => void; onPlay: () => void; onFavorite: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const heartScale = useRef(new Animated.Value(1)).current;
  const vues = chant.nombre_vues ?? chant.vues ?? 0;

  return (
    <View style={[styles.trendingCard, { width: cardWidth }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('Ouvrir')} ${chant.titre}`}
        onPress={onPress}
        style={styles.trendingMain}
      >
        <LinearGradient
          colors={index % 2 === 0 ? [TOKENS.red, TOKENS.teal] : [TOKENS.teal, TOKENS.ink]}
          style={styles.trendingArtwork}
        >
          <Text style={styles.trendingIndex}>{String(index).padStart(2, '0')}</Text>
          <MaterialCommunityIcons name="music-note" size={34} color="#FFFFFF" />
          <Text style={styles.trendingArtworkCategory} numberOfLines={1}>
            {t(CATEGORIE_LABELS[chant.categorie] || chant.categorie)}
          </Text>
        </LinearGradient>
        <View style={styles.trendingCopy}>
          <Text style={styles.trendingTitle} numberOfLines={1}>
            {chant.titre}
          </Text>
          <View style={styles.trendingMetaRow}>
            <MaterialCommunityIcons name="eye-outline" size={11} color={theme.textSecondary} />
            <Text style={styles.trendingMeta}>{vues} {t('vues')}</Text>
            <Text style={styles.trendingMetaDot}>·</Text>
            <Text style={styles.trendingMeta} numberOfLines={1}>
              {LANG_LABELS[chant.langue] || chant.langue}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.trendingActions}>
        <Text style={styles.trendingCategory}>{t(CATEGORIE_LABELS[chant.categorie] || chant.categorie)}</Text>
        <View style={styles.trendingButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('Écouter')} ${chant.titre}`}
            onPress={onPlay}
            style={styles.trendingAction}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="play-circle-outline" size={23} color={ActionColors.playback} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? `${t('Retirer')} ${chant.titre} ${t('des favoris')}` : `${t('Ajouter')} ${chant.titre} ${t('aux favoris')}`}
            onPress={() => {
              Animated.sequence([
                Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 60 }),
                Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
              ]).start();
              onFavorite();
            }}
            style={styles.trendingAction}
            hitSlop={6}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <MaterialCommunityIcons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? ActionColors.primary : theme.textSecondary}
              />
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ResumeActivityCard({
  icon, title, detail, onPress,
}: {
  icon: string;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(title)}. ${t(detail)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.resumeCard, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.resumeIcon}>
        <MaterialCommunityIcons name={icon as any} size={21} color={TOKENS.gold} />
      </View>
      <View style={styles.resumeCopy}>
        <Text numberOfLines={1} style={styles.resumeTitle}>{t(title)}</Text>
        <Text numberOfLines={1} style={styles.resumeDetail}>{t(detail)}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
    </Pressable>
  );
}

// ============ STYLES ============
const styles = createThemedStyles({
  root: { flex: 1, backgroundColor: TOKENS.paper },
  safe: { flex: 1, backgroundColor: TOKENS.paper },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 18,
  },
  brandMark: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    overflow: 'hidden',
  },
  brandImage: { width: 42, height: 42 },
  brandTitle: { marginLeft: 10, flex: 1, color: TOKENS.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBar: {
    minHeight: 48,
    marginHorizontal: 18,
    marginTop: 2,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: TOKENS.surface,
    borderWidth: 1,
    borderColor: TOKENS.rule,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchPlaceholder: { flex: 1, color: TOKENS.inkMuted, fontSize: 13 },
  searchActionWrap: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F5F7FA',
  },
  iconBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
  },
  dot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: ActionColors.playback,
    borderWidth: 1.5, borderColor: TOKENS.paper,
  },
  // ═══ HERO CHANT DU JOUR ═══
  hero: {
    marginHorizontal: 14,
    marginTop: 22,
    padding: 20,
    borderRadius: 22,
    backgroundColor: TOKENS.teal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.teal,
    gap: 16,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroEyebrowBar: { width: 18, height: 1.5, backgroundColor: TOKENS.gold },
  heroEyebrow: {
    fontSize: 9.5, fontWeight: '800', letterSpacing: 2, color: TOKENS.gold,
  },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroArtwork: {
    width: 68, height: 68, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: {
    fontFamily: 'serif',
    fontSize: 21, fontWeight: '600',
    color: '#FFFFFF', letterSpacing: -0.4, lineHeight: 26,
  },
  heroMeta: { fontSize: 11, color: '#FFFFFF', fontWeight: '500', opacity: 0.82 },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  heroPlay: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: TOKENS.red,
  },
  heroPlayText: {
    color: '#FFFFFF', fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3,
  },
  heroCategorie: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroCategorieDot: { width: 6, height: 6, borderRadius: 3 },
  heroCategorieText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },

  // ═══ NOW PLAYING ═══
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: TOKENS.ink,
  },
  nowPlayBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  nowCopy: { flex: 1, gap: 1 },
  nowEyebrow: {
    fontSize: 8.5, fontWeight: '800', letterSpacing: 1.5,
    color: TOKENS.gold,
  },
  nowTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  nowProgress: { width: 60 },
  nowProgressTrack: {
    height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  nowProgressFill: { height: 3, borderRadius: 2, backgroundColor: ActionColors.playback },

  resumeList: { gap: 8 },
  resumeCard: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
  },
  resumeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: `${TOKENS.gold}14`,
  },
  resumeCopy: { flex: 1, gap: 3 },
  resumeTitle: { color: TOKENS.ink, fontSize: 13, fontWeight: '700' },
  resumeDetail: { color: TOKENS.inkMuted, fontSize: 11 },

  // ═══ SECTION ═══
  section: { marginTop: 28, paddingHorizontal: 22, gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLeft: { flex: 1, gap: 3 },
  sectionEyebrowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionEyebrowBar: { width: 18, height: 1.5, backgroundColor: TOKENS.gold },
  sectionEyebrow: {
    fontSize: 9.5, fontWeight: '800', letterSpacing: 2, color: TOKENS.gold,
  },
  sectionTitle: {
    fontFamily: 'serif',
    fontSize: 21, fontWeight: '500', color: TOKENS.ink, letterSpacing: -0.4,
  },
  sectionAction: { fontSize: 12, fontWeight: '700', color: TOKENS.gold },

  // ═══ TENDANCES ═══
  trendingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trendingCard: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
  },
  trendingMain: { gap: 9 },
  trendingIndex: {
    position: 'absolute',
    top: 9,
    left: 10,
    zIndex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  trendingArtwork: {
    width: '100%',
    aspectRatio: 1.38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trendingArtworkCategory: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    opacity: 0.88,
  },
  trendingCopy: { flex: 1, gap: 3 },
  trendingTitle: {
    fontSize: 13.5, fontWeight: '700', color: TOKENS.ink, letterSpacing: -0.1,
  },
  trendingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendingMeta: { fontSize: 11, color: TOKENS.inkMuted },
  trendingMetaDot: { fontSize: 11, color: TOKENS.inkSubtle },
  trendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TOKENS.rule,
  },
  trendingCategory: {
    flex: 1,
    color: TOKENS.inkMuted,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  trendingButtons: { flexDirection: 'row', alignItems: 'center' },
  trendingAction: {
    width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },

  // ═══ NOUVEAUTÉS ═══
  newScroll: { gap: 12, paddingRight: 22 },
  newCard: { width: 138, gap: 8 },
  newArtwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  newBadge: {
    position: 'absolute',
    top: 8, left: 8,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  newBadgeText: {
    color: '#FFFFFF', fontSize: 8, fontWeight: '800', letterSpacing: 1,
  },
  newTitle: {
    fontSize: 13, fontWeight: '700', color: TOKENS.ink, lineHeight: 17,
  },
  newMeta: {
    fontSize: 10.5, color: TOKENS.inkMuted, textTransform: 'capitalize',
  },

  // ═══ FOOTER ═══
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 44,
    paddingHorizontal: 22,
  },
  footerLine: {
    flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: TOKENS.rule,
  },
  footerText: {
    fontFamily: 'serif',
    fontSize: 11, fontStyle: 'italic',
    color: TOKENS.inkSubtle, letterSpacing: 0.5,
  },
});