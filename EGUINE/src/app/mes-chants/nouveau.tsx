import { useCallback, useMemo, useState } from 'react';
import { Image, Platform, ScrollView, View } from 'react-native';
import { showLocalizedAlert } from '@/i18n/alert';
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from '@/i18n/localized-components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/hooks/use-theme';
import { useStoreHydrated } from '@/hooks/use-store-hydrated';
import { flushAppStorePersistence, useAppStore } from '@/store/useAppStore';
import { savePersonalChant } from '@/database/chant-database';
import type { Categorie, Chant, Langue, RessourceChant, TypeRessourceChant } from '@/types';
import { createThemedStyles } from '@/utils/themed-styles';
import { goBackSafely } from '@/utils/navigation';
import { useTranslation } from '@/i18n/use-translation';
import { deletePersonalChantFiles, savePersonalChantFile } from '@/utils/personal-chant-storage';
import { ActionColors } from '@/constants/theme';

const CATEGORIES: Categorie[] = [
  'entree', 'kyrie', 'gloria', 'psaume', 'acclamation', 'offertoire', 'sanctus',
  'credo', 'priere_universelle', 'agnus_dei', 'communion', 'action_grace', 'chant_final', 'louange', 'adoration',
  'penitence', 'marial', 'funerailles', 'autre',
];
const LANGUAGES: { value: Langue; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'soussou', label: 'Soussou' },
  { value: 'poular', label: 'Poular' },
  { value: 'malinke', label: 'Malinké' },
  { value: 'kissi', label: 'Kissi' },
  { value: 'guerze', label: 'Guerzé' },
  { value: 'toma', label: 'Toma' },
  { value: 'kpele', label: 'Kpelé' },
  { value: 'baga', label: 'Baga' },
  { value: 'loma', label: 'Loma' },
  { value: 'mano', label: 'Mano' },
  { value: 'kono', label: 'Kono' },
  { value: 'en', label: 'Anglais' },
];

