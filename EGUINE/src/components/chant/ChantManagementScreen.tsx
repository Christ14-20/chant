import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { showLocalizedAlert } from '@/i18n/alert';
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from '@/i18n/localized-components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getChantById, saveCatalogChant, deleteLocalFileIfUnreferenced } from '@/database/chant-database';
import { CHANT_CATEGORIES } from '@/database/schema';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { saveChantResourceFile } from '@/utils/personal-chant-storage';
import { sanitizeResourceName, validateChantFile, type ChantFileType, type PickedChantFile } from '@/utils/chant-resource-import-core';
import type {
  Categorie, Chant, Langue, PartieVocale, RessourceChant, RoleAudioChant, SectionParoles,
  TempsLiturgique, TypeSectionParoles, TypeRessourceChant,
} from '@/types';
import { goBackSafely } from '@/utils/navigation';
import { ActionColors } from '@/constants/theme';

const LANGUAGES: { value: Langue; label: string }[] = [
  { value: 'fr', label: 'Français' }, { value: 'la', label: 'Latin' }, { value: 'es', label: 'Espagnol' },
  { value: 'soussou', label: 'Soussou' }, { value: 'poular', label: 'Poular' }, { value: 'malinke', label: 'Malinké' },
  { value: 'kissi', label: 'Kissi' }, { value: 'guerze', label: 'Guerzé' }, { value: 'toma', label: 'Toma' },
  { value: 'kpele', label: 'Kpelé' }, { value: 'baga', label: 'Baga' }, { value: 'loma', label: 'Loma' },
  { value: 'mano', label: 'Mano' }, { value: 'kono', label: 'Kono' }, { value: 'en', label: 'Anglais' },
];
const SEASONS: { value: TempsLiturgique; label: string }[] = [
  { value: 'avent', label: 'Avent' }, { value: 'noel', label: 'Noël' }, { value: 'careme', label: 'Carême' },
  { value: 'triduum_pascal', label: 'Triduum pascal' }, { value: 'temps_pascal', label: 'Temps pascal' },
  { value: 'temps_ordinaire', label: 'Temps ordinaire' },
];
const AUDIO_ROLES: { value: RoleAudioChant; label: string }[] = [
  { value: 'original', label: 'Original' }, { value: 'accompagnement', label: 'Instrumental' },
  { value: 'choeur', label: 'Chœur complet' }, { value: 'voix', label: 'Piste vocale' }, { value: 'autre', label: 'Autre' },
];
const VOICE_PARTS: { value: PartieVocale; label: string }[] = [
  { value: 'soprano', label: 'Soprano' }, { value: 'alto', label: 'Alto' }, { value: 'tenor', label: 'Ténor' },
  { value: 'basse', label: 'Basse' }, { value: 'voix_principale', label: 'Voix principale' },
  { value: 'personnalisee', label: 'Autre voix' },
];
const SECTION_TYPES: { value: TypeSectionParoles; label: string }[] = [
  { value: 'couplet', label: 'Couplet' }, { value: 'refrain', label: 'Refrain' }, { value: 'pont', label: 'Pont' },
  { value: 'intro', label: 'Intro' }, { value: 'outro', label: 'Outro' }, { value: 'autre', label: 'Autre' },
];
const COLORS = { bg: '#FFFFFF', ink: '#0A1F44', muted: '#607087', border: '#E4E8EF', soft: '#F7F8FA', accent: '#7A1F3D' };

type PendingResource = PickedChantFile & {
  id: string;
  type: TypeRessourceChant;
  role_audio?: RoleAudioChant;
  partie_vocale?: string;
  description?: string;
  version?: string;
  tonalite?: string;
  replacesId?: string;
};

type ResourceDraft = RessourceChant & { replaces?: PendingResource };

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

