import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  RefreshControl,
  Animated,
  View,
  ScrollView,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useResponsive, wp, hp } from "@/hooks/use-responsive";
import { useFontSize } from '@/hooks/use-font-size';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import {
  getLecture,
  getSaint,
  joursMesse,
  paroisses,
} from '@/data/mockData';
import type { MomentMesse } from '@/types';

// ============ CONSTANTES ============
const LITURGICAL_COLORS = {
  avent: '#4B0082',
  noel: '#C41E3A',
  careme: '#800080',
  paques: '#FFD700',
  pentecote: '#FF0000',
  temps_ordinaire: '#228B22',
};

const VERSSES = [
  '✝️ "Le Seigneur est mon berger, rien ne saurait me manquer."',
  '✝️ "Aimez-vous les uns les autres comme je vous ai aimés."',
  '✝️ "Je suis la lumière du monde."',
  '✝️ "Heureux les cœurs purs, ils verront Dieu."',
  '✝️ "Dieu est amour."',
  '✝️ "Tout est possible à celui qui croit."',
  '✝️ "La paix soit avec vous."',
];

function getVerseOfDay(): string {
  const dayIndex = new Date().getDate() % VERSSES.length;
  return VERSSES[dayIndex];
}

// ============ COMPOSANTS ============

// Hero
const HeroSection = ({
  saint,
  messe,
  liturgicalColor,
  verseOfDay,
  onPress,
}: {
  saint: { nom: string } | undefined;
  messe: { temps_liturgique?: string } | undefined;
  liturgicalColor: string;
  verseOfDay: string;
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [styles.heroContainer, pressed && styles.heroPressed]}
    onPress={onPress}
    
  >
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1545073306-1c0b9ae0e77c?w=800&q=80' }}
      style={styles.heroImage}
      imageStyle={styles.heroImageStyle}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          <View style={[styles.heroSaintBadge, { borderColor: liturgicalColor }]}>
            <SymbolView name="star.fill" size={12} tintColor="#FFD700" />
            <ThemedText style={styles.heroSaintText}>
              {saint?.nom || 'Saint du jour'}
            </ThemedText>
            <View style={[styles.heroColorDot, { backgroundColor: liturgicalColor }]} />
          </View>
          <ThemedText style={styles.heroVerse} numberOfLines={2}>
            {verseOfDay}
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            ✝️ {messe?.temps_liturgique?.replace('_', ' ') || 'Temps ordinaire'}
          </ThemedText>
          <View style={styles.heroCta}>
            <ThemedText style={styles.heroCtaText}>Voir les lectures →</ThemedText>
            <SymbolView name="chevron.right" size={16} tintColor="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  </Pressable>
);

// Aujourd'hui card
const AujourdHuiCard = ({
  icon,
  title,
  subtitle,
  cta,
  onPress,
  color,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  cta: string;
  onPress: () => void;
  color: string;
}) => (
  <Pressable
    style={({ pressed }) => [styles.aujourdHuiCard, pressed && styles.aujourdHuiCardPressed]}
    onPress={onPress}
    
  >
    <View style={[styles.aujourdHuiIcon, { backgroundColor: `${color}15` }]}>
      <SymbolView name={icon as any} size={24} tintColor={color} />
    </View>
    <View style={styles.aujourdHuiContent}>
      <ThemedText style={styles.aujourdHuiTitle} numberOfLines={1}>{title}</ThemedText>
      {subtitle && (
        <ThemedText style={styles.aujourdHuiSubtitle} numberOfLines={1}>{subtitle}</ThemedText>
      )}
    </View>
    <View style={[styles.aujourdHuiCta, { backgroundColor: `${color}15` }]}>
      <ThemedText style={[styles.aujourdHuiCtaText, { color }]}>{cta}</ThemedText>
      <SymbolView name="chevron.right" size={14} tintColor={color} />
    </View>
  </Pressable>
);

// Accès rapide card
const AccessCard = ({
  icon,
  label,
  subtitle,
  onPress,
  color,
}: {
  icon: string;
  label: string;
  subtitle: string;
  onPress: () => void;
  color: string;
}) => (
  <Pressable
    style={({ pressed }) => [styles.accessCard, pressed && styles.accessCardPressed]}
    onPress={onPress}
    
  >
    <View style={[styles.accessIcon, { backgroundColor: `${color}15` }]}>
      <SymbolView name={icon as any} size={28} tintColor={color} />
    </View>
    <ThemedText style={styles.accessLabel}>{label}</ThemedText>
    <ThemedText style={styles.accessSubtitle} numberOfLines={1}>{subtitle}</ThemedText>
  </Pressable>
);