type DraftAttachment = {
  id: string;
  type: TypeRessourceChant;
  sourceUri: string;
  name: string;
  mimeType?: string;
  size?: number;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function NouveauChantPersonnelScreen() {
  const { language: interfaceLanguage } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const isHydrated = useStoreHydrated();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
  const recorderStatus = useAudioRecorderState(recorder, 250);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [author, setAuthor] = useState('');
  const [composer, setComposer] = useState('');
  const [language, setLanguage] = useState<Langue>('fr');
  const [category, setCategory] = useState<Categorie>('autre');
  const [isSaving, setIsSaving] = useState(false);

  const previewPlayer = useAudioPlayer(recordingUri ? { uri: recordingUri } : null);
  const previewStatus = useAudioPlayerStatus(previewPlayer);
  const hasRecordedAudio = useMemo(() => attachments.some((item) => item.type === 'audio'), [attachments]);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      showLocalizedAlert('Enregistrement mobile', 'L’enregistrement local est disponible dans l’application mobile.');
      return;
    }
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showLocalizedAlert('Microphone non autorisé', 'Autorisez l’accès au microphone dans les réglages pour enregistrer un chant.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsPaused(false);
    } catch (error) {
      showLocalizedAlert('Enregistrement impossible', errorMessage(error));
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        throw new Error('Aucun fichier audio n’a été produit. Vérifiez l’espace disponible et réessayez.');
      }
      setRecordingUri(uri);
      setAttachments((current) => [
        ...current.filter((item) => item.type !== 'audio'),
        { id: newId('audio'), type: 'audio', sourceUri: uri, name: `Enregistrement-${Date.now()}.m4a`, mimeType: 'audio/mp4' },
      ]);
      setIsPaused(false);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch (error) {
      showLocalizedAlert('Enregistrement non finalisé', errorMessage(error));
    }
  }, [recorder]);

  const toggleRecordingPause = useCallback(() => {
    try {
      if (isPaused) recorder.record();
      else recorder.pause();
      setIsPaused((paused) => !paused);
    } catch (error) {
      showLocalizedAlert('Action impossible', errorMessage(error));
    }
  }, [isPaused, recorder]);

  const addImages = useCallback(async (fromCamera: boolean) => {
    if (Platform.OS === 'web') {
      showLocalizedAlert('Import mobile', 'La conservation permanente des partitions est disponible dans l’application mobile.');
      return;
    }
    try {
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showLocalizedAlert('Appareil photo non autorisé', 'Autorisez l’accès à l’appareil photo pour photographier une partition.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
        if (result.canceled) return;
        setAttachments((current) => [
          ...current,
          ...result.assets.map((asset) => ({
            id: newId('image'),
            type: 'image' as const,
            sourceUri: asset.uri,
            name: asset.fileName || `partition-${Date.now()}.jpg`,
            mimeType: asset.mimeType || 'image/jpeg',
            size: asset.fileSize,
          })),
        ]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (result.canceled) return;
      setAttachments((current) => [
        ...current,
        ...result.assets.map((asset) => ({
          id: newId('image'),
          type: 'image' as const,
          sourceUri: asset.uri,
          name: asset.fileName || `partition-${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize,
        })),
      ]);
    } catch (error) {
      showLocalizedAlert('Import de photos impossible', errorMessage(error));
    }
  }, []);

  const addPdf = useCallback(async () => {
    if (Platform.OS === 'web') {
      showLocalizedAlert('Import mobile', 'La conservation permanente des partitions est disponible dans l’application mobile.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setAttachments((current) => [
        ...current,
        ...result.assets.map((asset) => ({
          id: newId('pdf'),
          type: 'pdf' as const,
          sourceUri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/pdf',
          size: asset.size,
        })),
      ]);
    } catch (error) {
      showLocalizedAlert('Import du PDF impossible', errorMessage(error));
    }
  }, []);

  const removeAttachment = useCallback(async (attachment: DraftAttachment) => {
    if (attachment.type === 'audio' && attachment.sourceUri === recordingUri) {
      try {
        await FileSystem.deleteAsync(attachment.sourceUri, { idempotent: true });
        previewPlayer.pause();
        setRecordingUri(null);
      } catch (error) {
        showLocalizedAlert('Suppression impossible', errorMessage(error));
        return;
      }
    }
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
  }, [previewPlayer, recordingUri]);

  const moveAttachment = useCallback((index: number, direction: -1 | 1) => {
    setAttachments((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  }, []);

  const saveChant = useCallback(async () => {
    if (isSaving) return;
    if (!isHydrated) {
      showLocalizedAlert('Bibliothèque en cours de chargement', 'Attendez la restauration de vos chants locaux avant de sauvegarder.');
      return;
    }
    if (!title.trim() && !lyrics.trim() && attachments.length === 0) {
      showLocalizedAlert('Fiche vide', 'Ajoutez un titre, des paroles, un enregistrement ou un document avant de sauvegarder.');
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const chantId = newId('personnel');
    const savedResources: RessourceChant[] = [];

    try {
      for (const attachment of attachments) {
        const uri = await savePersonalChantFile(
          attachment.sourceUri,
          chantId,
          attachment.id,
          attachment.name,
        );
        savedResources.push({
          id: attachment.id,
          type: attachment.type,
          uri,
          nom: attachment.name,
          mime_type: attachment.mimeType,
          taille_octets: attachment.size,
          created_at: now,
        });
      }

      const audio = savedResources.find((resource) => resource.type === 'audio');
      const partition = savedResources.find((resource) => resource.type !== 'audio');
      const chant: Chant = {
        id: chantId,
        titre: title.trim() || `${interfaceLanguage === 'en' ? 'Untitled song' : 'Chant sans titre'} · ${new Date().toLocaleDateString(interfaceLanguage === 'en' ? 'en-US' : 'fr-FR')}`,
        paroles: lyrics.trim(),
        langue: language,
        categorie: category,
        auteur: author.trim() || undefined,
        compositeur: composer.trim() || undefined,
        audio_url: audio?.uri,
        partition_url: partition?.uri,
        source: 'Créé ou importé sur cet appareil',
        statut_juridique: 'contenu_restreint',
        publie: false,
        nombre_vues: 0,
        nombre_favoris: 0,
        tags: [],
        variantes: [],
        ressources: savedResources,
        est_personnel: true,
        date_creation: now,
        created_at: now,
        updated_at: now,
      };

      useAppStore.getState().addPersonalChant(chant);
      try {
        await flushAppStorePersistence();
        await savePersonalChant(chant);
      } catch (error) {
        useAppStore.getState().removePersonalChant(chantId);
        try {
          await flushAppStorePersistence();
        } catch (rollbackError) {
          console.error('La restauration de la bibliothèque locale a échoué.', rollbackError);
        }
        throw error;
      }
      router.replace({ pathname: '/mes-chants/[id]', params: { id: chantId } });
    } catch (error) {
      try {
        await deletePersonalChantFiles(savedResources);
      } catch (cleanupError) {
        console.error('Certains fichiers locaux n’ont pas pu être supprimés après l’échec de la sauvegarde.', cleanupError);
        showLocalizedAlert('Sauvegarde incomplète', `${errorMessage(error)}\n\nCertains fichiers temporaires n’ont pas pu être supprimés.`);
        setIsSaving(false);
        return;
      }
      showLocalizedAlert('Sauvegarde impossible', errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [attachments, author, category, composer, isHydrated, isSaving, language, lyrics, router, title]);

  const pauseLabel = isPaused ? 'Reprendre' : 'Pause';
  const canRecord = Platform.OS !== 'web';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Nouveau chant</Text>
        <Pressable onPress={saveChant} disabled={isSaving || !isHydrated} style={[styles.saveButton, (isSaving || !isHydrated) && styles.disabled]}>
          <Text style={styles.saveButtonText}>{!isHydrated ? 'Chargement…' : isSaving ? 'Sauvegarde…' : 'Sauvegarder'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.privateBanner, { backgroundColor: theme.backgroundElement }]}>
          <MaterialCommunityIcons name="lock-outline" size={17} color="#7A1F3D" />
          <Text style={[styles.privateText, { color: theme.text }]}>Cette fiche et ses fichiers restent privés sur cet appareil.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Enregistrement audio</Text>
        <View style={[styles.recordCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.recordRow}>
            <View style={[styles.micIcon, recorderStatus.isRecording && styles.micIconActive]}>
              <MaterialCommunityIcons name={recorderStatus.isRecording ? 'microphone' : 'microphone-outline'} size={22} color={recorderStatus.isRecording ? '#FFFFFF' : '#7A1F3D'} />
            </View>
            <View style={styles.recordCopy}>
              <Text style={[styles.recordTitle, { color: theme.text }]}>
                {recorderStatus.isRecording ? 'Microphone actif' : isPaused ? 'Enregistrement en pause' : hasRecordedAudio ? 'Écoutez avant de garder' : 'Aucun enregistrement'}
              </Text>
              <Text style={[styles.recordSubtitle, { color: theme.textSecondary }]}>
                {recorderStatus.isRecording || isPaused
                  ? formatDuration(recorderStatus.durationMillis)
                  : 'Le fichier sera conservé hors connexion.'}
              </Text>
            </View>
            {recorderStatus.isRecording || isPaused ? (
              <Pressable accessibilityRole="button" accessibilityLabel={pauseLabel} onPress={toggleRecordingPause} style={styles.smallAction}>
                <MaterialCommunityIcons name={isPaused ? 'play' : 'pause'} size={21} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.recordActions}>
            {recorderStatus.isRecording || isPaused ? (
              <Pressable onPress={stopRecording} style={styles.stopButton}>
                <MaterialCommunityIcons name="stop" size={18} color="#FFFFFF" />
                <Text style={styles.stopButtonText}>Arrêter</Text>
              </Pressable>
            ) : (
              <Pressable onPress={startRecording} disabled={!canRecord || isSaving} style={[styles.outlineButton, (!canRecord || isSaving) && styles.disabled]}>
                <MaterialCommunityIcons name="record-circle-outline" size={19} color="#7A1F3D" />
                <Text style={styles.outlineButtonText}>{hasRecordedAudio ? 'Recommencer' : 'Enregistrer un chant'}</Text>
              </Pressable>
            )}
            {recordingUri && hasRecordedAudio && (
              <>
                <Pressable
                  onPress={() => previewStatus.playing ? previewPlayer.pause() : previewPlayer.play()}
                  style={[styles.outlineButton, styles.previewButton]}
                >
                  <MaterialCommunityIcons name={previewStatus.playing ? 'pause' : 'play'} size={19} color={theme.textSecondary} />
                  <Text style={styles.previewButtonText}>{previewStatus.playing ? 'Pause' : 'Écouter'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer l’enregistrement"
                  onPress={() => {
                    const audio = attachments.find((item) => item.type === 'audio');
                    if (audio) void removeAttachment(audio);
                  }}
                  style={styles.deleteButton}
                >
                  <MaterialCommunityIcons name="delete-outline" size={20} color={ActionColors.danger} />
                </Pressable>
              </>
            )}
          </View>
        </View>
        {Platform.OS === 'web' && (
          <Text style={[styles.helpText, { color: theme.textSecondary }]}>L’enregistrement et les fichiers locaux durables nécessitent l’application mobile.</Text>
        )}

        <Text style={[styles.sectionTitle, styles.sectionSpacing, { color: theme.text }]}>Paroles et partitions</Text>
        <View style={styles.importActions}>
          <Pressable onPress={() => void addImages(true)} style={[styles.importButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="camera-outline" size={20} color="#7A1F3D" />
            <Text style={[styles.importText, { color: theme.text }]}>Photographier</Text>
          </Pressable>
          <Pressable onPress={() => void addImages(false)} style={[styles.importButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#7A1F3D" />
            <Text style={[styles.importText, { color: theme.text }]}>Importer des images</Text>
          </Pressable>
          <Pressable onPress={() => void addPdf()} style={[styles.importButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={20} color="#7A1F3D" />
            <Text style={[styles.importText, { color: theme.text }]}>Importer un PDF</Text>
          </Pressable>
        </View>

        {attachments.length > 0 && (
          <View style={styles.attachmentList}>
            {attachments.map((attachment, index) => (
              <View key={attachment.id} style={[styles.attachment, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.sourceUri }} style={styles.thumbnail} />
                ) : (
                  <View style={styles.fileIcon}>
                    <MaterialCommunityIcons name={attachment.type === 'audio' ? 'music-note' : 'file-pdf-box'} size={23} color="#7A1F3D" />
                  </View>
                )}
                <View style={styles.attachmentCopy}>
                  <Text numberOfLines={1} style={[styles.attachmentName, { color: theme.text }]}>{attachment.name}</Text>
                  <Text style={[styles.attachmentType, { color: theme.textSecondary }]}>
                    {attachment.type === 'audio' ? 'Enregistrement audio' : attachment.type === 'pdf' ? 'Document PDF' : `Page ${index + 1}`}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Monter la page" disabled={index === 0} onPress={() => moveAttachment(index, -1)} style={styles.reorderAction}>
                  <MaterialCommunityIcons name="chevron-up" size={20} color={index === 0 ? theme.textSecondary : theme.text} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Descendre la page" disabled={index === attachments.length - 1} onPress={() => moveAttachment(index, 1)} style={styles.reorderAction}>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={index === attachments.length - 1 ? theme.textSecondary : theme.text} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Supprimer le document" onPress={() => void removeAttachment(attachment)} style={styles.reorderAction}>
                  <MaterialCommunityIcons name="close" size={19} color="#A52A36" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, styles.sectionSpacing, { color: theme.text }]}>Informations (facultatives)</Text>
        <TextInput
          accessibilityLabel="Titre du chant"
          value={title}
          onChangeText={setTitle}
          placeholder="Titre du chant"
          placeholderTextColor={theme.textSecondary}
          maxLength={120}
          style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
        />
        <TextInput
          accessibilityLabel="Paroles du chant"
          value={lyrics}
          onChangeText={setLyrics}
          placeholder="Paroles"
          placeholderTextColor={theme.textSecondary}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.lyricsInput, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
        />
        <TextInput
          accessibilityLabel="Auteur"
          value={author}
          onChangeText={setAuthor}
          placeholder="Auteur (facultatif)"
          placeholderTextColor={theme.textSecondary}
          maxLength={100}
          style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
        />
        <TextInput
          accessibilityLabel="Compositeur"
          value={composer}
          onChangeText={setComposer}
          placeholder="Compositeur (facultatif)"
          placeholderTextColor={theme.textSecondary}
          maxLength={100}
          style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
        />

        <Text style={[styles.fieldLabel, { color: theme.text }]}>Langue</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {LANGUAGES.map((item) => (
            <Pressable key={item.value} onPress={() => setLanguage(item.value)} style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, language === item.value && styles.selectedChip]}>
              <Text style={[styles.chipText, { color: theme.text }, language === item.value && styles.selectedChipText]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.fieldLabel, { color: theme.text }]}>Catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((item) => (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, category === item && styles.selectedChip]}>
              <Text style={[styles.chipText, { color: theme.text }, category === item && styles.selectedChipText]}>{item.replaceAll('_', ' ')}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable onPress={saveChant} disabled={isSaving || !isHydrated} style={[styles.bottomSaveButton, (isSaving || !isHydrated) && styles.disabled]}>
          <Text style={styles.bottomSaveText}>{!isHydrated ? 'Chargement de la bibliothèque…' : isSaving ? 'Sauvegarde…' : 'Enregistrer dans Mes chants'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  backButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '800' },
  saveButton: { backgroundColor: '#7A1F3D', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  content: { padding: 18, paddingBottom: 40 },
  privateBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 12, marginBottom: 20 },
  privateText: { flex: 1, fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  sectionSpacing: { marginTop: 24 },
  recordCard: { borderWidth: 1, borderRadius: 15, padding: 14, gap: 14 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  micIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7A1F3D1A' },
  micIconActive: { backgroundColor: '#A52A36' },
  recordCopy: { flex: 1, gap: 3 },
  recordTitle: { fontSize: 14, fontWeight: '700' },
  recordSubtitle: { fontSize: 12 },
  smallAction: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4E9ED' },
  recordActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  outlineButton: { minHeight: 40, borderRadius: 11, borderWidth: 1, borderColor: '#7A1F3D', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  outlineButtonText: { color: '#7A1F3D', fontSize: 12, fontWeight: '700' },
  previewButton: { borderColor: '#7A1F3D' },
  previewButtonText: { color: '#7A1F3D', fontSize: 12, fontWeight: '700' },
  stopButton: { minHeight: 40, borderRadius: 11, backgroundColor: '#A52A36', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  stopButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  deleteButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  helpText: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  importActions: { gap: 8 },
  importButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  importText: { fontSize: 13, fontWeight: '600' },
  attachmentList: { gap: 7, marginTop: 12 },
  attachment: { minHeight: 62, borderRadius: 12, borderWidth: 1, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  thumbnail: { width: 44, height: 46, borderRadius: 7, backgroundColor: '#D9D9D9' },
  fileIcon: { width: 44, height: 46, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7A1F3D1A' },
  attachmentCopy: { flex: 1, gap: 3 },
  attachmentName: { fontSize: 12, fontWeight: '700' },
  attachmentType: { fontSize: 11 },
  reorderAction: { width: 26, height: 38, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 9 },
  lyricsInput: { minHeight: 120, paddingTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginTop: 6, marginBottom: 7 },
  chips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: { minHeight: 34, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  selectedChip: { backgroundColor: '#7A1F3D', borderColor: '#7A1F3D' },
  selectedChipText: { color: '#FFFFFF' },
  bottomSaveButton: { minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7A1F3D', marginTop: 26 },
  bottomSaveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
