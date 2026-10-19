import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Platform, ScrollView, View } from 'react-native';
import { showLocalizedAlert } from '@/i18n/alert';
import { LocalizedPressable as Pressable, LocalizedText as Text } from '@/i18n/localized-components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useStoreHydrated } from '@/hooks/use-store-hydrated';
import { useTheme } from '@/hooks/use-theme';
import { flushAppStorePersistence, useAppStore } from '@/store/useAppStore';
import type { Chant, RessourceChant } from '@/types';
import { createThemedStyles } from '@/utils/themed-styles';
import { ActionColors } from '@/constants/theme';
import { goBackSafely } from '@/utils/navigation';
import { deletePersonalChantFiles } from '@/utils/personal-chant-storage';
import {
  getChantById,
  recordChantListen,
  removePersonalChantResource as removeChantResource,
  removeUnreferencedLocalFileRecord,
  savePersonalChant,
  setLocalFileAvailability,
} from '@/database/chant-database';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

export default function ChantPersonnelDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const isHydrated = useStoreHydrated();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [chant, setChant] = useState<Chant | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const [resourcesMenuVisible, setResourcesMenuVisible] = useState(false);
  const contentScrollRef = useRef<ScrollView>(null);
  const lyricsPositionRef = useRef(0);
  const listenedSecondsRef = useRef(0);
  const lastAudioPositionRef = useRef<number | null>(null);
  const recordedListenRef = useRef(false);
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const playback = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!playback.playing || !playingAudioId || !chant) {
      lastAudioPositionRef.current = null;
      return;
    }

    const currentTime = playback.currentTime;
    const previousTime = lastAudioPositionRef.current;
    if (previousTime !== null) {
      const elapsed = currentTime - previousTime;
      if (elapsed > 0 && elapsed <= 1.5) listenedSecondsRef.current += elapsed;
    }
    lastAudioPositionRef.current = currentTime;

    const threshold = playback.duration > 0 ? Math.min(30, playback.duration * 0.8) : 30;
    if (!recordedListenRef.current && listenedSecondsRef.current >= threshold) {
      recordedListenRef.current = true;
      void recordChantListen(chant.id).catch((error: unknown) => {
        console.error(`Impossible d’enregistrer l’écoute du chant ${chant.id}.`, error);
      });
    }
  }, [chant, playback.currentTime, playback.duration, playback.playing, playingAudioId]);

  useEffect(() => {
    if (!isHydrated || !id) return;
    let active = true;
    void getChantById(id)
      .then(async (result) => {
        if (!result?.est_personnel) {
          if (active) setChant(undefined);
          return;
        }
        const resources = await Promise.all((result.ressources ?? []).map(async (resource) => {
          try {
            const info = await FileSystem.getInfoAsync(resource.uri);
            const availability = info.exists ? 'available' as const : 'missing' as const;
            await setLocalFileAvailability(
              resource.uri,
              availability,
              info.exists ? undefined : 'Fichier absent du stockage local.',
            );
            return { ...resource, availability };
          } catch (error) {
            console.error(`Vérification du fichier local ${resource.nom} impossible.`, error);
            await setLocalFileAvailability(resource.uri, 'missing', errorMessage(error));
            return { ...resource, availability: 'missing' as const };
          }
        }));
        if (active) setChant({ ...result, ressources: resources });
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Impossible de lire cette fiche locale.');
      });
    return () => { active = false; };
  }, [id, isHydrated]);

  const audioResources = useMemo(
    () => chant?.ressources?.filter((resource) => resource.type === 'audio') ?? [],
    [chant]
  );
  const imageResources = useMemo(
    () => chant?.ressources?.filter((resource) => resource.type === 'image') ?? [],
    [chant]
  );
  const pdfResources = useMemo(
    () => chant?.ressources?.filter((resource) => resource.type === 'pdf') ?? [],
    [chant]
  );

  const playAudio = async (resource: RessourceChant) => {
    if (playingAudioId === resource.id && playback.playing) {
      player.pause();
      return;
    }
    try {
      const info = await FileSystem.getInfoAsync(resource.uri);
      if (!info.exists) {
        await setLocalFileAvailability(resource.uri, 'missing', 'Fichier absent du stockage local.');
        throw new Error('Ce fichier audio est manquant sur cet appareil.');
      }
    } catch (error) {
      showLocalizedAlert('Lecture impossible', errorMessage(error));
      return;
    }
    if (playingAudioId !== resource.id) {
      player.replace(resource.uri);
      setPlayingAudioId(resource.id);
      listenedSecondsRef.current = 0;
      lastAudioPositionRef.current = null;
      recordedListenRef.current = false;
    }
    player.play();
  };

  const openPdf = async (resource: RessourceChant) => {
    if (Platform.OS === 'web') {
      showLocalizedAlert('PDF enregistré', 'Ce document est conservé dans le stockage local de l’application mobile.');
      return;
    }
    try {
      const info = await FileSystem.getInfoAsync(resource.uri);
      if (!info.exists) {
        await setLocalFileAvailability(resource.uri, 'missing', 'Fichier absent du stockage local.');
        throw new Error('Ce PDF est manquant sur cet appareil.');
      }
      if (!await Sharing.isAvailableAsync()) {
        throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
      }
      await Sharing.shareAsync(resource.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Ouvrir ou partager la partition PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      showLocalizedAlert('Ouverture du PDF impossible', errorMessage(error));
    }
  };

  const removeResource = (resource: RessourceChant) => {
    if (!chant) return;
    showLocalizedAlert(
      'Retirer ce document ?',
      'Seul ce fichier sera retiré de la fiche. Les autres ressources du chant resteront intactes.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => { void (async () => {
            const originalResources = chant.ressources ?? [];
            const nextResources = originalResources.filter((item) => item.id !== resource.id);
            const update = useAppStore.getState().updatePersonalChant;
            const updated = {
              ...chant,
              ressources: nextResources,
              audio_url: nextResources.find((item) => item.type === 'audio')?.uri,
              partition_url: nextResources.find((item) => item.type !== 'audio')?.uri,
              updated_at: new Date().toISOString(),
            };
            let released: Awaited<ReturnType<typeof removeChantResource>> | undefined;
            try {
              released = await removeChantResource(chant.id, resource.id);
              await savePersonalChant(updated);
            } catch (error) {
              try {
                await savePersonalChant(chant);
              } catch (rollbackError) {
                console.error('La restauration du chant dans SQLite après échec de suppression a échoué.', rollbackError);
              }
              update(chant.id, { ressources: originalResources, audio_url: chant.audio_url, partition_url: chant.partition_url });
              setChant(chant);
              try {
                await flushAppStorePersistence();
              } catch (rollbackError) {
                console.error('La restauration de la fiche après suppression du document a échoué.', rollbackError);
              }
              showLocalizedAlert('Suppression impossible', errorMessage(error));
              return;
            }
            update(chant.id, updated);
            setChant(updated);
            try {
              await flushAppStorePersistence();
            } catch (error) {
              console.error('Le cache de compatibilité du chant n’a pas pu être actualisé ; SQLite reste à jour.', error);
            }
            if (released?.unreferenced) {
              try {
                await deletePersonalChantFiles([resource]);
                await removeUnreferencedLocalFileRecord(released.uri);
              } catch (error) {
                await setLocalFileAvailability(released.uri, 'failed', errorMessage(error));
                showLocalizedAlert('Fichier non supprimé', errorMessage(error));
              }
            }
          })(); },
        },
      ]
    );
  };

  if (!isHydrated || !chant) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.missingState}>
          {!isHydrated || (!chant && !loadError) ? (
            <Text style={[styles.missingDescription, { color: theme.textSecondary }]}>Restauration de la fiche locale…</Text>
          ) : (
            <>
              <MaterialCommunityIcons name="music-note-off" size={38} color={theme.textSecondary} />
              <Text style={[styles.missingTitle, { color: theme.text }]}>{loadError ? 'Fiche indisponible' : 'Chant introuvable'}</Text>
              <Text style={[styles.missingDescription, { color: theme.textSecondary }]}>{loadError ?? 'Cette fiche n’est pas présente dans la bibliothèque locale.'}</Text>
              <Pressable onPress={goBackSafely} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Retour à Mes chants</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.text }]}>{chant.titre}</Text>
      </View>

      <ScrollView ref={contentScrollRef} contentContainerStyle={styles.content}>
        <View style={[styles.privateBanner, { backgroundColor: theme.backgroundElement }]}>
          <MaterialCommunityIcons name="lock-outline" size={17} color="#7A1F3D" />
          <Text style={[styles.privateText, { color: theme.text }]}>Privé · enregistré uniquement sur cet appareil</Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{chant.titre}</Text>
        <Text style={[styles.metadata, { color: theme.textSecondary }]}>
          {[chant.auteur, chant.compositeur, chant.langue.toUpperCase(), chant.categorie.replaceAll('_', ' ')]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setResourcesMenuVisible(true)}
          style={styles.resourcesMenuButton}
        >
          <MaterialCommunityIcons name="view-grid-outline" size={19} color="#7A1F3D" />
          <Text style={styles.resourcesMenuButtonText}>Paroles, partition, voix et accords</Text>
          <MaterialCommunityIcons name="chevron-right" size={19} color="#607087" />
        </Pressable>

        {audioResources.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Enregistrements audio</Text>
            {audioResources.map((resource) => {
              const selected = playingAudioId === resource.id;
              return (
                <View key={resource.id} style={[styles.audioRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <Pressable onPress={() => playAudio(resource)} style={styles.audioPlay}>
                    <MaterialCommunityIcons name={selected && playback.playing ? 'pause-circle' : 'play-circle'} size={31} color={ActionColors.playback} />
                  </Pressable>
                  <View style={styles.audioCopy}>
                    <Text numberOfLines={1} style={[styles.resourceName, { color: theme.text }]}>{resource.nom}</Text>
                    <Text style={[styles.resourceSubtitle, { color: theme.textSecondary }]}>{selected && playback.playing ? 'Lecture en cours' : 'Fichier local · hors connexion'}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Retirer cet enregistrement" onPress={() => removeResource(resource)} style={styles.removeButton}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={ActionColors.danger} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {imageResources.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Pages de partition · {imageResources.length}</Text>
            {imageIndex === null ? (
              <View style={styles.imageGrid}>
                {imageResources.map((resource, index) => (
                  <Pressable key={resource.id} onPress={() => setImageIndex(index)} style={styles.pageCard}>
                    {resource.availability === 'available' ? (
                      <Image source={{ uri: resource.uri }} resizeMode="cover" style={styles.pageThumbnail} />
                    ) : (
                      <View style={[styles.pageThumbnail, styles.missingFile]}>
                        <Text style={styles.resourceSubtitle}>Fichier manquant</Text>
                      </View>
                    )}
                    <Text numberOfLines={1} style={[styles.pageLabel, { color: theme.text }]}>{index + 1}. {resource.nom}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Retirer cette page" onPress={() => removeResource(resource)} style={styles.pageRemove}>
                      <MaterialCommunityIcons name="close-circle" size={22} color="#A52A36" />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={[styles.imageViewer, { backgroundColor: theme.backgroundElement }]}>
                {imageResources[imageIndex]?.availability === 'available' ? (
                  <Image source={{ uri: imageResources[imageIndex].uri }} resizeMode="contain" style={styles.pageImage} />
                ) : (
                  <Text style={styles.resourceSubtitle}>Cette page n’est pas disponible sur l’appareil.</Text>
                )}
                <View style={styles.pageNavigation}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Page précédente" disabled={imageIndex === 0} onPress={() => setImageIndex((value) => value === null ? 0 : Math.max(0, value - 1))} style={styles.pageNavigationButton}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color={imageIndex === 0 ? theme.textSecondary : theme.text} />
                  </Pressable>
                  <Text style={[styles.pageCounter, { color: theme.text }]}>{imageIndex + 1} / {imageResources.length}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Page suivante" disabled={imageIndex === imageResources.length - 1} onPress={() => setImageIndex((value) => value === null ? 0 : Math.min(imageResources.length - 1, value + 1))} style={styles.pageNavigationButton}>
                    <MaterialCommunityIcons name="chevron-right" size={28} color={imageIndex === imageResources.length - 1 ? theme.textSecondary : theme.text} />
                  </Pressable>
                  <Pressable onPress={() => setImageIndex(null)} style={styles.closeViewer}>
                    <Text style={styles.closeViewerText}>Fermer</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {pdfResources.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Partitions PDF</Text>
            <Text style={[styles.pdfNote, { color: theme.textSecondary }]}>
              Les PDF restent sur cet appareil. Ils s’ouvrent ou se transmettent via le menu de partage du système.
            </Text>
            {pdfResources.map((resource) => (
              <View key={resource.id} style={[styles.audioRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Pressable onPress={() => void openPdf(resource)} style={styles.audioPlay}>
                  <MaterialCommunityIcons name="file-pdf-box" size={27} color="#7A1F3D" />
                </Pressable>
                <Pressable onPress={() => void openPdf(resource)} style={styles.audioCopy}>
                  <Text numberOfLines={1} style={[styles.resourceName, { color: theme.text }]}>{resource.nom}</Text>
                  <Text style={[styles.resourceSubtitle, { color: theme.textSecondary }]}>Ouvrir ou partager le PDF</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Retirer ce PDF" onPress={() => removeResource(resource)} style={styles.removeButton}>
                  <MaterialCommunityIcons name="delete-outline" size={20} color={ActionColors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {chant.paroles.trim().length > 0 && (
          <View
            onLayout={(event) => { lyricsPositionRef.current = event.nativeEvent.layout.y; }}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Paroles</Text>
            <View style={[styles.lyrics, { backgroundColor: theme.backgroundElement }]}>
              <Text selectable style={[styles.lyricsText, { color: theme.text }]}>{chant.paroles}</Text>
            </View>
          </View>
        )}

        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          {chant.ressources?.length ?? 0} fichier{(chant.ressources?.length ?? 0) === 1 ? '' : 's'} · aucune synchronisation serveur
        </Text>
      </ScrollView>

      <Modal visible={imageIndex !== null} animationType="fade" onRequestClose={() => setImageIndex(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.background }]}>
          {imageIndex !== null && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Page {imageIndex + 1} / {imageResources.length}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Fermer la page" onPress={() => setImageIndex(null)} style={styles.modalClose}>
                  <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
              <Image source={{ uri: imageResources[imageIndex].uri }} resizeMode="contain" style={styles.modalImage} />
              <View style={styles.modalControls}>
                <Pressable disabled={imageIndex === 0} onPress={() => setImageIndex((value) => value === null ? 0 : Math.max(0, value - 1))} style={styles.modalNav}>
                  <MaterialCommunityIcons name="chevron-left" size={32} color={imageIndex === 0 ? '#FFFFFF55' : '#FFFFFF'} />
                </Pressable>
                <Pressable disabled={imageIndex === imageResources.length - 1} onPress={() => setImageIndex((value) => value === null ? 0 : Math.min(imageResources.length - 1, value + 1))} style={styles.modalNav}>
                  <MaterialCommunityIcons name="chevron-right" size={32} color={imageIndex === imageResources.length - 1 ? '#FFFFFF55' : '#FFFFFF'} />
                </Pressable>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={resourcesMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResourcesMenuVisible(false)}
      >
        <View style={styles.resourcesMenuRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer le menu des ressources"
            onPress={() => setResourcesMenuVisible(false)}
            style={styles.resourcesMenuScrim}
          />
          <View style={[styles.resourcesMenuSheet, { backgroundColor: theme.background }]}>
            <View style={styles.resourcesMenuHandle} />
            <View style={styles.resourcesMenuHeading}>
              <View>
                <Text style={styles.resourcesMenuEyebrow}>POUR CE CHANT</Text>
                <Text style={[styles.resourcesMenuTitle, { color: theme.text }]}>Choisir une ressource</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={() => setResourcesMenuVisible(false)}
                style={styles.resourcesMenuClose}
              >
                <MaterialCommunityIcons name="close" size={20} color={theme.text} />
              </Pressable>
            </View>
            {([
                { key: 'paroles', label: 'Paroles', icon: 'text-box-outline', path: null, color: ActionColors.discovery },
                { key: 'partition', label: 'Partition', icon: 'music-clef-treble', path: 'partition', color: ActionColors.primary },
                { key: 'voix', label: 'Voix', icon: 'microphone-outline', path: 'voix', color: ActionColors.playback },
                { key: 'accords', label: 'Accords', icon: 'music-note', path: 'accords', color: ActionColors.success },
            ] as const).map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                onPress={() => {
                  setResourcesMenuVisible(false);
                  if (item.path) router.push(`/chant/${chant.id}/${item.path}`);
                  else contentScrollRef.current?.scrollTo({ y: lyricsPositionRef.current, animated: true });
                }}
                style={styles.resourcesMenuItem}
              >
                <View style={[styles.resourcesMenuIcon, { backgroundColor: `${item.color}16` }]}>
                  <MaterialCommunityIcons name={item.icon} size={21} color={item.color} />
                </View>
                <Text style={[styles.resourcesMenuItemText, { color: theme.text }]}>{item.label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  backButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  content: { padding: 18, paddingBottom: 40 },
  privateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 11 },
  privateText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 25, fontWeight: '800', marginTop: 19 },
  metadata: { fontSize: 12, textTransform: 'capitalize', marginTop: 5, lineHeight: 18 },
  resourcesMenuButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, marginTop: 16, borderRadius: 13, backgroundColor: '#7A1F3D10' },
  resourcesMenuButtonText: { flex: 1, color: '#000000', fontSize: 12, fontWeight: '700' },
  section: { marginTop: 25, gap: 9 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  audioRow: { minHeight: 66, borderRadius: 13, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  audioPlay: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  audioCopy: { flex: 1, gap: 3 },
  resourceName: { fontSize: 13, fontWeight: '700' },
  resourceSubtitle: { fontSize: 11 },
  removeButton: { width: 35, height: 40, alignItems: 'center', justifyContent: 'center' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pageCard: { width: '47%', minHeight: 145, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  pageThumbnail: { width: '100%', height: 118, backgroundColor: '#D9D9D9' },
  missingFile: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  pageLabel: { fontSize: 11, paddingTop: 5 },
  pageRemove: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FFFFFF', borderRadius: 12 },
  imageViewer: { minHeight: 360, borderRadius: 14, padding: 8 },
  pageImage: { width: '100%', height: 300 },
  pageNavigation: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  pageNavigationButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pageCounter: { fontSize: 13, fontWeight: '700' },
  closeViewer: { borderRadius: 9, backgroundColor: '#7A1F3D', paddingHorizontal: 12, paddingVertical: 8 },
  closeViewerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pdfNote: { fontSize: 12, lineHeight: 17 },
  lyrics: { borderRadius: 14, padding: 16 },
  lyricsText: { fontSize: 16, lineHeight: 26 },
  footerText: { fontSize: 11, textAlign: 'center', marginTop: 26 },
  missingState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  missingTitle: { fontSize: 18, fontWeight: '800', marginTop: 14 },
  missingDescription: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  primaryButton: { marginTop: 18, borderRadius: 11, backgroundColor: '#7A1F3D', paddingHorizontal: 15, paddingVertical: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modal: { flex: 1 },
  modalHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalImage: { flex: 1, width: '100%' },
  modalControls: { minHeight: 60, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22 },
  modalNav: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  resourcesMenuRoot: { flex: 1, justifyContent: 'flex-end' },
  resourcesMenuScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#00000066' },
  resourcesMenuSheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  resourcesMenuHandle: { width: 38, height: 4, alignSelf: 'center', marginBottom: 18, borderRadius: 2, backgroundColor: '#C7CBD2' },
  resourcesMenuHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resourcesMenuEyebrow: { color: '#7A1F3D', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  resourcesMenuTitle: { marginTop: 4, fontSize: 19, fontWeight: '800' },
  resourcesMenuClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#F8F6F7' },
  resourcesMenuItem: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#E7EAF0' },
  resourcesMenuIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#7A1F3D12' },
  resourcesMenuItemText: { flex: 1, fontSize: 13, fontWeight: '700' },
});