// Chant populaire card
const PopularChantCard = ({
  chant,
  onPress,
}: {
  chant: { id: string; titre: string; langue: string; nombre_vues: number; categorie: string };
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [styles.popularCard, pressed && styles.popularCardPressed]}
    onPress={onPress}
    
  >
    <View style={styles.popularCardIcon}>
      <SymbolView name="music.note" size={24} tintColor="#208AEF" />
    </View>
    <ThemedText style={styles.popularCardTitle} numberOfLines={1}>{chant.titre}</ThemedText>
    <View style={styles.popularCardMeta}>
      <ThemedText style={styles.popularCardLangue}>{chant.langue}</ThemedText>
      <ThemedText style={styles.popularCardDot}>·</ThemedText>
      <ThemedText style={styles.popularCardCategorie}>{chant.categorie}</ThemedText>
    </View>
    <View style={styles.popularCardViews}>
      <SymbolView name="heart.fill" size={10} tintColor="#FF2D55" />
      <ThemedText style={styles.popularCardViewsText}>{chant.nombre_vues || 0}</ThemedText>
    </View>
  </Pressable>
);

// Ma paroisse card
const ParishCard = ({
  paroisse,
  messe,
  onPress,
}: {
  paroisse: { nom: string; diocese: string; ville: string };
  messe: { date: string; temps_liturgique?: string; items: { moment: string }[] } | undefined;
  onPress: () => void;
}) => {
  const totalChants = messe?.items?.length || 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.parishCard, pressed && styles.parishCardPressed]}
      onPress={onPress}
      
    >
      <View style={styles.parishIcon}>
        <SymbolView name="building.columns" size={24} tintColor="#34C759" />
      </View>
      <View style={styles.parishContent}>
        <ThemedText style={styles.parishName}>{paroisse.nom}</ThemedText>
        <ThemedText style={styles.parishLocation}>
          {paroisse.ville} · {paroisse.diocese}
        </ThemedText>
        {messe && (
          <View style={styles.parishMesseInfo}>
            <SymbolView name="clock" size={12} tintColor="#34C759" />
            <ThemedText style={styles.parishMesseText}>
              {totalChants} chants · {messe.temps_liturgique?.replace('_', ' ') || 'Messe'}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.parishCta}>
        <ThemedText style={styles.parishCtaText}>Préparer →</ThemedText>
      </View>
    </Pressable>
  );
};