function formatBytes(size?: number | null): string {
  if (typeof size !== 'number' || size <= 0) return 'Taille inconnue';
  return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} Mo` : `${Math.ceil(size / 1024)} Ko`;
}

export default function ChantManagementScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [sections, setSections] = useState<SectionParoles[]>([]);
  const [chords, setChords] = useState('');
  const [author, setAuthor] = useState('');
  const [composer, setComposer] = useState('');
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState<Langue>('fr');
  const [category, setCategory] = useState<Categorie>('autre');
  const [season, setSeason] = useState<TempsLiturgique | ''>('');
  const [keySignature, setKeySignature] = useState('');
  const [savedResources, setSavedResources] = useState<ResourceDraft[]>([]);
  const [pendingResources, setPendingResources] = useState<PendingResource[]>([]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    void getChantById(id)
      .then((chant) => {
        if (!active) return;
        if (!chant) {
          setLoadError('Ce chant n’est pas présent dans la bibliothèque locale.');
          return;
        }
        setTitle(chant.titre);
        setLyrics(chant.sections_paroles?.length ? '' : chant.paroles);
        setSections(chant.sections_paroles ?? []);
        setChords(chant.accords ?? '');
        setAuthor(chant.auteur ?? '');
        setComposer(chant.compositeur ?? '');
        setSource(chant.source ?? '');
        setLanguage(chant.langue);
        setCategory(chant.categorie);
        setSeason(chant.temps_liturgique ?? '');
        setKeySignature(chant.tonalite ?? '');
        setSavedResources(chant.ressources ?? []);
      })
      .catch((error: unknown) => setLoadError(messageFor(error)))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const allResourceCount = savedResources.length + pendingResources.filter((resource) => !resource.replacesId).length;
  const activeResourceCount = useMemo(
    () => savedResources.length + pendingResources.filter((resource) => !resource.replacesId).length,
    [pendingResources, savedResources],
  );

  const queuePickedFiles = async (kind: 'audio' | 'score', replacesId?: string) => {
    if (Platform.OS === 'web') {
      showLocalizedAlert('Stockage mobile requis', 'L’import de fichiers durables est disponible dans l’application mobile.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: kind === 'audio' ? 'audio/*' : ['application/pdf', 'image/*'],
        multiple: !replacesId,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const accepted: PendingResource[] = [];
      const rejected: string[] = [];
      for (const file of result.assets) {
        const name = sanitizeResourceName(file.name);
        const extension = name.split('.').at(-1)?.toLowerCase();
        const type: TypeRessourceChant = kind === 'audio' ? 'audio' : extension === 'pdf' ? 'pdf' : 'image';
        const expected: ChantFileType = type;
        const reason = validateChantFile(file, expected);
        if (reason) {
          rejected.push(`${name}: ${reason}`);
          continue;
        }
        accepted.push({
          id: replacesId ?? createId(type),
          type,
          name,
          uri: file.uri,
          mimeType: file.mimeType,
          size: file.size,
          role_audio: kind === 'audio' ? 'original' : undefined,
          replacesId,
        });
      }
      if (accepted.length) {
        setPendingResources((current) => [
          ...current.filter((resource) => resource.replacesId !== replacesId || !replacesId),
          ...accepted,
        ]);
      }
      if (rejected.length) showLocalizedAlert('Certains fichiers ont été refusés', rejected.slice(0, 4).join('\n'));
    } catch (error) {
      showLocalizedAlert('Import impossible', messageFor(error));
    }
  };

  const removeSavedResource = (resourceId: string) => {
    showLocalizedAlert('Supprimer cette ressource ?', 'Le chant et ses autres fichiers resteront intacts.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        setSavedResources((current) => current.filter((resource) => resource.id !== resourceId));
        setPendingResources((current) => current.filter((resource) => resource.replacesId !== resourceId));
      } },
    ]);
  };

  const addSection = (type: TypeSectionParoles) => {
    setSections((current) => [...current, {
      id: createId('section'), type,
      titre: `${SECTION_TYPES.find((item) => item.value === type)?.label ?? 'Section'} ${current.filter((item) => item.type === type).length + 1}`,
      texte: '',
    }]);
  };

  const save = async () => {
    if (saving) return;
    if (!title.trim()) {
      showLocalizedAlert('Titre requis', 'Saisissez un titre avant d’enregistrer le chant.');
      return;
    }
    if (!lyrics.trim() && sections.every((section) => !section.texte.trim()) && !allResourceCount) {
      showLocalizedAlert('Fiche vide', 'Ajoutez des paroles ou au moins une ressource.');
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const chantId = id ?? createId('chant');
    const copiedUris: string[] = [];
    let committed = false;
    try {
      const nextResources: RessourceChant[] = savedResources.map(({ replaces: _replaces, ...resource }) => resource);
      for (const pending of pendingResources) {
        const uri = await saveChantResourceFile(pending.uri, chantId, pending.id, pending.name);
        copiedUris.push(uri);
        const resource: RessourceChant = {
          id: pending.id,
          type: pending.type,
          uri,
          nom: pending.name,
          mime_type: pending.mimeType ?? undefined,
          taille_octets: pending.size ?? undefined,
          role_audio: pending.role_audio,
          partie_vocale: pending.partie_vocale,
          description: pending.description,
          version: pending.version,
          tonalite: pending.tonalite,
          created_at: now,
          availability: 'available',
          sync_state: 'local_only',
        };
        const replaceIndex = pending.replacesId
          ? nextResources.findIndex((resource) => resource.id === pending.replacesId)
          : -1;
        if (replaceIndex >= 0) nextResources[replaceIndex] = resource;
        else nextResources.push(resource);
      }

      const sectionsWithText = sections.filter((section) => section.texte.trim());
      const structuredLyrics = sectionsWithText.map((section) => `${section.titre.trim()}\n${section.texte.trim()}`).join('\n\n');
      const fullLyrics = [lyrics.trim(), structuredLyrics].filter(Boolean).join('\n\n');
      const chant: Chant = {
        id: chantId,
        titre: title.trim(),
        paroles: fullLyrics,
        sections_paroles: sectionsWithText.length ? sectionsWithText : undefined,
        accords: chords.trim() || undefined,
        langue: language,
        categorie: category,
        temps_liturgique: season || undefined,
        tonalite: keySignature.trim() || undefined,
        auteur: author.trim() || undefined,
        compositeur: composer.trim() || undefined,
        source: source.trim() || undefined,
        statut_juridique: editing ? (await getChantById(chantId))?.statut_juridique ?? 'contenu_restreint' : 'contenu_restreint',
        publie: editing ? (await getChantById(chantId))?.publie ?? false : false,
        nombre_vues: 0,
        nombre_favoris: 0,
        audio_url: nextResources.find((resource) => resource.type === 'audio')?.uri,
        partition_url: nextResources.find((resource) => resource.type === 'pdf' || resource.type === 'image')?.uri,
        tags: (await getChantById(chantId))?.tags ?? [],
        variantes: (await getChantById(chantId))?.variantes ?? [],
        ressources: nextResources,
        est_personnel: (await getChantById(chantId))?.est_personnel ?? false,
        created_at: (await getChantById(chantId))?.created_at ?? now,
        updated_at: now,
      };
      const orphanedUris = await saveCatalogChant(chant);
      committed = true;
      const current = useAppStore.getState();
      useAppStore.setState({ chants: [...current.chants.filter((item) => item.id !== chant.id), chant] });
      for (const uri of orphanedUris) {
        try {
          await deleteLocalFileIfUnreferenced(uri);
        } catch (error) {
          console.error(`Impossible de nettoyer le fichier ${uri}.`, error);
        }
      }
      router.replace(`/chant/${chant.id}`);
    } catch (error) {
      if (!committed) {
        for (const uri of copiedUris) {
          try { await deleteLocalFileIfUnreferenced(uri); }
          catch (cleanupError) { console.error(`Impossible de nettoyer le fichier temporaire ${uri}.`, cleanupError); }
        }
      }
      showLocalizedAlert('Enregistrement impossible', messageFor(error));
    } finally {
      setSaving(false);
    }
  };

  const updateSavedResource = (resourceId: string, update: Partial<ResourceDraft>) => {
    setSavedResources((current) => current.map((resource) => resource.id === resourceId ? { ...resource, ...update } : resource));
  };
  const updatePendingResource = (resourceId: string, update: Partial<PendingResource>) => {
    setPendingResources((current) => current.map((resource) => resource.id === resourceId ? { ...resource, ...update } : resource));
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={COLORS.accent} /><Text style={styles.muted}>Chargement du chant…</Text></View></SafeAreaView>;
  }
  if (loadError) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.error}>{loadError}</Text><ActionButton label="Retour" icon="arrow-left" onPress={goBackSafely} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.back}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{editing ? 'Gérer le chant' : 'Nouveau chant'}</Text>
        <Pressable accessibilityRole="button" onPress={() => void save()} disabled={saving} style={[styles.saveButton, saving && styles.disabled]}>
          <Text style={styles.saveLabel}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle title="Fiche du chant" />
        <Field label="Titre *" value={title} onChangeText={setTitle} placeholder="Titre du chant" />
        <Field label="Auteur" value={author} onChangeText={setAuthor} placeholder="Auteur (facultatif)" />
        <Field label="Compositeur" value={composer} onChangeText={setComposer} placeholder="Compositeur (facultatif)" />
        <Field label="Source et droits" value={source} onChangeText={setSource} placeholder="Source, licence ou autorisation" />

        <Text style={styles.label}>Langue</Text>
        <ChipRow items={LANGUAGES} value={language} onSelect={(value) => setLanguage(value as Langue)} />
        <Text style={styles.label}>Catégorie principale</Text>
        <ChipRow items={CHANT_CATEGORIES.map(([value, label]) => ({ value, label }))} value={category} onSelect={(value) => setCategory(value as Categorie)} />
        <Text style={styles.label}>Temps liturgique</Text>
        <ChipRow items={[{ value: '', label: 'Toute l’année' }, ...SEASONS]} value={season} onSelect={(value) => setSeason(value as TempsLiturgique | '')} />

        <SectionTitle title="Paroles et accords" />
        <TextInput
          accessibilityLabel="Paroles complètes"
          multiline
          textAlignVertical="top"
          value={lyrics}
          onChangeText={setLyrics}
          placeholder="Saisir ou coller les paroles complètes"
          placeholderTextColor="#788397"
          style={[styles.input, styles.multiline]}
        />
        <View style={styles.inlineActions}>
          {SECTION_TYPES.map((item) => (
            <Pressable key={item.value} onPress={() => addSection(item.value)} style={styles.addSection}>
              <MaterialCommunityIcons name="plus" size={15} color={COLORS.accent} />
              <Text style={styles.addSectionLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        {sections.map((section) => (
          <View key={section.id} style={styles.sectionEditor}>
            <View style={styles.resourceHeading}>
              <Field label="Titre de section" value={section.titre} onChangeText={(value) => setSections((current) => current.map((item) => item.id === section.id ? { ...item, titre: value } : item))} placeholder="Couplet 1" compact />
              <Pressable accessibilityRole="button" accessibilityLabel="Supprimer cette section" onPress={() => setSections((current) => current.filter((item) => item.id !== section.id))} style={styles.iconButton}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={ActionColors.danger} />
              </Pressable>
            </View>
            <ChipRow items={SECTION_TYPES} value={section.type} onSelect={(value) => setSections((current) => current.map((item) => item.id === section.id ? { ...item, type: value as TypeSectionParoles } : item))} />
            <TextInput multiline textAlignVertical="top" value={section.texte} onChangeText={(value) => setSections((current) => current.map((item) => item.id === section.id ? { ...item, texte: value } : item))} placeholder="Texte de la section" placeholderTextColor="#788397" style={[styles.input, styles.sectionLyrics]} />
          </View>
        ))}
        <Field label="Tonalité" value={keySignature} onChangeText={setKeySignature} placeholder="Ex. Sol majeur" />
        <TextInput
          accessibilityLabel="Accords"
          multiline
          textAlignVertical="top"
          value={chords}
          onChangeText={setChords}
          placeholder="Accords, grille ou progression harmonique (facultatif)"
          placeholderTextColor="#788397"
          style={[styles.input, styles.chords]}
        />

        <SectionTitle title={`Fichiers associés · ${activeResourceCount}`} />
        <View style={styles.importRow}>
          <ActionButton label="Ajouter audio" icon="music-note-plus" onPress={() => void queuePickedFiles('audio')} />
          <ActionButton label="Ajouter partition" icon="file-plus-outline" onPress={() => void queuePickedFiles('score')} />
        </View>
        {allResourceCount === 0 && <Text style={styles.empty}>Aucun fichier ajouté. Les ressources restent facultatives.</Text>}

        {savedResources.map((resource) => (
          <View key={resource.id} style={styles.resourceCard}>
            <View style={styles.resourceHeading}>
              <MaterialCommunityIcons name={resource.type === 'audio' ? 'music-note' : resource.type === 'pdf' ? 'file-pdf-box' : 'image-outline'} size={22} color={COLORS.accent} />
              <Text numberOfLines={1} style={styles.resourceName}>{resource.nom}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remplacer ${resource.nom}`} onPress={() => void queuePickedFiles(resource.type === 'audio' ? 'audio' : 'score', resource.id)} style={styles.iconButton}>
                <MaterialCommunityIcons name="swap-horizontal" size={19} color={theme.textSecondary} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer ${resource.nom}`} onPress={() => removeSavedResource(resource.id)} style={styles.iconButton}>
                <MaterialCommunityIcons name="delete-outline" size={19} color={ActionColors.danger} />
              </Pressable>
            </View>
            <Field label="Nom" value={resource.nom} onChangeText={(value) => updateSavedResource(resource.id, { nom: value })} placeholder="Nom de la ressource" compact />
            {resource.type === 'audio' ? (
              <>
                <Text style={styles.label}>Rôle audio</Text>
                <ChipRow items={AUDIO_ROLES} value={resource.role_audio ?? 'original'} onSelect={(value) => updateSavedResource(resource.id, { role_audio: value as RoleAudioChant })} />
                {resource.role_audio === 'voix' && <Field label="Partie vocale" value={resource.partie_vocale ?? ''} onChangeText={(value) => updateSavedResource(resource.id, { partie_vocale: value })} placeholder="Soprano, alto, ténor, basse…" compact />}
              </>
            ) : (
              <View style={styles.resourceFields}>
                <Field label="Version" value={resource.version ?? ''} onChangeText={(value) => updateSavedResource(resource.id, { version: value })} placeholder="Version" compact />
                <Field label="Tonalité" value={resource.tonalite ?? ''} onChangeText={(value) => updateSavedResource(resource.id, { tonalite: value })} placeholder="Tonalité" compact />
              </View>
            )}
            <Text style={styles.muted}>{formatBytes(resource.taille_octets)} · {resource.availability === 'missing' ? 'Fichier manquant' : 'Fichier conservé hors connexion'}</Text>
          </View>
        ))}

        {pendingResources.map((resource) => (
          <View key={resource.id} style={styles.resourceCard}>
            <View style={styles.resourceHeading}>
              <MaterialCommunityIcons name={resource.type === 'audio' ? 'music-note' : resource.type === 'pdf' ? 'file-pdf-box' : 'image-outline'} size={22} color={COLORS.accent} />
              <Text numberOfLines={1} style={styles.resourceName}>{resource.name}</Text>
              <Text style={styles.pendingTag}>{resource.replacesId ? 'Remplacement' : 'À importer'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${resource.name}`} onPress={() => setPendingResources((current) => current.filter((item) => item.id !== resource.id))} style={styles.iconButton}>
                <MaterialCommunityIcons name="close" size={19} color={ActionColors.danger} />
              </Pressable>
            </View>
            <Field label="Nom affiché" value={resource.name} onChangeText={(value) => updatePendingResource(resource.id, { name: value })} placeholder="Nom de la ressource" compact />
            {resource.type === 'audio' ? (
              <>
                <Text style={styles.label}>Rôle audio</Text>
                <ChipRow items={AUDIO_ROLES} value={resource.role_audio ?? 'original'} onSelect={(value) => updatePendingResource(resource.id, { role_audio: value as RoleAudioChant })} />
                {resource.role_audio === 'voix' && <Field label="Partie vocale" value={resource.partie_vocale ?? ''} onChangeText={(value) => updatePendingResource(resource.id, { partie_vocale: value })} placeholder="Soprano, alto, ténor, basse…" compact />}
              </>
            ) : (
              <View style={styles.resourceFields}>
                <Field label="Version" value={resource.version ?? ''} onChangeText={(value) => updatePendingResource(resource.id, { version: value })} placeholder="Version" compact />
                <Field label="Tonalité" value={resource.tonalite ?? ''} onChangeText={(value) => updatePendingResource(resource.id, { tonalite: value })} placeholder="Tonalité" compact />
              </View>
            )}
            <Text style={styles.muted}>{formatBytes(resource.size)} · sera copié dans le stockage durable</Text>
          </View>
        ))}
        <Text style={styles.storageNote}>Les fichiers sont copiés dans le stockage documentaire de l’application. Les pistes vocales sont écoutées séparément ; le mixage simultané n’est pas proposé par le lecteur actuel.</Text>
        <ActionButton label={saving ? 'Enregistrement…' : 'Enregistrer le chant'} icon="content-save-outline" onPress={() => void save()} disabled={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Field({ label, value, onChangeText, placeholder, compact = false }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string; compact?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#788397" style={[styles.input, compact && styles.compactInput]} maxLength={180} />
    </View>
  );
}

