import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '@/store/useAppStore';
import { getChantById } from '@/database/chant-database';
import { goBackSafely } from '@/utils/navigation';
import type { Chant, RessourceChant } from '@/types';
import { ActionColors } from '@/constants/theme';

type ResourceKind = 'partition' | 'voix' | 'accords';
type ResourceLink = { id: string; label: string; uri: string };
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const RESOURCE_INFO: Record<ResourceKind, { title: string; icon: IconName; description: string }> = {
  partition: {
    title: 'Partition',
    icon: 'music-clef-treble',
    description: 'Partitions et documents musicaux associés à ce chant.',
  },
  voix: {
    title: 'Voix',
    icon: 'microphone-outline',
    description: 'Choisissez une voix pour consulter sa partie lorsqu’elle est disponible.',
  },
  accords: {
    title: 'Accords',
    icon: 'music-note',
    description: 'Grille d’accords et indications d’accompagnement.',
  },
};

const VOICE_PARTS = [
  { id: 'soprano', label: 'Soprano' },
  { id: 'alto', label: 'Alto' },
  { id: 'tenor', label: 'Ténor' },
  { id: 'basse', label: 'Basse' },
] as const;

const COLORS = {
  background: '#FFFFFF',
  ink: '#0A1F44',
  muted: '#607087',
  accent: ActionColors.primary,
  border: '#E7EAF0',
  soft: '#F8F6F7',
  separator: '#E7EAF0',
};

function isVoiceResource(resource: RessourceChant): boolean {
  return resource.type === 'audio'
    && (resource.role_audio === 'voix'
      || Boolean(resource.partie_vocale)
      || /\b(soprano|alto|tenor|ténor|basse|voix|choeur|chœur)\b/i.test(`${resource.nom} ${resource.uri}`));
}

function isAvailable(resource: RessourceChant): boolean {
  return resource.availability !== 'missing' && resource.availability !== 'failed';
}

async function openResource(uri: string): Promise<void> {
  try {
    await Linking.openURL(uri);
  } catch (error) {
    console.error(`Impossible d’ouvrir la ressource ${uri}.`, error);
    Alert.alert('Ouverture impossible', 'Cette ressource ne peut pas être ouverte sur cet appareil.');
  }
}