// ============ COMPOSANT PRINCIPAL ============
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { wp, hp } = useResponsive();
  const { fs: fsScale } = useFontSize();
  const chants = useAppStore((s) => s.chants);
  const prieres = useAppStore((s) => s.prieres);
  const user = useAppStore((s) => s.user);
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const isFavorite = useAppStore((s) => s.isFavorite);
  const unreadNotifications = useAppStore((s) => s.unreadNotifications || 0);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Date locale
  const today = new Date();
  const formattedDate = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Données
  const lecture = getLecture(todayStr);
  const saint = getSaint(todayStr);
  const messe = joursMesse[todayStr];
  const paroisse = messe?.paroisse_id ? paroisses.find((p) => p.id === messe.paroisse_id) : undefined;
  const userParoisse = user?.parish_id ? paroisses.find((p) => p.id === user.parish_id) : undefined;

  // Comptage des moments
  const momentCounts = useMemo(() => {
    const counts: Record<MomentMesse, number> = {
      entree: 0, liturgie_parole: 0, liturgie_eucharistique: 0, communion: 0, envoi: 0,
    };
    messe?.items?.forEach((item) => {
      if (item.moment && counts[item.moment as MomentMesse] !== undefined) {
        counts[item.moment as MomentMesse] += 1;
      }
    });
    return counts;
  }, [messe]);

  const totalMesseChants = useMemo(() => {
    return Object.values(momentCounts).reduce((a, b) => a + b, 0);
  }, [momentCounts]);

  // Chant du jour (déterministe basé sur la date)
  const chantDuJour = useMemo(() => {
    const publishedChants = chants.filter((c) => c.publie);
    if (publishedChants.length === 0) return null;
    const dayIndex = new Date().getDate() % publishedChants.length;
    return publishedChants[dayIndex];
  }, [chants]);

  // Prières
  const morningPrayer = prieres.find((p) => p.publie && p.moment_jour === 'matin');

  // Couleur liturgique du jour
  const liturgicalColor = useMemo(() => {
    if (messe?.temps_liturgique) {
      return LITURGICAL_COLORS[messe.temps_liturgique as keyof typeof LITURGICAL_COLORS] || '#228B22';
    }
    return '#228B22';
  }, [messe]);

  // Verset du jour
  const verseOfDay = getVerseOfDay();

  // Chants populaires
  const popularChants = useMemo(() => {
    return chants
      .filter((c) => c.publie && c.nombre_vues && c.nombre_vues > 5)
      .sort((a, b) => (b.nombre_vues || 0) - (a.nombre_vues || 0))
      .slice(0, 5);
  }, [chants]);

  // Callbacks
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleSearchPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/search');
  }, [router]);

  const handleQuickAction = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (route === '/favoris' && !isLoggedIn) {
      router.push('/connexion');
      return;
    }
    router.push(route);
  }, [router, isLoggedIn]);

  // Animation du header
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  return (
    <ThemedView style={[styles.container, styles.homeScreen]}>
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ===== HEADER ===== */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View style={styles.brandHeader}>
            <View style={styles.brandIdentity}>
              <View style={styles.brandIcon}>
                <MaterialCommunityIcons name="music-note" size={19} color="#D4AF37" />
              </View>
              <View style={styles.brandCopy}>
                <ThemedText style={styles.brandTitle}>Chorale eGuine</ThemedText>
                <ThemedText style={styles.brandSubtitle}>Chants liturgiques de Guinée</ThemedText>
              </View>
            </View>
            <View style={styles.brandActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Rechercher" onPress={handleSearchPress} style={styles.headerAction}>
                <MaterialCommunityIcons name="magnify" size={19} color="#FFFFFF" />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Agenda" onPress={() => router.push('/agenda')} style={styles.headerAction}>
                <MaterialCommunityIcons name="calendar-month-outline" size={19} color="#FFFFFF" />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} style={styles.headerAction}>
                <MaterialCommunityIcons name="bell-outline" size={19} color="#FFFFFF" />
                {unreadNotifications > 0 && <View style={styles.notificationDot} />}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Profil" onPress={() => router.push('/profile')} style={styles.profileAction}>
                {user?.profileImage ? <Image source={{ uri: user.profileImage }} style={styles.avatar} /> : <MaterialCommunityIcons name="account" size={16} color="#FFFFFF" />}
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {chantDuJour && (
          <Pressable onPress={() => router.push(`/chant/${chantDuJour.id}`)} style={styles.featuredCard}>
            <LinearGradient colors={['#006B76', '#0A1F44']} style={styles.featuredGradient}>
              <View style={styles.featuredHeading}>
                <View style={styles.featuredDot} />
                <ThemedText style={styles.featuredEyebrow}>CHANT DU JOUR</ThemedText>
              </View>
              <View style={styles.featuredCopy}>
                <ThemedText numberOfLines={2} style={styles.featuredTitle}>{chantDuJour.titre}</ThemedText>
                <ThemedText numberOfLines={2} style={styles.featuredLyrics}>{chantDuJour.paroles.slice(0, 100)}…</ThemedText>
              </View>
              <View style={styles.featuredFooter}>
                <ThemedText style={styles.featuredMeta}>♫ 3:42 · {chantDuJour.categorie.replace('_', ' ')}</ThemedText>
                <View style={styles.listenButton}>
                  <MaterialCommunityIcons name="play" size={14} color="#FFFFFF" />
                  <ThemedText style={styles.listenLabel}>ÉCOUTER</ThemedText>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.kSectionTitle}>Moments de la messe</ThemedText>
            <Pressable onPress={() => router.push('/messe')}>
              <ThemedText style={styles.kSeeAll}>Voir tout</ThemedText>
            </Pressable>
          </View>
          <View style={styles.massMoments}>
            {[
              { label: 'Entrée', icon: 'music-note', id: 'entree' },
              { label: 'Offertoire', icon: 'gift-outline', id: 'offertoire' },
              { label: 'Communion', icon: 'heart-outline', id: 'communion' },
              { label: 'Envoi', icon: 'star-outline', id: 'chant_final' },
            ].map((moment) => (
              <Pressable
                key={moment.id}
                onPress={() => router.push({ pathname: '/chant/category/[type]/[id]', params: { type: 'moment', id: moment.id } })}
                style={styles.massMoment}
              >
                <MaterialCommunityIcons name={moment.icon as any} size={21} color="#D4AF37" />
                <ThemedText numberOfLines={1} style={styles.massMomentLabel}>{moment.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText style={styles.kSectionTitle}>Pour votre messe</ThemedText>
              <ThemedText style={styles.kSectionSubtitle}>Chants recommandés pour célébrer</ThemedText>
            </View>
            <Pressable onPress={() => router.push('/messe')}>
              <ThemedText style={styles.kSeeAll}>Voir tout</ThemedText>
            </Pressable>
          </View>
          <View style={styles.recommendationList}>
            {popularChants.slice(0, 3).map((chant, index) => (
              <Pressable key={chant.id} onPress={() => router.push(`/chant/${chant.id}`)} style={styles.recommendationRow}>
                <View style={styles.recommendationIcon}>
                  <MaterialCommunityIcons name={index === 1 ? 'cup-water' : 'music-note'} size={19} color={index === 1 ? '#D4AF37' : '#0A1F44'} />
                </View>
                <View style={styles.recommendationCopy}>
                  <ThemedText style={styles.recommendationBadge}>{chant.categorie.replace('_', ' ').toUpperCase()}</ThemedText>
                  <ThemedText numberOfLines={1} style={styles.recommendationTitle}>{chant.titre}</ThemedText>
                  <ThemedText style={styles.recommendationMeta}>{chant.langue.toUpperCase()} · {chant.nombre_vues} écoutes</ThemedText>
                </View>
                <SymbolView name="chevron.right" size={17} tintColor="#94A3B8" />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.kSectionTitle}>Styles & temps liturgiques</ThemedText>
            <Pressable onPress={() => router.push('/chants')}>
              <ThemedText style={styles.kSeeAll}>Voir tout</ThemedText>
            </Pressable>
          </View>
          <View style={styles.styleCollections}>
            {[
              { title: 'Avent & Carême', meta: '12 chants · 45 min', icon: 'weather-sunset-up' },
              { title: 'Polyphonie & Grégorien', meta: '18 chants · 1 h 12', icon: 'moon-waning-crescent' },
            ].map((collection) => (
              <Pressable key={collection.title} onPress={() => router.push('/chants')} style={styles.styleCollection}>
                <View style={styles.styleCollectionIcon}>
                  <MaterialCommunityIcons name={collection.icon as any} size={24} color="#D4AF37" />
                </View>
                <ThemedText numberOfLines={2} style={styles.styleCollectionTitle}>{collection.title}</ThemedText>
                <ThemedText style={styles.styleCollectionMeta}>{collection.meta}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <ThemedView style={styles.bottomPadding} />
      </Animated.ScrollView>
    </ThemedView>
  );
}

// Stats pour accès rapide
const statsChants = 128;

// ============ STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1 },
  homeScreen: { backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1, width: '100%', maxWidth: 800, alignSelf: 'center' },
  brandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#D4AF3726' },
  brandCopy: { flex: 1, gap: 2 },
  brandTitle: { color: '#1C1C1E', fontSize: 18, fontWeight: '700' },
  brandSubtitle: { color: '#94A3B8', fontSize: 11 },
  brandActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerAction: { position: 'relative', width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  profileAction: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 16, backgroundColor: '#0A1F44' },
  featuredCard: { height: 232, marginHorizontal: 12, marginVertical: 8, overflow: 'hidden', borderRadius: 22 },
  featuredGradient: { flex: 1, justifyContent: 'space-between', padding: 16 },
  featuredHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4AF37' },
  featuredEyebrow: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  featuredCopy: { gap: 6 },
  featuredTitle: { color: '#FFFFFF', fontFamily: 'serif', fontSize: 25, fontWeight: '700', fontStyle: 'italic' },
  featuredLyrics: { color: '#FFFFFFE6', fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featuredMeta: { color: '#FFFFFFB3', fontSize: 11 },
  listenButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, borderRadius: 11, backgroundColor: '#D4AF37' },
  listenLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingHorizontal: 8 },
  quickAction: { flex: 1, alignItems: 'center', gap: 7 },
  quickActionIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: '#FFFFFF', elevation: 3 },
  quickActionLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  kSectionTitle: { color: '#1C1C1E', fontFamily: 'serif', fontSize: 20, fontStyle: 'italic', fontWeight: '600' },
  kSectionSubtitle: { marginTop: 2, color: '#94A3B8', fontSize: 11 },
  kSeeAll: { color: '#D4AF37', fontSize: 12, fontWeight: '700' },
  massMoments: { flexDirection: 'row', gap: 7 },
  massMoment: { flex: 1, minWidth: 0, minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 3, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  massMomentLabel: { color: '#1C1C1E', fontSize: 10, fontWeight: '600' },
  recommendationList: { overflow: 'hidden', paddingVertical: 4, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, backgroundColor: '#FFFFFF' },
  recommendationRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  recommendationIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#0A1F4414' },
  recommendationCopy: { flex: 1, gap: 2 },
  recommendationBadge: { color: '#0A1F44', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  recommendationTitle: { color: '#111827', fontSize: 13, fontWeight: '700' },
  recommendationMeta: { color: '#6B7280', fontSize: 10 },
  styleCollections: { flexDirection: 'row', gap: 10 },
  styleCollection: { flex: 1, minHeight: 136, justifyContent: 'flex-end', gap: 5, padding: 12, borderRadius: 14, backgroundColor: '#0A1F44' },
  styleCollectionIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderRadius: 12, backgroundColor: '#D4AF3726' },
  styleCollectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  styleCollectionMeta: { color: '#FFFFFFB3', fontSize: 10 },

  // ===== HEADER =====
  header: { paddingHorizontal: wp(4), paddingTop: wp(6), paddingBottom: wp(2) },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, marginRight: wp(2) },
  greeting: { fontSize: wp(5), fontWeight: '700', color: '#1C1C1E' },
  date: { fontSize: wp(3.5), opacity: 0.4, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  iconButton: { padding: wp(1), borderRadius: wp(2) },
  iconButtonPressed: { opacity: 0.7 },
  notificationDot: { position: 'absolute', top: 4, right: 4, width: wp(1.5), height: wp(1.5), borderRadius: 3, backgroundColor: '#FF3B30' },
  avatarButton: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#208AEF' },
  avatar: { width: wp(8), height: wp(8), borderRadius: 16 },
  avatarPlaceholder: { width: wp(8), height: wp(8), alignItems: 'center', justifyContent: 'center', gap: wp(1) },
  avatarLabel: { fontSize: wp(2), color: '#208AEF', fontWeight: '600' },

  // ===== RECHERCHE =====
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: wp(2), borderRadius: 12, paddingHorizontal: wp(3), paddingVertical: wp(1.5), borderWidth: 1, marginTop: wp(2) },
  searchPlaceholder: { flex: 1, fontSize: wp(3.5) },

  // ===== HERO =====
  heroContainer: { marginHorizontal: wp(4), marginVertical: wp(2), borderRadius: 16, overflow: 'hidden', height: hp(22), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  heroPressed: { opacity: 0.95 },
  heroImage: { width: '100%', height: '100%' },
  heroImageStyle: { borderRadius: 16 },
  heroGradient: { flex: 1, padding: wp(4), justifyContent: 'center' },
  heroContent: { gap: wp(2) },
  heroSaintBadge: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), alignSelf: 'flex-start', paddingHorizontal: wp(2), paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1 },
  heroSaintText: { fontSize: wp(3), color: '#FFFFFF', fontWeight: '500' },
  heroColorDot: { width: wp(2), height: wp(2), borderRadius: 4 },
  heroVerse: { fontSize: wp(4.5), fontWeight: '600', color: '#FFFFFF', lineHeight: 24, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroSubtitle: { fontSize: wp(3), color: 'rgba(255,255,255,0.5)' },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: wp(1), alignSelf: 'flex-start', marginTop: wp(1), paddingHorizontal: wp(2), paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroCtaText: { fontSize: wp(3), color: '#FFFFFF', fontWeight: '600' },

  // ===== SECTIONS =====
  section: { marginTop: wp(4), paddingHorizontal: wp(4) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: wp(2) },
  sectionTitle: { fontSize: wp(4), fontWeight: '700', color: '#1C1C1E' },
  sectionDate: { fontSize: wp(3), opacity: 0.4 },
  seeAll: { fontSize: wp(3), color: '#208AEF', fontWeight: '500', opacity: 0.7 },

  // ===== AUJOURD'HUI GRID =====
  aujourdHuiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2) },
  aujourdHuiCard: { flexDirection: 'row', alignItems: 'center', gap: wp(2), flex: 1, minWidth: '48%', padding: wp(2), borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', marginBottom: wp(2) },
  aujourdHuiCardPressed: { opacity: 0.8 },
  aujourdHuiIcon: { width: wp(10), height: wp(10), borderRadius: wp(5), alignItems: 'center', justifyContent: 'center' },
  aujourdHuiContent: { flex: 1 },
  aujourdHuiTitle: { fontSize: wp(3), fontWeight: '600', color: '#1C1C1E' },
  aujourdHuiSubtitle: { fontSize: wp(2.5), opacity: 0.4, marginTop: 1 },
  aujourdHuiCta: { paddingHorizontal: wp(1.5), paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 2 },
  aujourdHuiCtaText: { fontSize: wp(2.5), fontWeight: '600' },

  // ===== ACCÈS RAPIDE =====
  accessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2) },
  accessCard: { width: '48%', padding: wp(3), borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', gap: wp(1), marginBottom: wp(2) },
  accessCardPressed: { opacity: 0.8 },
  accessIcon: { width: wp(12), height: wp(12), borderRadius: wp(6), alignItems: 'center', justifyContent: 'center' },
  accessLabel: { fontSize: wp(3.5), fontWeight: '700', color: '#1C1C1E' },
  accessSubtitle: { fontSize: wp(2.5), opacity: 0.4 },

  // ===== POPULAIRES =====
  popularScroll: { marginHorizontal: -wp(4) },
  popularContent: { paddingHorizontal: wp(4), gap: wp(2.5) },
  popularCard: { width: wp(52), padding: wp(3), borderRadius: wp(3), backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', gap: wp(1), marginBottom: wp(2) },
  popularCardPressed: { opacity: 0.8 },
  popularCardIcon: { width: wp(10), height: wp(10), borderRadius: wp(5), backgroundColor: 'rgba(32,138,239,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: wp(1) },
  popularCardTitle: { fontSize: wp(3.5), fontWeight: '600', textAlign: 'center', color: '#1C1C1E' },
  popularCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  popularCardLangue: { fontSize: wp(2.5), opacity: 0.4 },
  popularCardDot: { fontSize: wp(2.5), opacity: 0.2 },
  popularCardCategorie: { fontSize: wp(2.5), opacity: 0.4 },
  popularCardViews: { flexDirection: 'row', alignItems: 'center', gap: wp(1), marginTop: wp(1) },
  popularCardViewsText: { fontSize: 9, opacity: 0.3 },

  // ===== MA PAROISSE =====
  parishCard: { flexDirection: 'row', alignItems: 'center', gap: wp(2), padding: wp(3), borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', marginBottom: wp(2) },
  parishCardPressed: { opacity: 0.8 },
  parishIcon: { width: wp(10), height: wp(10), borderRadius: wp(5), backgroundColor: 'rgba(52,199,89,0.08)', alignItems: 'center', justifyContent: 'center' },
  parishContent: { flex: 1 },
  parishName: { fontSize: wp(3.5), fontWeight: '700', color: '#1C1C1E' },
  parishLocation: { fontSize: wp(2.5), opacity: 0.4, marginTop: 1 },
  parishMesseInfo: { flexDirection: 'row', alignItems: 'center', gap: wp(1), marginTop: 2 },
  parishMesseText: { fontSize: wp(2.5), opacity: 0.4 },
  parishCta: { paddingHorizontal: wp(2), paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(52,199,89,0.1)' },
  parishCtaText: { fontSize: wp(2.5), fontWeight: '600', color: '#34C759' },

  // ===== BOTTOM =====
  bottomPadding: { height: wp(4) },
});
