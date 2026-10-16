import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { goBackSafely } from '@/utils/navigation';

const COLORS = { background: '#FFFFFF', card: '#FFFFFF', gold: '#D4AF37', text: '#111827', muted: '#6B7280', border: '#E5E7EB', pink: '#EC4899' };

export default function KotlinChantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chants = useAppStore((state) => state.chants);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const currentChantId = useAppStore((state) => state.currentChantId);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const playbackProgress = useAppStore((state) => state.playbackProgress);
  const playChant = useAppStore((state) => state.playChant);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const setPlaybackProgress = useAppStore((state) => state.setPlaybackProgress);
  const [fontSize, setFontSize] = useState(20);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const scrollRef = useRef<ScrollView>(null);
  const scrollPosition = useRef(0);
  const scrollMax = useRef(0);
  const scrollViewportHeight = useRef(0);
  const progressWidth = useRef(1);

  const chant = useMemo(() => chants.find((item) => item.id === id), [chants, id]);
  const isCurrentPlaying = currentChantId === chant?.id && isPlaying;
  const isFavorite = chant ? favorites.includes(chant.id) : false;

  useEffect(() => {
    if (!autoScroll) return;
    const interval = setInterval(() => {
      const nextPosition = Math.min(scrollPosition.current + 3 * scrollSpeed, scrollMax.current);
      scrollRef.current?.scrollTo({ y: nextPosition, animated: false });
      scrollPosition.current = nextPosition;
      if (nextPosition >= scrollMax.current) setAutoScroll(false);
    }, 50 / scrollSpeed);
    return () => clearInterval(interval);
  }, [autoScroll, scrollSpeed]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollPosition.current = event.nativeEvent.contentOffset.y;
    scrollMax.current = Math.max(0, event.nativeEvent.contentSize.height - event.nativeEvent.layoutMeasurement.height);
  };

  const handleShare = async () => {
    if (!chant) return;
    await Share.share({ message: `${chant.titre}\n\n${chant.paroles}`, title: chant.titre });
  };

  const togglePlayback = () => {
    if (!chant) return;
    if (currentChantId === chant.id) togglePlay();
    else playChant(chant.id);
  };

  const handleProgressPress = (locationX: number, width: number) => {
    if (width > 0) setPlaybackProgress(locationX / width);
  };

  if (!chant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={44} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Chant indisponible</Text>
          <Text style={styles.emptySubtitle}>Ce chant n'est pas disponible pour le moment.</Text>
          <Pressable onPress={goBackSafely} style={styles.backFallback}><Text style={styles.backFallbackLabel}>Retour</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const language = chant.langue === 'fr' ? 'Français' : chant.langue.toLocaleUpperCase();
  const number = chant.id.split('_').at(-1) ?? chant.id;
  const lyricLines = chant.paroles.split('\n');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.topBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>
        <View style={styles.topTitleBlock}>
          <Text numberOfLines={1} style={styles.topTitle}>{chant.titre}</Text>
          <Text style={styles.topSubtitle}>N° {number} · {language}</Text>
        </View>
        <View style={styles.fontActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Réduire la taille du texte" onPress={() => setFontSize((size) => Math.max(14, size - 2))} style={styles.fontButton}>
            <Text style={styles.fontButtonLabel}>A−</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Augmenter la taille du texte" onPress={() => setFontSize((size) => Math.min(32, size + 2))} style={styles.fontButton}>
            <Text style={styles.fontButtonLabel}>A+</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.lyricsScroll}
        contentContainerStyle={styles.lyricsContent}
        onScroll={handleScroll}
        onLayout={(event) => { scrollViewportHeight.current = event.nativeEvent.layout.height; }}
        onContentSizeChange={(_, height) => { scrollMax.current = Math.max(0, height - scrollViewportHeight.current); }}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
      >
        {lyricLines.map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return <View key={`space-${index}`} style={styles.lyricSpace} />;
          const isRefrain = trimmed.toLocaleLowerCase().startsWith('[refrain]') || trimmed.toLocaleLowerCase().startsWith('refrain');
          const isVerse = trimmed.toLocaleLowerCase().startsWith('[couplet') || trimmed.toLocaleLowerCase().startsWith('couplet') || trimmed.toLocaleLowerCase().startsWith('[verse') || trimmed.toLocaleLowerCase().startsWith('verse');
          return (
            <Text
              key={`line-${index}`}
              style={[
                styles.lyricLine,
                { fontSize, lineHeight: fontSize * 1.65 },
                isRefrain && styles.refrainLine,
                isVerse && styles.verseLine,
              ]}
            >
              {trimmed}
            </Text>
          );
        })}
      </ScrollView>

      <View style={styles.bottomPlayer}>
        <View style={styles.playerControls}>
          <Pressable accessibilityRole="button" accessibilityLabel={isCurrentPlaying ? 'Pause' : 'Écouter'} onPress={togglePlayback} style={styles.playCircle}>
            <MaterialCommunityIcons name={isCurrentPlaying ? 'pause' : 'play'} size={22} color={COLORS.background} />
          </Pressable>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel="Progression audio"
            onPress={(event) => handleProgressPress(event.nativeEvent.locationX, progressWidth.current)}
            onLayout={(event) => { progressWidth.current = event.nativeEvent.layout.width; }}
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${playbackProgress * 100}%` }]} />
            <View style={[styles.progressThumb, { left: `${playbackProgress * 100}%` }]} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={autoScroll ? 'Arrêter le défilement automatique' : 'Défilement automatique'} onPress={() => setAutoScroll((value) => !value)} style={styles.autoScrollButton}>
            <MaterialCommunityIcons name={autoScroll ? 'pause' : 'arrow-down'} size={21} color={autoScroll ? COLORS.gold : COLORS.text} />
          </Pressable>
        </View>
        <View style={styles.toolsRow}>
          <Pressable onPress={() => setScrollSpeed((speed) => speed >= 2 ? 0.5 : speed + 0.5)} style={styles.toolButton}>
            <MaterialCommunityIcons name="speedometer" size={16} color={COLORS.gold} />
            <Text style={styles.toolLabel}>Vitesse {scrollSpeed}×</Text>
          </Pressable>
          <Pressable onPress={() => {}} style={styles.toolButton}>
            <MaterialCommunityIcons name="microphone-outline" size={16} color={COLORS.gold} />
            <Text style={styles.toolLabel}>4 Voix</Text>
          </Pressable>
          <Pressable onPress={() => {}} style={styles.toolButton}>
            <MaterialCommunityIcons name="music-clef-treble" size={16} color={COLORS.gold} />
            <Text style={styles.toolLabel}>Partition</Text>
          </Pressable>
          <Pressable onPress={() => {}} style={styles.toolButton}>
            <MaterialCommunityIcons name="music-note" size={16} color={COLORS.gold} />
            <Text style={styles.toolLabel}>Accords</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onPress={() => toggleFavorite(chant.id)} style={styles.favoriteButton}>
            <MaterialCommunityIcons name={isFavorite ? 'heart' : 'heart-outline'} size={19} color={isFavorite ? COLORS.pink : COLORS.text} />
          </Pressable>
        </View>
        {chant.tonalite && <Text style={styles.keyLabel}>Tonalité {chant.tonalite}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Partager les paroles" onPress={handleShare} style={styles.shareButton}>
          <MaterialCommunityIcons name="share-variant-outline" size={15} color={COLORS.muted} />
          <Text style={styles.shareLabel}>Partager les paroles</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  topBack: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitleBlock: { flex: 1, alignItems: 'center', gap: 2 },
  topTitle: { maxWidth: '100%', color: COLORS.text, fontSize: 15, fontWeight: '700' },
  topSubtitle: { color: COLORS.gold, fontSize: 10, fontWeight: '600' },
  fontActions: { flexDirection: 'row', alignItems: 'center' },
  fontButton: { minWidth: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  fontButtonLabel: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  lyricsScroll: { flex: 1 },
  lyricsContent: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 25 },
  lyricLine: { width: '100%', color: COLORS.text, textAlign: 'center', fontWeight: '400' },
  refrainLine: { marginTop: 14, marginBottom: 6, color: COLORS.gold, fontSize: 22, fontWeight: '700' },
  verseLine: { marginTop: 16, marginBottom: 4, color: '#11182799', fontSize: 18, fontWeight: '700' },
  lyricSpace: { height: 16 },
  bottomPlayer: { paddingHorizontal: 13, paddingTop: 7, paddingBottom: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', backgroundColor: COLORS.card },
  playerControls: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9 },
  playCircle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: COLORS.gold },
  progressTrack: { flex: 1, height: 18, justifyContent: 'center', borderRadius: 9 },
  progressFill: { position: 'absolute', left: 0, height: 3, borderRadius: 2, backgroundColor: COLORS.gold },
  progressThumb: { position: 'absolute', width: 8, height: 8, marginLeft: -4, borderRadius: 4, backgroundColor: COLORS.gold },
  autoScrollButton: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  toolsRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  toolButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  toolLabel: { color: COLORS.text, fontSize: 10, fontWeight: '600' },
  favoriteButton: { width: 30, height: 38, alignItems: 'center', justifyContent: 'center' },
  keyLabel: { alignSelf: 'center', marginBottom: 3, color: COLORS.muted, fontSize: 10 },
  shareButton: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  shareLabel: { color: COLORS.muted, fontSize: 10 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 24 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  backFallback: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: COLORS.card },
  backFallbackLabel: { color: COLORS.gold, fontSize: 13, fontWeight: '700' },
});