export default function ChantResourceScreen() {
  const router = useRouter();
  const { id, resource: resourceParam } = useLocalSearchParams<{ id: string; resource: string }>();
  const kind: ResourceKind = resourceParam === 'voix' || resourceParam === 'accords'
    ? resourceParam
    : 'partition';
  const info = RESOURCE_INFO[kind];
  const storeChant = useAppStore((state) => state.chants.find((chant) => chant.id === id));
  const [databaseChant, setDatabaseChant] = useState<Chant>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const player = useAudioPlayer(null, { updateInterval: 400 });
  const playback = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    void getChantById(id)
      .then((result) => {
        if (active) setDatabaseChant(result);
      })
      .catch((error: unknown) => {
        console.error(`Impossible de charger les ressources du chant ${id}.`, error);
        if (active) setLoadError('Les ressources de ce chant ne peuvent pas être chargées pour le moment.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  const chant = databaseChant ?? storeChant;
  const partitions = useMemo<ResourceLink[]>(() => {
    if (!chant) return [];
    const direct = chant.partition_url
      ? [{ id: 'partition-main', label: 'Partition principale', uri: chant.partition_url }]
      : [];
    const variants = chant.variantes.flatMap((variant) =>
      variant.partition_url
        ? [{ id: `variant-${variant.id}`, label: variant.nom_variante, uri: variant.partition_url }]
        : []
    );
    const media = (chant.ressources ?? [])
      .filter((resource) => (resource.type === 'pdf' || resource.type === 'image') && isAvailable(resource))
      .map((resource) => ({ id: resource.id, label: resource.nom, uri: resource.uri }));
    return [...direct, ...variants, ...media];
  }, [chant]);

  const voiceResources = useMemo<ResourceLink[]>(() => {
    if (!chant) return [];
    const resources = (chant.ressources ?? [])
      .filter(isVoiceResource)
      .filter(isAvailable)
      .map((resource) => ({ id: resource.id, label: resource.partie_vocale ? `${resource.partie_vocale} · ${resource.nom}` : resource.nom, uri: resource.uri }));
    const variants = chant.variantes.flatMap((variant) =>
      variant.audio_url && /\b(soprano|alto|tenor|ténor|basse)\b/i.test(variant.nom_variante)
        ? [{ id: `variant-${variant.id}`, label: variant.nom_variante, uri: variant.audio_url }]
        : []
    );
    return [...resources, ...variants];
  }, [chant]);

  const playVoice = async (resource: ResourceLink) => {
    if (playingVoiceId === resource.id && playback.playing) {
      player.pause();
      return;
    }
    try {
      if (resource.uri.startsWith('file://') || resource.uri.startsWith('/')) {
        const file = await FileSystem.getInfoAsync(resource.uri);
        if (!file.exists) throw new Error('Cette piste est absente du stockage local.');
      }
      if (playingVoiceId !== resource.id) {
        player.replace(resource.uri);
        setPlayingVoiceId(resource.id);
      }
      player.play();
    } catch (error) {
      Alert.alert('Lecture impossible', error instanceof Error ? error.message : 'Cette piste ne peut pas être lue.');
    }
  };

  const openPdf = async (uri: string) => {
    try {
      if (!await Sharing.isAvailableAsync()) throw new Error('Aucune application de lecture ou de partage PDF n’est disponible.');
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Ouvrir ou partager la partition', UTI: 'com.adobe.pdf' });
    } catch (error) {
      Alert.alert('Ouverture impossible', error instanceof Error ? error.message : 'Cette partition PDF ne peut pas être ouverte.');
    }
  };

  const manageResources = () => router.push(`/chant/${id}/gestion`);

  const pageNotFound = !loading && !chant && !loadError;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour au chant"
          onPress={goBackSafely}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="chevron-left" size={27} color={COLORS.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.songTitle}>{chant?.titre ?? 'Ressource du chant'}</Text>
          <Text style={styles.headerSubtitle}>{info.title}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialCommunityIcons name={info.icon} size={25} color={COLORS.accent} />
          </View>
          <Text style={styles.title}>{info.title}</Text>
          <Text style={styles.description}>{info.description}</Text>
        </View>

        {loading && !chant ? (
          <View style={styles.messageState}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.messageText}>Chargement des ressources…</Text>
          </View>
        ) : loadError ? (
          <View accessibilityRole="alert" style={styles.messageState}>
            <MaterialCommunityIcons name="alert-circle-outline" size={25} color={COLORS.accent} />
            <Text style={styles.messageText}>{loadError}</Text>
          </View>
        ) : pageNotFound ? (
          <View style={styles.messageState}>
            <Text style={styles.messageText}>Ce chant n’est pas disponible.</Text>
          </View>
        ) : kind === 'partition' ? (
          partitions.length > 0 ? (
            <View style={styles.resourceList}>
              <Text style={styles.sectionLabel}>DOCUMENTS DISPONIBLES</Text>
              {partitions.map((item) => {
                const isImage = /\.(png|jpe?g|webp|gif)(?:[?#].*)?$/i.test(item.uri);
                return (
                  <View key={item.id} style={styles.resourceCard}>
                    <View style={styles.resourceRow}>
                      <MaterialCommunityIcons
                        name={isImage ? 'image-outline' : 'file-pdf-box'}
                        size={22}
                        color={COLORS.accent}
                      />
                      <Text numberOfLines={2} style={styles.resourceName}>{item.label}</Text>
                      {!isImage && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void openResource(item.uri)}
                          style={styles.openButton}
                        >
                          <Text style={styles.openButtonLabel}>Ouvrir</Text>
                        </Pressable>
                      )}
                    </View>
                    {isImage && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Ouvrir ${item.label}`}
                        onPress={() => void openResource(item.uri)}
                      >
                        <Image source={{ uri: item.uri }} resizeMode="contain" style={styles.partitionImage} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyResource
              icon="music-clef-treble"
              title="Aucune partition pour le moment"
              detail="Cette page est prête pour afficher les partitions ajoutées à ce chant."
            />
          )
        ) : kind === 'voix' ? (
          <View style={styles.resourceList}>
            <Text style={styles.sectionLabel}>PARTIES VOCALES</Text>
            {VOICE_PARTS.map((voice) => {
              const matching = voiceResources.filter((resource) =>
                `${resource.label} ${resource.uri}`.toLocaleLowerCase().includes(voice.id)
                || (voice.id === 'tenor' && /ténor/i.test(`${resource.label} ${resource.uri}`))
              );
              return (
                <View key={voice.id} style={styles.voiceCard}>
                  <View style={styles.voiceCopy}>
                    <Text style={styles.resourceName}>{voice.label}</Text>
                    <Text style={styles.voiceDetail}>
                      {matching.length
                        ? `${matching.length} fichier${matching.length === 1 ? '' : 's'} disponible${matching.length === 1 ? '' : 's'}`
                        : 'Partie vocale à venir'}
                    </Text>
                  </View>
                  {matching.map((resource) => (
                    <Pressable
                      key={resource.id}
                      accessibilityRole="button"
                      onPress={() => void openResource(resource.uri)}
                      style={styles.openButton}
                    >
                      <MaterialCommunityIcons name="play" size={16} color={ActionColors.playback} />
                      <Text style={styles.openButtonLabel}>{resource.label}</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyResource
            icon="music-note"
            title="Les accords arrivent bientôt"
            detail="La page d’accords est créée pour ce chant; sa grille pourra être ajoutée ici."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyResource({ icon, title, detail }: { icon: IconName; title: string; detail: string }) {
  return (
    <View style={styles.messageState}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name={icon} size={25} color={COLORS.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.messageText}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backButton: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  songTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  headerSubtitle: { color: COLORS.muted, fontSize: 11 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 18, padding: 18, paddingBottom: 36 },
  introCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 18,
    backgroundColor: COLORS.soft,
    gap: 8,
  },
  introIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: ActionColors.primarySoft,
  },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: '800' },
  description: { color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  sectionLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  resourceList: { gap: 10 },
  resourceCard: { padding: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, gap: 12 },
  resourceRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resourceName: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  openButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: ActionColors.primarySoft,
  },
  openButtonLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  partitionImage: { width: '100%', height: 420 },
  voiceCard: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
  },
  voiceCopy: { flex: 1, minWidth: 120, gap: 4 },
  voiceDetail: { color: COLORS.muted, fontSize: 11 },
  messageState: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 16 },
  messageText: { color: COLORS.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#7A1F3D12',
  },
  emptyTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800', textAlign: 'center' },
});