function ChipRow({ items, value, onSelect }: { items: { value: string; label: string }[]; value: string; onSelect: (value: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((item) => (
        <Pressable key={item.value || 'none'} accessibilityRole="button" accessibilityState={{ selected: value === item.value }} onPress={() => onSelect(item.value)} style={[styles.chip, value === item.value && styles.chipActive]}>
          <Text style={[styles.chipText, value === item.value && styles.chipTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ActionButton({ label, icon, onPress, disabled = false }: { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.actionButton, disabled && styles.disabled]}>
      <MaterialCommunityIcons name={icon} size={18} color={COLORS.accent} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = createThemedStyles({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  back: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  saveButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, backgroundColor: COLORS.accent },
  saveLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  content: { width: '100%', maxWidth: 840, alignSelf: 'center', gap: 12, padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { color: COLORS.muted, fontSize: 12 },
  error: { color: COLORS.accent, fontSize: 14, textAlign: 'center' },
  sectionTitle: { marginTop: 16, marginBottom: 2, color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  field: { flex: 1, gap: 5 },
  fieldLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  input: { minHeight: 44, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9, color: COLORS.ink, backgroundColor: '#FFFFFF', fontSize: 14 },
  compactInput: { minHeight: 38, fontSize: 13 },
  multiline: { minHeight: 148, textAlignVertical: 'top' },
  chords: { minHeight: 92, textAlignVertical: 'top', fontFamily: 'monospace' },
  label: { marginTop: 5, color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'nowrap', gap: 7, paddingVertical: 3 },
  chip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 11, borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, backgroundColor: '#FFFFFF' },
  chipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent },
  chipText: { color: COLORS.ink, fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  inlineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  addSection: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 7 },
  addSectionLabel: { color: COLORS.ink, fontSize: 11, fontWeight: '600' },
  sectionEditor: { gap: 8, padding: 11, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.soft },
  sectionLyrics: { minHeight: 88, textAlignVertical: 'top' },
  resourceFields: { flexDirection: 'row', gap: 8 },
  resourceCard: { gap: 9, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.soft },
  resourceHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resourceName: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  iconButton: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  pendingTag: { color: COLORS.accent, fontSize: 10, fontWeight: '700' },
  importRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: '#FFFFFF' },
  actionLabel: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  empty: { paddingVertical: 18, color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  storageNote: { color: COLORS.muted, fontSize: 11, lineHeight: 16, paddingTop: 4 },
  disabled: { opacity: 0.55 },
});
