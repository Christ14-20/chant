import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, Pressable, ScrollView, Share, StyleSheet, Text, View,
  Animated, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/store/useAppStore';
import { goBackSafely } from '@/utils/navigation';
import { useFontSize } from '@/hooks/use-font-size';
import { wp } from '@/hooks/use-responsive';
import { recordChantView } from '@/database/chant-database';
import { ActionColors } from '@/constants/theme';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

// ============ DESIGN TOKENS ============
const TOKENS = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  ink: '#0A1F44',
  inkMuted: '#0A1F44',
  inkSubtle: '#0A1F44',
  gold: '#7A1F3D',
  goldSoft: '#7A1F3D',
  teal: '#0A1F44',
  border: '#FFFFFF',
  pink: '#7A1F3D',
};

const LANG_LABELS: Record<string, string> = {
  fr: 'Français', la: 'Latin', es: 'Espagnol', soussou: 'Soussou', poular: 'Poular', malinke: 'Malinké',
};

function formatAudioTime(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(whole / 60).toString().padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}

// ============ ÉCRAN ============
export default function KotlinChantDetailScreen() {
  useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const chants = useAppStore((state) => state.chants);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const currentChantId = useAppStore((state) => state.currentChantId);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const playChant = useAppStore((state) => state.playChant);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const setPlaybackProgress = useAppStore((state) => state.setPlaybackProgress);
  const fontSizeSetting = useAppStore((state) => state.fontSize);
  const setFontSizeSetting = useAppStore((state) => state.setFontSize);

  const [resourcesMenuVisible, setResourcesMenuVisible] = useState(false);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const player = useAudioPlayer(null, { updateInterval: 300 });
  const audioStatus = useAudioPlayerStatus(player);
  const { fs } = useFontSize();
  const fontSize = fs(20);

  const scrollRef = useRef<ScrollView>(null);
  const recordedViewId = useRef<string | null>(null);
  const progressWidth = useRef(1);

  const heartScale = useRef(new Animated.Value(1)).current;

  const chant = useMemo(() => chants.find((item) => item.id === id), [chants, id]);
  const audioTracks = useMemo(() => {
    if (!chant) return [];
    const resources = (chant.ressources ?? [])
      .filter((resource) => resource.type === 'audio')
      .map((resource) => ({ id: resource.id, label: resource.nom, uri: resource.uri }));
    if (resources.length || !chant.audio_url) return resources;
    return [{ id: 'audio-main', label: 'Audio principal', uri: chant.audio_url }];
  }, [chant]);
  const selectedAudio = audioTracks.find((track) => track.id === selectedAudioId) ?? audioTracks[0];
  const isCurrentPlaying = activeAudioId !== null && audioStatus.playing;
  const isFavorite = chant ? favorites.includes(chant.id) : false;

  useEffect(() => {
    const progress = audioStatus.duration > 0 ? audioStatus.currentTime / audioStatus.duration : 0;
    setPlaybackProgress(progress);
  }, [audioStatus.currentTime, audioStatus.duration, setPlaybackProgress]);

  useEffect(() => {
    if (!chant || recordedViewId.current === chant.id) return;
    recordedViewId.current = chant.id;
    void recordChantView(chant.id).catch((error: unknown) => {
      console.error(`Impossible d’enregistrer la consultation du chant ${chant.id}.`, error);
    });
  }, [chant]);

  const handleShare = async () => {
    if (!chant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `${chant.titre}\n\n${chant.paroles}`,
      title: chant.titre,
    });
  };

  const togglePlayback = async () => {
    if (!chant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!selectedAudio) {
      router.push(`/chant/${chant.id}/gestion`);
      return;
    }
    if (activeAudioId === selectedAudio.id && audioStatus.playing) {
      player.pause();
      if (currentChantId === chant.id && isPlaying) togglePlay();
      return;
    }
    try {
      if (selectedAudio.uri.startsWith('file://') || selectedAudio.uri.startsWith('/')) {
        const info = await FileSystem.getInfoAsync(selectedAudio.uri);
        if (!info.exists) throw new Error('Le fichier audio est absent du stockage local.');
      }
      if (activeAudioId !== selectedAudio.id) {
        player.replace(selectedAudio.uri);
        setActiveAudioId(selectedAudio.id);
      }
      player.play();
      if (currentChantId !== chant.id) playChant(chant.id);
      else if (!isPlaying) togglePlay();
    } catch (error) {
      Alert.alert('Lecture impossible', error instanceof Error ? error.message : 'Impossible de lire cette piste audio.');
    }
  };

  const handleFavorite = () => {
    if (!chant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, speed: 60 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    toggleFavorite(chant.id);
  };

  const handleProgressPress = (locationX: number, width: number) => {
    if (width <= 0 || !audioStatus.duration) return;
    void player.seekTo(Math.max(0, Math.min(audioStatus.duration, (locationX / width) * audioStatus.duration)));
  };

  // ── Empty state ──
  if (!chant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="alert-circle-outline" size={38} color={TOKENS.inkSubtle} />
          </View>
          <Text style={styles.emptyTitle}>Chant indisponible</Text>
          <Text style={styles.emptySubtitle}>
            Ce chant n'est pas disponible pour le moment.
          </Text>
          <Pressable onPress={goBackSafely} style={styles.backFallback}>
            <Text style={styles.backFallbackLabel}>Retour au catalogue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const languageLabel = LANG_LABELS[chant.langue] || chant.langue.toUpperCase();
  const number = chant.id.split('_').at(-1) ?? chant.id;
  const lyricLines = chant.paroles.split('\n');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ═══ TOP BAR ═══ */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={goBackSafely}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={TOKENS.ink} />
        </Pressable>

        <View style={styles.topTitleBlock}>
          <Text numberOfLines={1} style={styles.topTitle}>{chant.titre}</Text>
          <View style={styles.topMetaRow}>
            <Text style={styles.topMeta}>N° {number}</Text>
            <View style={styles.topMetaDot} />
            <Text style={styles.topMeta}>{languageLabel}</Text>
            {chant.tonalite && (
              <>
                <View style={styles.topMetaDot} />
                <Text style={styles.topMeta}>{chant.tonalite}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.fontActions}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setFontSizeSetting(fontSizeSetting === 'xlarge' ? 'large' : fontSizeSetting === 'large' ? 'medium' : 'small');
            }}
            style={({ pressed }) => [styles.fontBtn, pressed && { opacity: 0.6 }]}
            hitSlop={4}
          >
            <Text style={styles.fontBtnLabelSmall}>A</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setFontSizeSetting(fontSizeSetting === 'small' ? 'medium' : fontSizeSetting === 'medium' ? 'large' : 'xlarge');
            }}
            style={({ pressed }) => [styles.fontBtn, pressed && { opacity: 0.6 }]}
            hitSlop={4}
          >
            <Text style={styles.fontBtnLabelLarge}>A</Text>
          </Pressable>
        </View>
      </View>

      {/* ═══ PAROLES ═══ */}
      <ScrollView
        ref={scrollRef}
        style={styles.lyricsScroll}
        contentContainerStyle={styles.lyricsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.lyricsInner}>
          {lyricLines.map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return <View key={`space-${index}`} style={styles.lyricSpace} />;

            const lower = trimmed.toLocaleLowerCase();
            const isRefrain =
              lower.startsWith('[refrain]') || lower.startsWith('refrain') ||
              lower.startsWith('[refrain]') || lower.startsWith('refrain');
            const isVerse =
              lower.startsWith('[couplet') || lower.startsWith('couplet') ||
              lower.startsWith('[verse') || lower.startsWith('verse');

            if (isRefrain) {
              return (
                <View key={`line-${index}`} style={styles.refrainWrap}>
                  <View style={styles.refrainBadge}>
                    <MaterialCommunityIcons name="repeat" size={12} color={TOKENS.gold} />
                    <Text style={styles.refrainBadgeText}>REFRAIN</Text>
                  </View>
                  <Text style={[styles.refrainText, { fontSize: fontSize + 2, lineHeight: (fontSize + 2) * 1.55 }]}>
                    {trimmed.replace(/^\[?refrain\]?\s*:?/i, '').trim()}
                  </Text>
                </View>
              );
            }

            if (isVerse) {
              return (
                <View key={`line-${index}`} style={styles.verseWrap}>
                  <View style={styles.verseBar} />
                  <Text style={[styles.verseText, { fontSize: fontSize - 2, lineHeight: (fontSize - 2) * 1.55 }]}>
                    {trimmed.replace(/^\[?couplet\s*\d*\]?\s*:?/i, '').replace(/^\[?verse\s*\d*\]?\s*:?/i, '').trim()}
                  </Text>
                </View>
              );
            }

            return (
              <Text
                key={`line-${index}`}
                style={[styles.lyricLine, { fontSize, lineHeight: fontSize * 1.65 }]}
              >
                {trimmed}
              </Text>
            );
          })}

          {/* Fin de chant décorative */}
          <View style={styles.endMark}>
            <View style={styles.endLine} />
            <MaterialCommunityIcons name="music-clef-treble" size={16} color={TOKENS.inkSubtle} />
            <View style={styles.endLine} />
          </View>
        </View>
      </ScrollView>

      {/* ═══ PLAYER BAS ═══ */}
      <View style={styles.bottomPlayer}>
        {/* Progress bar + temps */}
        {audioTracks.length > 0 ? (
          <>
            {audioTracks.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.audioTrackChoices}>
                {audioTracks.map((track) => (
                  <Pressable key={track.id} onPress={() => setSelectedAudioId(track.id)} style={[styles.audioTrackChoice, (selectedAudio?.id ?? audioTracks[0]?.id) === track.id && styles.audioTrackChoiceActive]}>
                    <Text numberOfLines={1} style={[styles.audioTrackLabel, (selectedAudio?.id ?? audioTracks[0]?.id) === track.id && styles.audioTrackLabelActive]}>{track.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <View style={styles.progressRow}>
              <Pressable
                onPress={(e) => handleProgressPress(e.nativeEvent.locationX, progressWidth.current)}
                onLayout={(e) => { progressWidth.current = e.nativeEvent.layout.width; }}
                style={styles.progressTrack}
                hitSlop={{ top: 10, bottom: 10 }}
              >
                <View style={[styles.progressFill, { width: `${audioStatus.duration ? (audioStatus.currentTime / audioStatus.duration) * 100 : 0}%` }]} />
                <View style={[styles.progressThumb, { left: `${audioStatus.duration ? (audioStatus.currentTime / audioStatus.duration) * 100 : 0}%` }]} />
              </Pressable>
              <Text style={styles.audioTime}>{formatAudioTime(audioStatus.currentTime)} / {formatAudioTime(audioStatus.duration)}</Text>
            </View>
          </>
        ) : null}

        {/* Contrôles principaux */}
        <View style={styles.playerControls}>
          <Pressable
            onPress={togglePlayback}
            style={({ pressed }) => [
              styles.playCircle,
              pressed && { transform: [{ scale: 0.94 }] },
            ]}
          >
            <MaterialCommunityIcons
              name={audioTracks.length === 0 ? 'plus' : isCurrentPlaying ? 'pause' : 'play'}
              size={26}
              color="#FFFFFF"
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ouvrir les ressources de ce chant"
            onPress={() => setResourcesMenuVisible(true)}
            style={({ pressed }) => [styles.resourcesButton, pressed && { opacity: 0.72 }]}
          >
            <MaterialCommunityIcons name="view-grid-outline" size={19} color={TOKENS.gold} />
            <Text style={styles.resourcesButtonLabel}>{audioTracks.length ? selectedAudio?.label ?? 'Audio' : 'Ajouter un audio'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={TOKENS.inkMuted} />
          </Pressable>
        </View>

        {/* Actions secondaires */}
        <View style={styles.secondaryRow}>
          <Pressable onPress={handleShare} style={styles.secondaryBtn}>
            <MaterialCommunityIcons name="share-variant-outline" size={15} color={TOKENS.inkMuted} />
            <Text style={styles.secondaryLabel}>Partager</Text>
          </Pressable>

          <View style={styles.secondaryDivider} />

          <Pressable onPress={handleFavorite} style={styles.secondaryBtn}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <MaterialCommunityIcons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={16}
                color={isFavorite ? ActionColors.primary : TOKENS.inkMuted}
              />
            </Animated.View>
            <Text style={[styles.secondaryLabel, isFavorite && { color: ActionColors.primary, fontWeight: '700' }]}>
              {isFavorite ? 'Favori' : 'Ajouter'}
            </Text>
          </Pressable>

          <View style={styles.secondaryDivider} />

          <Pressable onPress={() => router.push(`/chant/${chant.id}/gestion`)} style={styles.secondaryBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={15} color={TOKENS.inkMuted} />
            <Text style={styles.secondaryLabel}>Gérer</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={resourcesMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResourcesMenuVisible(false)}
      >
        <View style={styles.resourceMenuRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer le menu des ressources"
            onPress={() => setResourcesMenuVisible(false)}
            style={styles.resourceMenuScrim}
          />
          <View style={styles.resourceMenuSheet}>
            <View style={styles.resourceMenuHandle} />
            <View style={styles.resourceMenuHeading}>
              <View>
                <Text style={styles.resourceMenuEyebrow}>POUR CE CHANT</Text>
                <Text style={styles.resourceMenuTitle}>Choisir une ressource</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={() => setResourcesMenuVisible(false)}
                style={styles.resourceMenuClose}
              >
                <MaterialCommunityIcons name="close" size={20} color={TOKENS.ink} />
              </Pressable>
            </View>
            {([
              { key: 'paroles', label: 'Paroles', detail: 'Lire et suivre le texte', icon: 'text-box-outline', color: ActionColors.discovery },
              { key: 'partition', label: 'Partition', detail: 'Partitions et documents musicaux', icon: 'music-clef-treble', color: ActionColors.primary },
              { key: 'voix', label: 'Voix', detail: 'Soprano, alto, ténor et basse', icon: 'microphone-outline', color: ActionColors.playback },
              { key: 'accords', label: 'Accords', detail: 'Grille et accompagnement', icon: 'music-note', color: ActionColors.success },
            ] as const).map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                onPress={() => {
                  Haptics.selectionAsync();
                  setResourcesMenuVisible(false);
                  if (item.key !== 'paroles') router.push(`/chant/${chant.id}/${item.key}`);
                  else scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
                style={({ pressed }) => [styles.resourceMenuItem, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.resourceMenuIcon, { backgroundColor: `${item.color}16` }]}>
                  <MaterialCommunityIcons name={item.icon} size={21} color={item.color} />
                </View>
                <View style={styles.resourceMenuCopy}>
                  <Text style={styles.resourceMenuItemTitle}>{item.label}</Text>
                  <Text style={styles.resourceMenuItemDetail}>{item.detail}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={TOKENS.inkMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============ STYLES ============
const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: TOKENS.bg },

  // Top bar
  topBar: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 4,
    backgroundColor: TOKENS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TOKENS.border,
  },
  iconBtn: {
    width: 40, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitleBlock: { flex: 1, flexShrink: 1, minWidth: 0, alignItems: 'center', gap: 3 },
  topTitle: {
    color: TOKENS.ink, fontSize: 15, fontWeight: '700',
    letterSpacing: -0.2, maxWidth: '100%',
  },
  topMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  topMeta: {
    color: TOKENS.inkMuted, fontSize: 10,
    fontWeight: '600', letterSpacing: 0.2,
  },
  topMetaDot: {
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: TOKENS.inkSubtle,
  },
  fontActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  fontBtn: {
    width: 36, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  fontBtnLabelSmall: { color: TOKENS.ink, fontSize: 12, fontWeight: '700' },
  fontBtnLabelLarge: { color: TOKENS.ink, fontSize: 18, fontWeight: '700' },

  // Lyrics
  lyricsScroll: { flex: 1 },
  lyricsContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  lyricsInner: { width: '100%', maxWidth: 640, alignItems: 'center' },

  lyricLine: {
    width: '100%',
    color: TOKENS.ink,
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.1,
    marginVertical: 2,
  },
  lyricSpace: { height: 14 },

  // Refrain — bloc mis en valeur
  refrainWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
    gap: 8,
  },
  refrainBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: TOKENS.goldSoft,
  },
  refrainBadgeText: {
    color: TOKENS.gold, fontSize: 9,
    fontWeight: '800', letterSpacing: 1.2,
  },
  refrainText: {
    width: '100%',
    color: TOKENS.ink,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Couplet — barre latérale
  verseWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 6,
  },
  verseBar: {
    width: 3, height: 16, borderRadius: 2,
    backgroundColor: TOKENS.gold,
  },
  verseText: {
    flex: 1,
    color: TOKENS.inkMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Fin de chant
  endMark: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 40, marginBottom: 8,
    opacity: 0.5,
  },
  endLine: {
    width: 40, height: StyleSheet.hairlineWidth,
    backgroundColor: TOKENS.inkSubtle,
  },

  // Bottom player
  bottomPlayer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 14,
    backgroundColor: TOKENS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TOKENS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },

  // Progress
  progressRow: {
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  audioTime: { color: TOKENS.inkMuted, fontSize: 10, textAlign: 'right' },
  audioTrackChoices: { flexDirection: 'row', gap: 6, paddingBottom: 8 },
  audioTrackChoice: { maxWidth: 160, minHeight: 30, justifyContent: 'center', paddingHorizontal: 9, borderWidth: 1, borderColor: TOKENS.border, borderRadius: 8, backgroundColor: TOKENS.bg },
  audioTrackChoiceActive: { borderColor: TOKENS.gold, backgroundColor: `${TOKENS.gold}12` },
  audioTrackLabel: { color: TOKENS.inkMuted, fontSize: 10, fontWeight: '600' },
  audioTrackLabelActive: { color: TOKENS.gold, fontWeight: '700' },
  progressTrack: {
    height: 20,
    justifyContent: 'center',
    borderRadius: 10,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: TOKENS.gold,
  },
  progressThumb: {
    position: 'absolute',
    width: 10, height: 10,
    marginLeft: -5,
    borderRadius: 5,
    backgroundColor: TOKENS.gold,
    shadowColor: TOKENS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },

  // Contrôles
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playCircle: {
    width: 50, height: 50,
    borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: ActionColors.playback,
    shadowColor: ActionColors.playback,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  resourcesButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: TOKENS.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.border,
  },
  resourcesButtonLabel: {
    color: TOKENS.ink, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.1,
  },
  resourceMenuRoot: { flex: 1, justifyContent: 'flex-end' },
  resourceMenuScrim: { ...StyleSheet.absoluteFill, backgroundColor: '#00000066' },
  resourceMenuSheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: TOKENS.surface,
  },
  resourceMenuHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginBottom: 18,
    borderRadius: 2,
    backgroundColor: TOKENS.inkSubtle,
  },
  resourceMenuHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resourceMenuEyebrow: {
    color: ActionColors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resourceMenuTitle: { marginTop: 4, color: TOKENS.ink, fontSize: 19, fontWeight: '800' },
  resourceMenuClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: TOKENS.bg,
  },
  resourceMenuItem: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TOKENS.border,
  },
  resourceMenuIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: ActionColors.primarySoft,
  },
  resourceMenuCopy: { flex: 1, gap: 3 },
  resourceMenuItemTitle: { color: TOKENS.ink, fontSize: 13, fontWeight: '700' },
  resourceMenuItemDetail: { color: TOKENS.inkMuted, fontSize: 11 },

  // Actions secondaires
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  secondaryLabel: {
    color: TOKENS.inkMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  secondaryDivider: {
    width: 1, height: 12,
    backgroundColor: TOKENS.border,
  },

  // Empty
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: 24,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.border,
  },
  emptyTitle: { color: TOKENS.ink, fontSize: 17, fontWeight: '800' },
  emptySubtitle: {
    color: TOKENS.inkMuted, fontSize: 13,
    textAlign: 'center', maxWidth: 280,
  },
  backFallback: {
    marginTop: 12,
    paddingHorizontal: 20, paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: TOKENS.ink,
  },
  backFallbackLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});