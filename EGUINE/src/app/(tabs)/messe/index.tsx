import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Image, KeyboardAvoidingView, Linking, Modal, ScrollView, Share, StatusBar, StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import { showLocalizedAlert } from '@/i18n/alert';
import { LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput } from '@/i18n/localized-components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { goBackSafely } from '@/utils/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useLocalChantSearch } from '@/hooks/use-local-chant-search';
import { recordChantListen, searchChants } from '@/database/chant-database';
import type { Categorie, Celebration, Chant, Variante } from '@/types';
import { ActionColors } from '@/constants/theme';
import { DEFAULT_CELEBRATION_SLOT_IDS, getEffectiveSlotOrder } from '@/utils/celebration-order';
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
  rule: '#E5E5E5',
  gold: '#7A1F3D',
  goldWash: '#FFFFFF',
  teal: '#725A61',
  green: '#7A1F3D',
  purple: '#725A61',
  red: '#7A1F3D',
  pink: '#7A1F3D',
  success: '#52765F',
};

// ============ STRUCTURE LITURGIQUE ============
type MassBlock = {
  id: string;
  label: string;
  color: string;
  parts: MesseSlot[];
};

type MesseSlot = {
  id: string;
  moment: string;
  category: Categorie;
  title: string;
  subtitle: string;
  duration: number;
  custom?: boolean;
};

const MASS_BLOCKS: MassBlock[] = [
  {
    id: 'ouverture',
    label: 'Ouverture',
    color: TOKENS.green,
    parts: [
      { id: 'entree', moment: 'entree', category: 'entree', title: 'Entrée', subtitle: 'Procession & ouverture', duration: 4 },
      { id: 'kyrie', moment: 'liturgie_parole', category: 'kyrie', title: 'Kyrie', subtitle: 'Prière pénitentielle', duration: 2 },
      { id: 'gloria', moment: 'liturgie_parole', category: 'gloria', title: 'Gloria', subtitle: 'Louange et gloire', duration: 3 },
    ],
  },
  {
    id: 'parole',
    label: 'Liturgie de la Parole',
    color: TOKENS.purple,
    parts: [
      { id: 'psaume', moment: 'liturgie_parole', category: 'psaume', title: 'Psaume', subtitle: 'Parole de Dieu', duration: 4 },
      { id: 'acclamation', moment: 'liturgie_parole', category: 'acclamation', title: 'Alléluia', subtitle: 'Acclamation de l’Évangile', duration: 2 },
      { id: 'credo', moment: 'liturgie_parole', category: 'credo', title: 'Credo', subtitle: 'Profession de foi', duration: 3 },
      { id: 'priere_universelle', moment: 'liturgie_parole', category: 'priere_universelle', title: 'Prière universelle', subtitle: 'Intentions de prière', duration: 3 },
    ],
  },
  {
    id: 'eucharistie',
    label: 'Liturgie Eucharistique',
    color: TOKENS.gold,
    parts: [
      { id: 'offertoire', moment: 'liturgie_eucharistique', category: 'offertoire', title: 'Offertoire', subtitle: 'Présentation des dons', duration: 4 },
      { id: 'sanctus', moment: 'liturgie_eucharistique', category: 'sanctus', title: 'Sanctus', subtitle: 'Adoration eucharistique', duration: 3 },
      { id: 'agnus_dei', moment: 'liturgie_eucharistique', category: 'agnus_dei', title: 'Agnus Dei', subtitle: 'Fraction du pain', duration: 2 },
      { id: 'communion', moment: 'communion', category: 'communion', title: 'Communion', subtitle: 'Partage eucharistique', duration: 5 },
      { id: 'action_grace', moment: 'communion', category: 'action_grace', title: 'Action de grâce', subtitle: 'Remerciement', duration: 3 },
    ],
  },
  {
    id: 'envoi',
    label: 'Envoi',
    color: TOKENS.teal,
    parts: [
      { id: 'chant_final', moment: 'envoi', category: 'chant_final', title: 'Chant final', subtitle: 'Mission et sortie', duration: 4 },
    ],
  },
];

const ALL_PARTS = MASS_BLOCKS.flatMap((b) => b.parts);
const getSlotSelectionKey = (slot: MesseSlot) => `slot:${slot.id}`;

type CelebrationSlot = MesseSlot & {
  blockLabel: string;
  color: string;
  selectionKey: string;
  selectedChantIds: string[];
};

type CelebrationQueueItem = Chant & {
  _slot: string;
  _slotId: string;
  _block: string;
  _color: string;
};

type ChantResource = {
  label: string;
  uri: string;
  kind: 'pdf' | 'image' | 'external';
};

function getAudioSources(chant: Chant | undefined) {
  if (!chant) return [];
  const sources = [
    ...(chant.audio_url ? [{ label: 'Version principale', uri: chant.audio_url }] : []),
    ...chant.variantes.flatMap((variant: Variante) =>
      variant.audio_url
        ? [{ label: variant.nom_variante, uri: variant.audio_url }]
        : []
    ),
    ...(chant.ressources
      ?.filter((resource) => resource.type === 'audio')
      .map((resource) => ({ label: resource.nom, uri: resource.uri })) ?? []),
  ];
  return [...new Map(sources.map((source) => [source.uri, source])).values()];
}

function getPartitionResources(chant: Chant | undefined): ChantResource[] {
  if (!chant) return [];
  const resources = [
    ...(chant.partition_url
      ? [{ label: 'Partition principale', uri: chant.partition_url }]
      : []),
    ...chant.variantes.flatMap((variant: Variante) =>
      variant.partition_url
        ? [{ label: `Partition — ${variant.nom_variante}`, uri: variant.partition_url }]
        : []
    ),
    ...(chant.ressources
      ?.filter((resource) => resource.type === 'image' || resource.type === 'pdf')
      .map((resource) => ({ label: resource.nom, uri: resource.uri })) ?? []),
  ];
  return [...new Map(resources.map((resource) => [resource.uri, resource])).values()]
    .map((resource) => {
      const path = resource.uri.split(/[?#]/, 1)[0].toLocaleLowerCase();
      const kind = path.endsWith('.pdf')
        ? 'pdf'
        : /\.(png|jpe?g|gif|webp|svg)$/.test(path)
          ? 'image'
          : 'external';
      return { ...resource, kind };
    });
}

function getCelebrationSlots(
  celebration: Celebration | undefined,
  chants: Chant[]
): CelebrationSlot[] {
  const slots: CelebrationSlot[] = [
    ...MASS_BLOCKS.flatMap((block) =>
      block.parts.map((part) => ({
        ...part,
        blockLabel: block.label,
        color: block.color,
        selectionKey: getSlotSelectionKey(part),
        selectedChantIds: [],
      }))
    ),
    ...(celebration?.customMoments ?? []).map((moment) => {
      const slot: MesseSlot = {
        id: moment.id,
        moment: moment.id,
        category: 'autre',
        title: moment.title,
        subtitle: 'Temps personnalisé',
        duration: 0,
        custom: true,
      };
      return {
        ...slot,
        blockLabel: moment.title,
        color: TOKENS.teal,
        selectionKey: getSlotSelectionKey(slot),
        selectedChantIds: [],
      };
    }),
  ];
  if (!celebration) return slots;

  const saved = celebration.selectedChants;
  const assignedLegacyIds = new Set<string>();
  slots.forEach((slot) => {
    const current = saved[slot.selectionKey]
      ?? (slot.custom ? saved[slot.id] : undefined);
    if (current) slot.selectedChantIds = [...new Set(current)];
  });

  Object.entries(saved).forEach(([legacyMoment, ids]) => {
    if (legacyMoment.startsWith('slot:')) return;
    if (celebration.customMoments?.some((moment) => moment.id === legacyMoment)) return;

    const candidates = slots.filter((slot) => !slot.custom && slot.moment === legacyMoment);
    (ids ?? []).forEach((id) => {
      if (assignedLegacyIds.has(id) || !chants.some((chant) => chant.id === id)) return;
      const chant = chants.find((item) => item.id === id);
      const available = candidates.filter((slot) => saved[slot.selectionKey] === undefined);
      const target = available.find((slot) => slot.category === chant?.categorie) ?? available[0];
      if (target) {
        target.selectedChantIds.push(id);
        assignedLegacyIds.add(id);
      }
    });
  });

  slots.forEach((slot) => {
    slot.selectedChantIds = slot.selectedChantIds.filter((id) =>
      chants.some((chant) => chant.id === id)
    );
  });
  return slots;
}

const LANG_LABELS: Record<string, string> = {
  fr: 'Français', la: 'Latin', es: 'Espagnol', soussou: 'Soussou', poular: 'Poular', malinke: 'Malinké',
};

const CATEGORIE_LABELS: Record<string, string> = {
  entree: 'Entrée', kyrie: 'Kyrie', gloria: 'Gloria', psaume: 'Psaume',
  acclamation: 'Acclamation', offertoire: 'Offertoire', sanctus: 'Sanctus',
  agnus_dei: 'Agnus Dei', communion: 'Communion', action_grace: 'Action de grâce',
  chant_final: 'Chant final', louange: 'Louange', adoration: 'Adoration',
  penitence: 'Pénitence', marial: 'Marial', funerailles: 'Funérailles',
  autre: 'Autre',
};

// ============ CALENDRIER LITURGIQUE 2026 ============
type LiturgicalSeason =
  | 'avent' | 'noel' | 'careme' | 'triduum_pascal'
  | 'temps_pascal' | 'temps_ordinaire';

type LiturgicalColor = 'purple' | 'white' | 'red' | 'green' | 'rose';

type LiturgicalDay = {
  season: LiturgicalSeason;
  seasonLabel: string;
  color: LiturgicalColor;
  week: number;
  theme: string;
  themeLabel: string;
  keywords: string[];
  gospelRef: string;
  gospelSummary: string;
  suggestedCategories: string[];
};

const LITURGICAL_CALENDAR: Record<string, LiturgicalDay> = {
  '2026-01-01': {
    season: 'noel', seasonLabel: 'Sainte Marie, Mère de Dieu',
    color: 'white', week: 1,
    theme: 'marie', themeLabel: 'Marie, Mère de Dieu',
    keywords: ['marie', 'mère', 'paix', 'nouvelle année'],
    gospelRef: 'Luc 2, 16-21',
    gospelSummary: 'Les bergers trouvent Marie, Joseph et l’enfant.',
    suggestedCategories: ['marial', 'communion'],
  },
  '2026-01-04': {
    season: 'noel', seasonLabel: 'Épiphanie du Seigneur',
    color: 'white', week: 2,
    theme: 'lumiere', themeLabel: 'L’Épiphanie',
    keywords: ['lumière', 'étoile', 'rois', 'adoration'],
    gospelRef: 'Matthieu 2, 1-12',
    gospelSummary: 'Les mages suivent l’étoile jusqu’à Bethléem.',
    suggestedCategories: ['gloria', 'offertoire', 'communion'],
  },
  '2026-01-11': {
    season: 'temps_ordinaire', seasonLabel: 'Baptême du Seigneur',
    color: 'white', week: 1,
    theme: 'bapteme', themeLabel: 'Baptême du Seigneur',
    keywords: ['eau', 'esprit', 'fils bien-aimé'],
    gospelRef: 'Luc 3, 15-16.21-22',
    gospelSummary: 'Jésus est baptisé dans le Jourdain.',
    suggestedCategories: ['entree', 'psaume', 'communion'],
  },
  '2026-01-18': {
    season: 'temps_ordinaire', seasonLabel: '2e dimanche du Temps ordinaire',
    color: 'green', week: 2,
    theme: 'appel', themeLabel: 'L’appel des disciples',
    keywords: ['appel', 'suivre', 'agneau', 'venir'],
    gospelRef: 'Jean 1, 29-34',
    gospelSummary: 'Jean-Baptiste désigne Jésus comme Agneau de Dieu.',
    suggestedCategories: ['entree', 'acclamation', 'communion'],
  },
  '2026-01-25': {
    season: 'temps_ordinaire', seasonLabel: '3e dimanche du Temps ordinaire',
    color: 'green', week: 3,
    theme: 'mission', themeLabel: 'La mission',
    keywords: ['mission', 'bonne nouvelle', 'proclamation'],
    gospelRef: 'Luc 1, 1-4 ; 4, 14-21',
    gospelSummary: 'Jésus proclame sa mission à Nazareth.',
    suggestedCategories: ['entree', 'acclamation', 'chant_final'],
  },
  '2026-02-01': {
    season: 'temps_ordinaire', seasonLabel: '4e dimanche du Temps ordinaire',
    color: 'green', week: 4,
    theme: 'confiance', themeLabel: 'La confiance en Dieu',
    keywords: ['confiance', 'prophète', 'rejet', 'foi'],
    gospelRef: 'Luc 4, 21-30',
    gospelSummary: 'Jésus est rejeté à Nazareth.',
    suggestedCategories: ['entree', 'psaume', 'communion'],
  },
  '2026-02-08': {
    season: 'temps_ordinaire', seasonLabel: '5e dimanche du Temps ordinaire',
    color: 'green', week: 5,
    theme: 'vocation', themeLabel: 'La vocation',
    keywords: ['vocation', 'pêcheur', 'appel', 'peur'],
    gospelRef: 'Luc 5, 1-11',
    gospelSummary: 'Jésus appelle Pierre, pêcheur d’hommes.',
    suggestedCategories: ['entree', 'acclamation', 'chant_final'],
  },
  '2026-02-15': {
    season: 'temps_ordinaire', seasonLabel: '6e dimanche du Temps ordinaire',
    color: 'green', week: 6,
    theme: 'bonheur', themeLabel: 'Les Béatitudes',
    keywords: ['béatitudes', 'bonheur', 'pauvres', 'joie'],
    gospelRef: 'Luc 6, 17.20-26',
    gospelSummary: 'Jésus proclame les Béatitudes.',
    suggestedCategories: ['gloria', 'communion'],
  },
  '2026-02-22': {
    season: 'careme', seasonLabel: '1er dimanche de Carême',
    color: 'purple', week: 1,
    theme: 'penitence', themeLabel: 'La tentation au désert',
    keywords: ['désert', 'jeûne', 'prière', 'conversion'],
    gospelRef: 'Luc 4, 1-13',
    gospelSummary: 'Jésus est tenté au désert pendant 40 jours.',
    suggestedCategories: ['penitence', 'kyrie', 'communion'],
  },
  '2026-03-01': {
    season: 'careme', seasonLabel: '2e dimanche de Carême',
    color: 'purple', week: 2,
    theme: 'transfiguration', themeLabel: 'La Transfiguration',
    keywords: ['lumière', 'gloire', 'écoute', 'montagne'],
    gospelRef: 'Luc 9, 28b-36',
    gospelSummary: 'Jésus est transfiguré devant Pierre, Jacques et Jean.',
    suggestedCategories: ['psaume', 'acclamation', 'communion'],
  },
  '2026-03-08': {
    season: 'careme', seasonLabel: '3e dimanche de Carême',
    color: 'purple', week: 3,
    theme: 'conversion', themeLabel: 'Le figuier stérile',
    keywords: ['conversion', 'patience', 'fruit', 'pardon'],
    gospelRef: 'Luc 13, 1-9',
    gospelSummary: 'Parabole du figuier stérile.',
    suggestedCategories: ['penitence', 'communion'],
  },
  '2026-03-15': {
    season: 'careme', seasonLabel: '4e dimanche de Carême',
    color: 'rose', week: 4,
    theme: 'joie', themeLabel: 'Le fils prodigue (Laetare)',
    keywords: ['pardon', 'miséricorde', 'retour', 'fête'],
    gospelRef: 'Luc 15, 1-3.11-32',
    gospelSummary: 'Parabole du fils prodigue.',
    suggestedCategories: ['gloria', 'communion'],
  },
  '2026-03-22': {
    season: 'careme', seasonLabel: '5e dimanche de Carême',
    color: 'purple', week: 5,
    theme: 'esperance', themeLabel: 'La femme adultère',
    keywords: ['pardon', 'miséricorde', 'nouvelle vie'],
    gospelRef: 'Jean 8, 1-11',
    gospelSummary: 'Jésus pardonne à la femme adultère.',
    suggestedCategories: ['penitence', 'communion'],
  },
  '2026-03-29': {
    season: 'careme', seasonLabel: 'Dimanche des Rameaux',
    color: 'red', week: 6,
    theme: 'passion', themeLabel: 'La Passion du Seigneur',
    keywords: ['hosanna', 'passion', 'croix', 'sacrifice'],
    gospelRef: 'Luc 22, 14 — 23, 56',
    gospelSummary: 'Récit de la Passion selon saint Luc.',
    suggestedCategories: ['entree', 'psaume', 'communion'],
  },
  '2026-04-02': {
    season: 'triduum_pascal', seasonLabel: 'Jeudi Saint',
    color: 'white', week: 1,
    theme: 'eucharistie', themeLabel: 'La Cène du Seigneur',
    keywords: ['eucharistie', 'lavement des pieds', 'service', 'amour'],
    gospelRef: 'Jean 13, 1-15',
    gospelSummary: 'Jésus lave les pieds de ses disciples.',
    suggestedCategories: ['gloria', 'communion'],
  },
  '2026-04-03': {
    season: 'triduum_pascal', seasonLabel: 'Vendredi Saint',
    color: 'red', week: 1,
    theme: 'croix', themeLabel: 'La Passion du Seigneur',
    keywords: ['croix', 'souffrance', 'sacrifice', 'amour'],
    gospelRef: 'Jean 18, 1 — 19, 42',
    gospelSummary: 'Passion et mort de Jésus sur la croix.',
    suggestedCategories: ['psaume', 'communion'],
  },
  '2026-04-04': {
    season: 'triduum_pascal', seasonLabel: 'Vigile pascale',
    color: 'white', week: 1,
    theme: 'resurrection', themeLabel: 'La Résurrection',
    keywords: ['lumière', 'alléluia', 'résurrection', 'vie'],
    gospelRef: 'Luc 24, 1-12',
    gospelSummary: 'Les femmes trouvent le tombeau vide.',
    suggestedCategories: ['gloria', 'acclamation', 'communion'],
  },
  '2026-04-05': {
    season: 'temps_pascal', seasonLabel: 'Dimanche de Pâques',
    color: 'white', week: 1,
    theme: 'resurrection', themeLabel: 'Pâques — Résurrection du Seigneur',
    keywords: ['alléluia', 'joie', 'victoire', 'vie'],
    gospelRef: 'Jean 20, 1-9',
    gospelSummary: 'Le tombeau est vide, Jésus est ressuscité.',
    suggestedCategories: ['gloria', 'acclamation', 'chant_final'],
  },
  '2026-04-12': {
    season: 'temps_pascal', seasonLabel: '2e dimanche de Pâques',
    color: 'white', week: 2,
    theme: 'foi', themeLabel: 'La miséricorde (Thomas)',
    keywords: ['foi', 'miséricorde', 'doute', 'paix'],
    gospelRef: 'Jean 20, 19-31',
    gospelSummary: 'Jésus apparaît à Thomas.',
    suggestedCategories: ['gloria', 'communion'],
  },
  '2026-04-19': {
    season: 'temps_pascal', seasonLabel: '3e dimanche de Pâques',
    color: 'white', week: 3,
    theme: 'mission', themeLabel: 'Sur le lac de Tibériade',
    keywords: ['mission', 'pêche', 'amour', 'berger'],
    gospelRef: 'Jean 21, 1-19',
    gospelSummary: 'Jésus apparaît au bord du lac.',
    suggestedCategories: ['entree', 'acclamation', 'chant_final'],
  },
  '2026-04-26': {
    season: 'temps_pascal', seasonLabel: '4e dimanche de Pâques',
    color: 'white', week: 4,
    theme: 'berger', themeLabel: 'Le Bon Pasteur',
    keywords: ['berger', 'brebis', 'voix', 'vie'],
    gospelRef: 'Jean 10, 27-30',
    gospelSummary: 'Jésus est le Bon Pasteur.',
    suggestedCategories: ['entree', 'psaume', 'communion'],
  },
  '2026-05-03': {
    season: 'temps_pascal', seasonLabel: '5e dimanche de Pâques',
    color: 'white', week: 5,
    theme: 'amour', themeLabel: 'Le commandement de l’amour',
    keywords: ['amour', 'gloire', 'commandement'],
    gospelRef: 'Jean 13, 31-33a.34-35',
    gospelSummary: 'Aimez-vous les uns les autres.',
    suggestedCategories: ['gloria', 'communion'],
  },
  '2026-05-10': {
    season: 'temps_pascal', seasonLabel: '6e dimanche de Pâques',
    color: 'white', week: 6,
    theme: 'paix', themeLabel: 'Le don de la paix',
    keywords: ['paix', 'esprit', 'amour', 'joie'],
    gospelRef: 'Jean 14, 23-29',
    gospelSummary: 'Jésus promet l’Esprit Saint.',
    suggestedCategories: ['gloria', 'communion'],
  },
  '2026-05-14': {
    season: 'temps_pascal', seasonLabel: 'Ascension du Seigneur',
    color: 'white', week: 6,
    theme: 'mission', themeLabel: 'L’Ascension',
    keywords: ['ascension', 'mission', 'gloire', 'ciel'],
    gospelRef: 'Luc 24, 46-53',
    gospelSummary: 'Jésus monte au ciel.',
    suggestedCategories: ['gloria', 'chant_final'],
  },
  '2026-05-17': {
    season: 'temps_pascal', seasonLabel: '7e dimanche de Pâques',
    color: 'white', week: 7,
    theme: 'unite', themeLabel: 'L’unité',
    keywords: ['unité', 'prière', 'gloire'],
    gospelRef: 'Jean 17, 20-26',
    gospelSummary: 'Jésus prie pour l’unité de ses disciples.',
    suggestedCategories: ['gloria', 'communion'],
  },
  '2026-05-24': {
    season: 'temps_pascal', seasonLabel: 'Pentecôte',
    color: 'red', week: 8,
    theme: 'esprit', themeLabel: 'La Pentecôte',
    keywords: ['esprit', 'feu', 'langues', 'mission'],
    gospelRef: 'Jean 14, 15-16.23b-26',
    gospelSummary: 'L’Esprit Saint descend sur les apôtres.',
    suggestedCategories: ['gloria', 'acclamation', 'chant_final'],
  },
  '2026-05-31': {
    season: 'temps_ordinaire', seasonLabel: 'Sainte Trinité',
    color: 'white', week: 1,
    theme: 'trinite', themeLabel: 'La Sainte Trinité',
    keywords: ['trinité', 'père', 'fils', 'esprit', 'amour'],
    gospelRef: 'Jean 16, 12-15',
    gospelSummary: 'Le mystère de la Sainte Trinité.',
    suggestedCategories: ['gloria', 'sanctus', 'communion'],
  },
  '2026-06-07': {
    season: 'temps_ordinaire', seasonLabel: 'Saint-Sacrement',
    color: 'white', week: 2,
    theme: 'eucharistie', themeLabel: 'Fête du Saint-Sacrement',
    keywords: ['eucharistie', 'pain', 'corps', 'sang'],
    gospelRef: 'Luc 9, 11b-17',
    gospelSummary: 'Multiplication des pains.',
    suggestedCategories: ['sanctus', 'communion', 'adoration'],
  },
  '2026-06-14': {
    season: 'temps_ordinaire', seasonLabel: '11e dimanche du Temps ordinaire',
    color: 'green', week: 11,
    theme: 'pardon', themeLabel: 'Le pardon',
    keywords: ['pardon', 'miséricorde', 'amour'],
    gospelRef: 'Luc 7, 36 — 8, 3',
    gospelSummary: 'La femme pécheresse est pardonnée.',
    suggestedCategories: ['penitence', 'communion'],
  },
  '2026-06-21': {
    season: 'temps_ordinaire', seasonLabel: '12e dimanche du Temps ordinaire',
    color: 'green', week: 12,
    theme: 'foi', themeLabel: 'La foi',
    keywords: ['foi', 'croix', 'suivre'],
    gospelRef: 'Luc 9, 18-24',
    gospelSummary: 'Confession de Pierre.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-06-28': {
    season: 'temps_ordinaire', seasonLabel: '13e dimanche du Temps ordinaire',
    color: 'green', week: 13,
    theme: 'vocation', themeLabel: 'Suivre le Christ',
    keywords: ['vocation', 'suivre', 'route'],
    gospelRef: 'Luc 9, 51-62',
    gospelSummary: 'Jésus prend résolument le chemin de Jérusalem.',
    suggestedCategories: ['entree', 'acclamation', 'chant_final'],
  },
  '2026-07-05': {
    season: 'temps_ordinaire', seasonLabel: '14e dimanche du Temps ordinaire',
    color: 'green', week: 14,
    theme: 'mission', themeLabel: 'L’envoi en mission',
    keywords: ['mission', 'envoi', 'paix', 'moisson'],
    gospelRef: 'Luc 10, 1-12.17-20',
    gospelSummary: 'Jésus envoie les 72 disciples.',
    suggestedCategories: ['entree', 'acclamation', 'chant_final'],
  },
  '2026-07-12': {
    season: 'temps_ordinaire', seasonLabel: '15e dimanche du Temps ordinaire',
    color: 'green', week: 15,
    theme: 'amour', themeLabel: 'Le bon Samaritain',
    keywords: ['amour', 'prochain', 'miséricorde', 'service'],
    gospelRef: 'Luc 10, 25-37',
    gospelSummary: 'Parabole du bon Samaritain.',
    suggestedCategories: ['gloria', 'communion'],
  },
  '2026-07-19': {
    season: 'temps_ordinaire', seasonLabel: '16e dimanche du Temps ordinaire',
    color: 'green', week: 16,
    theme: 'priere', themeLabel: 'Marthe et Marie',
    keywords: ['prière', 'écoute', 'service', 'présence'],
    gospelRef: 'Luc 10, 38-42',
    gospelSummary: 'Marthe et Marie reçoivent Jésus.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-07-26': {
    season: 'temps_ordinaire', seasonLabel: '17e dimanche du Temps ordinaire',
    color: 'green', week: 17,
    theme: 'priere', themeLabel: 'Le Notre Père',
    keywords: ['prière', 'père', 'pardon', 'don'],
    gospelRef: 'Luc 11, 1-13',
    gospelSummary: 'Jésus apprend à prier à ses disciples.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-08-02': {
    season: 'temps_ordinaire', seasonLabel: '18e dimanche du Temps ordinaire',
    color: 'green', week: 18,
    theme: 'detachement', themeLabel: 'Les vraies richesses',
    keywords: ['détachement', 'richesses', 'trésor'],
    gospelRef: 'Luc 12, 13-21',
    gospelSummary: 'Parabole du riche insensé.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-08-09': {
    season: 'temps_ordinaire', seasonLabel: '19e dimanche du Temps ordinaire',
    color: 'green', week: 19,
    theme: 'vigilance', themeLabel: 'Veiller',
    keywords: ['vigilance', 'attente', 'foi'],
    gospelRef: 'Luc 12, 32-48',
    gospelSummary: 'Parabole des serviteurs vigilants.',
    suggestedCategories: ['entree', 'acclamation'],
  },
  '2026-08-15': {
    season: 'temps_ordinaire', seasonLabel: 'Assomption de la Vierge Marie',
    color: 'white', week: 20,
    theme: 'marie', themeLabel: 'L’Assomption',
    keywords: ['marie', 'assomption', 'gloire', 'reine'],
    gospelRef: 'Luc 1, 39-56',
    gospelSummary: 'Le Magnificat.',
    suggestedCategories: ['marial', 'gloria', 'communion'],
  },
  '2026-08-16': {
    season: 'temps_ordinaire', seasonLabel: '20e dimanche du Temps ordinaire',
    color: 'green', week: 20,
    theme: 'unite', themeLabel: 'Le feu de la division',
    keywords: ['unité', 'feu', 'division', 'foi'],
    gospelRef: 'Luc 12, 49-53',
    gospelSummary: 'Jésus apporte le feu sur la terre.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-08-23': {
    season: 'temps_ordinaire', seasonLabel: '21e dimanche du Temps ordinaire',
    color: 'green', week: 21,
    theme: 'salut', themeLabel: 'La porte étroite',
    keywords: ['salut', 'porte', 'effort'],
    gospelRef: 'Luc 13, 22-30',
    gospelSummary: 'Efforcez-vous d’entrer par la porte étroite.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-08-30': {
    season: 'temps_ordinaire', seasonLabel: '22e dimanche du Temps ordinaire',
    color: 'green', week: 22,
    theme: 'humilite', themeLabel: 'L’humilité',
    keywords: ['humilité', 'invité', 'service'],
    gospelRef: 'Luc 14, 1.7-14',
    gospelSummary: 'Parabole des places d’honneur.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-09-06': {
    season: 'temps_ordinaire', seasonLabel: '23e dimanche du Temps ordinaire',
    color: 'green', week: 23,
    theme: 'disciple', themeLabel: 'Renoncer pour suivre',
    keywords: ['disciple', 'croix', 'renoncement'],
    gospelRef: 'Luc 14, 25-33',
    gospelSummary: 'Renoncer à tout pour suivre Jésus.',
    suggestedCategories: ['entree', 'chant_final'],
  },
  '2026-09-13': {
    season: 'temps_ordinaire', seasonLabel: '24e dimanche du Temps ordinaire',
    color: 'green', week: 24,
    theme: 'pardon', themeLabel: 'Le pardon sans limite',
    keywords: ['pardon', 'miséricorde', '70 fois 7'],
    gospelRef: 'Luc 15, 1-32',
    gospelSummary: 'Paraboles de la miséricorde.',
    suggestedCategories: ['penitence', 'communion'],
  },
  '2026-09-20': {
    season: 'temps_ordinaire', seasonLabel: '25e dimanche du Temps ordinaire',
    color: 'green', week: 25,
    theme: 'service', themeLabel: 'Servir Dieu ou l’argent',
    keywords: ['service', 'argent', 'fidélité'],
    gospelRef: 'Luc 16, 1-13',
    gospelSummary: 'Parabole de l’intendant fidèle.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-09-27': {
    season: 'temps_ordinaire', seasonLabel: '26e dimanche du Temps ordinaire',
    color: 'green', week: 26,
    theme: 'solidarite', themeLabel: 'Le mauvais riche',
    keywords: ['solidarité', 'pauvres', 'partage'],
    gospelRef: 'Luc 16, 19-31',
    gospelSummary: 'Parabole du riche et de Lazare.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-10-04': {
    season: 'temps_ordinaire', seasonLabel: '27e dimanche du Temps ordinaire',
    color: 'green', week: 27,
    theme: 'foi', themeLabel: 'La foi qui sauve',
    keywords: ['foi', 'service', 'gratuité'],
    gospelRef: 'Luc 17, 5-10',
    gospelSummary: 'Si vous aviez la foi…',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-10-11': {
    season: 'temps_ordinaire', seasonLabel: '28e dimanche du Temps ordinaire',
    color: 'green', week: 28,
    theme: 'gratitude', themeLabel: 'Les dix lépreux',
    keywords: ['gratitude', 'merci', 'guérison'],
    gospelRef: 'Luc 17, 11-19',
    gospelSummary: 'Un seul revient remercier Jésus.',
    suggestedCategories: ['action_grace', 'communion'],
  },
  '2026-10-18': {
    season: 'temps_ordinaire', seasonLabel: '29e dimanche du Temps ordinaire',
    color: 'green', week: 29,
    theme: 'priere', themeLabel: 'Prier sans se lasser',
    keywords: ['prière', 'persévérance', 'justice'],
    gospelRef: 'Luc 18, 1-8',
    gospelSummary: 'Parabole de la veuve insistante.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-10-25': {
    season: 'temps_ordinaire', seasonLabel: '30e dimanche du Temps ordinaire',
    color: 'green', week: 30,
    theme: 'humilite', themeLabel: 'Le pharisien et le publicain',
    keywords: ['humilité', 'prière', 'justification'],
    gospelRef: 'Luc 18, 9-14',
    gospelSummary: 'Parabole du pharisien et du publicain.',
    suggestedCategories: ['penitence', 'communion'],
  },
  '2026-11-01': {
    season: 'temps_ordinaire', seasonLabel: 'Toussaint',
    color: 'white', week: 31,
    theme: 'saintete', themeLabel: 'Tous les Saints',
    keywords: ['sainteté', 'ciel', 'béatitudes', 'gloire'],
    gospelRef: 'Matthieu 5, 1-12a',
    gospelSummary: 'Les Béatitudes.',
    suggestedCategories: ['gloria', 'sanctus', 'communion'],
  },
  '2026-11-08': {
    season: 'temps_ordinaire', seasonLabel: '32e dimanche du Temps ordinaire',
    color: 'green', week: 32,
    theme: 'resurrection', themeLabel: 'La résurrection',
    keywords: ['résurrection', 'vie éternelle', 'Dieu des vivants'],
    gospelRef: 'Luc 20, 27-38',
    gospelSummary: 'Débat sur la résurrection.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-11-15': {
    season: 'temps_ordinaire', seasonLabel: '33e dimanche du Temps ordinaire',
    color: 'green', week: 33,
    theme: 'perseverance', themeLabel: 'La persévérance',
    keywords: ['persévérance', 'épreuve', 'témoignage'],
    gospelRef: 'Luc 21, 5-19',
    gospelSummary: 'Discours sur la fin des temps.',
    suggestedCategories: ['entree', 'communion'],
  },
  '2026-11-22': {
    season: 'temps_ordinaire', seasonLabel: 'Christ Roi de l’Univers',
    color: 'white', week: 34,
    theme: 'royaume', themeLabel: 'Le Christ Roi',
    keywords: ['roi', 'royaume', 'gloire', 'croix'],
    gospelRef: 'Luc 23, 35-43',
    gospelSummary: 'Jésus est crucifié, Roi de l’Univers.',
    suggestedCategories: ['gloria', 'sanctus', 'chant_final'],
  },
  '2026-11-29': {
    season: 'avent', seasonLabel: '1er dimanche de l’Avent',
    color: 'purple', week: 1,
    theme: 'attente', themeLabel: 'Veiller dans l’attente',
    keywords: ['attente', 'veille', 'avent', 'espérance'],
    gospelRef: 'Luc 21, 25-28.34-36',
    gospelSummary: 'Restez éveillés, priez en tout temps.',
    suggestedCategories: ['entree', 'psaume', 'communion'],
  },
  '2026-12-06': {
    season: 'avent', seasonLabel: '2e dimanche de l’Avent',
    color: 'purple', week: 2,
    theme: 'preparation', themeLabel: 'Préparer le chemin',
    keywords: ['préparation', 'chemin', 'conversion'],
    gospelRef: 'Luc 3, 1-6',
    gospelSummary: 'Jean-Baptiste prépare le chemin du Seigneur.',
    suggestedCategories: ['penitence', 'communion'],
  },
  '2026-12-13': {
    season: 'avent', seasonLabel: '3e dimanche de l’Avent',
    color: 'rose', week: 3,
    theme: 'joie', themeLabel: 'Dimanche de la joie (Gaudete)',
    keywords: ['joie', 'espérance', 'attente'],
    gospelRef: 'Luc 3, 10-18',
    gospelSummary: 'Jean-Baptiste annonce la Bonne Nouvelle.',
    suggestedCategories: ['gloria', 'communion'],
  },
  '2026-12-20': {
    season: 'avent', seasonLabel: '4e dimanche de l’Avent',
    color: 'purple', week: 4,
    theme: 'visitation', themeLabel: 'La Visitation',
    keywords: ['visitation', 'marie', 'joie', 'accueil'],
    gospelRef: 'Luc 1, 39-45',
    gospelSummary: 'Marie visite Élisabeth.',
    suggestedCategories: ['marial', 'communion'],
  },
  '2026-12-25': {
    season: 'noel', seasonLabel: 'Nativité du Seigneur',
    color: 'white', week: 1,
    theme: 'noel', themeLabel: 'Noël — Naissance de Jésus',
    keywords: ['noël', 'naissance', 'lumière', 'paix'],
    gospelRef: 'Luc 2, 1-14',
    gospelSummary: 'Naissance de Jésus à Bethléem.',
    suggestedCategories: ['gloria', 'sanctus', 'communion'],
  },
  '2026-12-27': {
    season: 'noel', seasonLabel: 'Sainte Famille',
    color: 'white', week: 1,
    theme: 'famille', themeLabel: 'La Sainte Famille',
    keywords: ['famille', 'marie', 'joseph', 'jésus'],
    gospelRef: 'Luc 2, 41-52',
    gospelSummary: 'Jésus retrouvé au Temple.',
    suggestedCategories: ['marial', 'communion'],
  },
};

function getLiturgicalDay(date: string): LiturgicalDay {
  return LITURGICAL_CALENDAR[date] ?? {
    season: 'temps_ordinaire',
    seasonLabel: 'Temps ordinaire',
    color: 'green',
    week: 1,
    theme: 'esperance',
    themeLabel: 'Espérance',
    keywords: ['paix', 'joie', 'foi'],
    gospelRef: '',
    gospelSummary: '',
    suggestedCategories: ['entree', 'psaume', 'communion'],
  };
}

// ============ MOTEUR DE GÉNÉRATION ============
type CelebrationStyle = 'traditionnel' | 'contemporain' | 'guineen';
type LanguageMode = 'fr' | 'local' | 'mix';

type SuggestedSlot = {
  partId: string;
  moment: string;
  category: Categorie;
  title: string;
  chant: Chant | null;
  alternatives: Chant[];
  reason: string;
  score: number;
};

type SuggestedProgram = {
  slots: SuggestedSlot[];
  day: LiturgicalDay;
  estimatedMin: number;
  langueBreakdown: Record<string, number>;
  newSongsCount: number;
};

const THEME_BOOST: Record<string, Partial<Record<Categorie, number>>> = {
  transfiguration: { psaume: 20, acclamation: 15, communion: 10, gloria: 15 },
  penitence: { penitence: 30, kyrie: 20, communion: 10 },
  conversion: { penitence: 25, kyrie: 15, communion: 10 },
  joie: { louange: 30, gloria: 25, chant_final: 15 },
  esperance: { louange: 20, communion: 15, chant_final: 10 },
  mission: { chant_final: 25, louange: 15, entree: 10 },
  marie: { marial: 35, communion: 10 },
  noel: { gloria: 30, sanctus: 15, communion: 15 },
  resurrection: { gloria: 30, acclamation: 25, chant_final: 20 },
  passion: { psaume: 20, communion: 15, penitence: 10 },
  croix: { psaume: 20, communion: 15, penitence: 10 },
  eucharistie: { sanctus: 30, communion: 25, adoration: 20 },
  esprit: { gloria: 25, acclamation: 20, chant_final: 15 },
  berger: { entree: 15, psaume: 20, communion: 15 },
  pardon: { penitence: 25, communion: 15 },
  priere: { entree: 10, psaume: 15, communion: 10 },
  foi: { gloria: 15, communion: 15 },
  amour: { gloria: 15, communion: 15, chant_final: 10 },
  paix: { communion: 15, chant_final: 15 },
  unite: { gloria: 15, communion: 15 },
  trinite: { gloria: 25, sanctus: 20, communion: 15 },
  saintete: { gloria: 20, sanctus: 20, communion: 15 },
  royaume: { gloria: 25, sanctus: 20, chant_final: 15 },
  attente: { entree: 15, psaume: 15, communion: 10 },
  preparation: { penitence: 20, communion: 10 },
  visitation: { marial: 25, communion: 10 },
  famille: { marial: 20, communion: 10 },
  bapteme: { entree: 15, psaume: 15, communion: 10 },
  appel: { entree: 15, acclamation: 15, chant_final: 10 },
  vocation: { entree: 15, acclamation: 10, chant_final: 15 },
  bonheur: { gloria: 20, communion: 15 },
  confiance: { entree: 15, communion: 10 },
  salut: { communion: 15 },
  humilite: { penitence: 15, communion: 10 },
  disciple: { entree: 10, chant_final: 15 },
  service: { communion: 15, chant_final: 10 },
  solidarite: { communion: 15 },
  gratitude: { action_grace: 30, communion: 10 },
  detachement: { communion: 10 },
  vigilance: { entree: 15, acclamation: 10 },
  perseverance: { communion: 15 },
  lumiere: { gloria: 20, acclamation: 15 },
};

const KEYWORD_BOOST: Record<string, Partial<Record<Categorie, number>>> = {
  lumière: { gloria: 15, acclamation: 10 },
  gloire: { gloria: 20, sanctus: 15 },
  écoute: { psaume: 15, acclamation: 10 },
  pain: { communion: 25, offertoire: 10 },
  paix: { communion: 15, chant_final: 10 },
  joie: { gloria: 15, louange: 15 },
  alléluia: { acclamation: 30, gloria: 15 },
  pardon: { penitence: 20, communion: 15 },
  marie: { marial: 30 },
  croix: { psaume: 15, communion: 10 },
  esprit: { gloria: 15, acclamation: 15 },
  amour: { gloria: 15, communion: 15 },
  mission: { chant_final: 20 },
  prière: { psaume: 10, communion: 10 },
  conversion: { penitence: 25 },
  foi: { gloria: 15, communion: 10 },
  noël: { gloria: 25, communion: 15 },
  résurrection: { gloria: 25, acclamation: 20 },
  eucharistie: { sanctus: 25, communion: 20 },
  désert: { penitence: 20 },
  jeûne: { penitence: 20 },
};

const STYLE_WEIGHTS: Record<CelebrationStyle, Record<Categorie, number>> = {
  traditionnel: {
    entree: 30, kyrie: 25, gloria: 25, psaume: 30, acclamation: 25,
    credo: 20, priere_universelle: 10,
    offertoire: 25, sanctus: 30, agnus_dei: 30, communion: 30,
    action_grace: 20, chant_final: 20, louange: 10, adoration: 15,
    penitence: 15, marial: 15, funerailles: 0, autre: 5,
  },
  contemporain: {
    entree: 25, kyrie: 15, gloria: 20, psaume: 20, acclamation: 30,
    credo: 15, priere_universelle: 15,
    offertoire: 30, sanctus: 25, agnus_dei: 20, communion: 25,
    action_grace: 30, chant_final: 35, louange: 35, adoration: 30,
    penitence: 10, marial: 15, funerailles: 0, autre: 5,
  },
  guineen: {
    entree: 30, kyrie: 30, gloria: 30, psaume: 25, acclamation: 30,
    credo: 25, priere_universelle: 20,
    offertoire: 25, sanctus: 30, agnus_dei: 30, communion: 30,
    action_grace: 25, chant_final: 30, louange: 30, adoration: 25,
    penitence: 20, marial: 20, funerailles: 0, autre: 5,
  },
};

function scoreChant(
  chant: Chant,
  targetCategory: Categorie,
  day: LiturgicalDay,
  style: CelebrationStyle,
  languageMode: LanguageMode
): number {
  let score = 0;

  if (chant.categorie === targetCategory) score += 100;
  score += STYLE_WEIGHTS[style][chant.categorie] ?? 0;

  const themeBoost = THEME_BOOST[day.theme]?.[chant.categorie] ?? 0;
  score += themeBoost;

  if (chant.tags && day.keywords) {
    day.keywords.forEach((kw) => {
      const kwBoost = KEYWORD_BOOST[kw]?.[chant.categorie] ?? 0;
      score += kwBoost;
      if (chant.tags.some((t) => t.nom.toLowerCase().includes(kw.toLowerCase()))) {
        score += 20;
      }
    });
  }

  if (chant.temps_liturgique && chant.temps_liturgique === day.season) {
    score += 30;
  }

  if (languageMode === 'fr' && chant.langue === 'fr') score += 50;
  if (languageMode === 'local' && chant.langue !== 'fr') score += 50;
  if (languageMode === 'mix') score += 20;

  score += Math.min(chant.nombre_vues ?? chant.vues ?? 0, 30);

  return score;
}

function explainChoice(chant: Chant, category: Categorie, day: LiturgicalDay): string {
  if (chant.categorie === category) return 'Adapté à ce moment';
  if (chant.temps_liturgique === day.season) return `Adapté au ${day.seasonLabel}`;
  if ((chant.nombre_vues ?? 0) > 20) return 'Populaire dans le répertoire';
  if (day.theme) return `Thème : ${day.themeLabel}`;
  return 'Suggestion du moteur';
}

function generateCelebration(
  date: string,
  chants: Chant[],
  style: CelebrationStyle,
  languageMode: LanguageMode
): SuggestedProgram {
  const day = getLiturgicalDay(date);
  const published = chants.filter((c) => c.publie);

  const usedIds = new Set<string>();
  const slots: SuggestedSlot[] = [];

  for (const slotDef of ALL_PARTS) {
    const scored = published
      .filter((c) => !usedIds.has(c.id))
      .map((chant) => ({
        chant,
        score: scoreChant(chant, slotDef.category, day, style, languageMode),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best) usedIds.add(best.chant.id);

    slots.push({
      partId: slotDef.id,
      moment: slotDef.moment,
      category: slotDef.category,
      title: slotDef.title,
      chant: best?.chant ?? null,
      alternatives: scored.slice(1, 4).map((s) => s.chant),
      reason: best ? explainChoice(best.chant, slotDef.category, day) : '',
      score: best?.score ?? 0,
    });
  }

  const langueBreakdown: Record<string, number> = {};
  slots.forEach((s) => {
    if (s.chant) {
      langueBreakdown[s.chant.langue] = (langueBreakdown[s.chant.langue] || 0) + 1;
    }
  });

  const estimatedMin = slots.filter((s) => s.chant).length * 4 + 8;
  const newSongsCount = slots.filter((s) => (s.chant?.nombre_vues ?? 0) < 5).length;

  return { slots, day, estimatedMin, langueBreakdown, newSongsCount };
}

// ============ ÉCRAN MESSE ============
export default function MesseScreen() {
  const { language } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const chants = useAppStore((s) => s.chants);
  const celebrations = useAppStore((s) => s.celebrations);
  const activeCelebrationId = useAppStore((s) => s.activeCelebrationId);
  const celebration = celebrations.find((item) => item.id === activeCelebrationId) ?? celebrations[0];
  const addCelebration = useAppStore((s) => s.addCelebration);
  const setActiveCelebration = useAppStore((s) => s.setActiveCelebration);
  const updateCelebration = useAppStore((s) => s.updateCelebration);
  const deleteCelebration = useAppStore((s) => s.deleteCelebration);
  const setCelebrationSlotChants = useAppStore((s) => s.setCelebrationSlotChants);
  const reorderCelebrationSlots = useAppStore((s) => s.reorderCelebrationSlots);
  const addCustomMoment = useAppStore((s) => s.addCustomMoment);
  const removeCustomMoment = useAppStore((s) => s.removeCustomMoment);
  const resetCelebration = useAppStore((s) => s.resetCelebration);
  const playChant = useAppStore((s) => s.playChant);

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [celebrationMode, setCelebrationMode] = useState(false);
  const [startPlaybackOnOpen, setStartPlaybackOnOpen] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);
  const [addMomentVisible, setAddMomentVisible] = useState(false);
  const [customMomentTitle, setCustomMomentTitle] = useState('');
  const [preparationsVisible, setPreparationsVisible] = useState(false);
  const [newPreparationVisible, setNewPreparationVisible] = useState(false);
  const [newPreparationTitle, setNewPreparationTitle] = useState('');
  const [renamePreparationId, setRenamePreparationId] = useState<string | null>(null);
  const [renamePreparationTitle, setRenamePreparationTitle] = useState('');
  const pendingPickerChant = useRef<{ chantId: string; celebrationId: string; slotId: string; slotTitle: string } | null>(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayLiturgical = getLiturgicalDay(todayStr);

  const createPreparation = () => {
    const title = newPreparationTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();
    addCelebration({
      id: `messe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      date: todayStr,
      temps_liturgique: celebration?.temps_liturgique ?? 'temps_ordinaire',
      selectedChants: {},
      customMoments: [],
      slotOrder: [...DEFAULT_CELEBRATION_SLOT_IDS],
      created_at: now,
      updated_at: now,
      status: 'draft',
    });
    setNewPreparationTitle('');
    setNewPreparationVisible(false);
    setPreparationsVisible(false);
  };

  const savePreparationName = () => {
    const title = renamePreparationTitle.trim();
    if (!renamePreparationId || !title) return;
    updateCelebration(renamePreparationId, { title });
    setRenamePreparationId(null);
    setRenamePreparationTitle('');
  };

  const customSlots: MesseSlot[] = [...(celebration?.customMoments ?? [])]
    .sort((left, right) => {
      const allIds = getEffectiveSlotOrder(celebration?.slotOrder, [
        ...DEFAULT_CELEBRATION_SLOT_IDS,
        ...((celebration?.customMoments ?? []).map((moment) => moment.id)),
      ]);
      return allIds.indexOf(left.id) - allIds.indexOf(right.id);
    })
    .map((moment) => ({
      id: moment.id,
      moment: moment.id,
      category: 'autre',
      title: moment.title,
      subtitle: 'Temps personnalisé',
      duration: 0,
      custom: true,
    }));
  const activeSlot = ALL_PARTS.find((slot) => slot.id === activeSlotId)
    ?? customSlots.find((slot) => slot.id === activeSlotId);
  const celebrationSlots = useMemo(
    () => getCelebrationSlots(celebration, chants),
    [celebration, chants]
  );

  const moveCelebrationSlot = useCallback((slotId: string, direction: -1 | 1) => {
    if (!celebration) return;
    reorderCelebrationSlots(celebration.id, slotId, direction);
  }, [celebration, reorderCelebrationSlots]);

  // ── Stats programme ──
  const stats = useMemo(() => {
    const totalSelected = celebrationSlots.reduce((sum, slot) => sum + slot.selectedChantIds.length, 0);
    const filledSlots = celebrationSlots.filter((slot) => slot.selectedChantIds.length > 0).length;
    const totalSlots = celebrationSlots.length;
    const progress = Math.round((filledSlots / totalSlots) * 100);

    const estimatedMin = celebrationSlots.reduce((sum, slot) =>
      sum + (slot.selectedChantIds.length > 0 ? slot.duration : 0), 0);

    return { totalSelected, filledSlots, totalSlots, progress, estimatedMin };
  }, [celebrationSlots]);

  // ── Suggestions picker ──
  const pickerChants = useMemo(() => {
    if (!activeSlot) return [];
    const term = pickerQuery.trim().toLocaleLowerCase();

    if (term) {
      return chants.filter((chant) =>
        [chant.titre, chant.paroles, chant.auteur, chant.compositeur, chant.id]
          .some((v) => v?.toLocaleLowerCase().includes(term))
      );
    }

    const suggestions = chants
      .map((chant) => {
        let score = 0;
        if (chant.categorie === activeSlot.category) score += 100;
        if (chant.categorie === 'louange') score += 10;
        if (chant.langue === 'fr') score += 5;
        score += Math.min(chant.nombre_vues ?? chant.vues ?? 0, 50);
        return { chant, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ chant }) => chant);
    return activeSlot.custom ? suggestions : suggestions.slice(0, 30);
  }, [activeSlot, chants, pickerQuery]);

  // ── Chants déjà utilisés ──
  const usedChantIds = useMemo(() => {
    const used = new Set<string>();
    celebrationSlots.forEach((slot) => slot.selectedChantIds.forEach((id) => used.add(id)));
    return used;
  }, [celebrationSlots]);

  // ── Handlers ──
  const openPicker = useCallback((slotId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerQuery('');
    setActiveSlotId(slotId);
  }, []);

  const closePicker = useCallback(() => setActiveSlotId(null), []);

  const openChantFromPicker = useCallback((chantId: string) => {
    if (!chantId || !celebration || !activeSlot) return;
    pendingPickerChant.current = {
      chantId,
      celebrationId: celebration.id,
      slotId: activeSlot.id,
      slotTitle: activeSlot.title,
    };
    closePicker();
  }, [activeSlot, celebration, closePicker]);

  useEffect(() => {
    if (activeSlotId !== null || !pendingPickerChant.current) return;
    const pending = pendingPickerChant.current;
    pendingPickerChant.current = null;
    router.push({
      pathname: '/chant/[id]',
      params: {
        id: pending.chantId,
        selectForMass: '1',
        celebrationId: pending.celebrationId,
        slotId: pending.slotId,
        slotTitle: pending.slotTitle,
      },
    });
  }, [activeSlotId, router]);

  const handleAddCustomMoment = () => {
    const title = customMomentTitle.trim();
    if (!celebration || !title) return;
    addCustomMoment(celebration.id, title);
    setCustomMomentTitle('');
    setAddMomentVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const shareProgram = async () => {
    if (!celebration) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lines = [`📜 Programme de Messe — ${celebration.title}`];
    lines.push(`⏱ Durée estimée : ~${stats.estimatedMin} min\n`);
    let currentBlock = '';
    celebrationSlots.forEach((slot) => {
      if (!slot.selectedChantIds.length) return;
      if (slot.blockLabel !== currentBlock) {
        currentBlock = slot.blockLabel;
        lines.push(`\n${currentBlock.toLocaleUpperCase()}`);
      }
      slot.selectedChantIds.forEach((id) => {
        const chant = chants.find((item) => item.id === id);
        if (chant) lines.push(`  ${slot.title} : ${chant.titre} (${chant.langue.toUpperCase()})`);
      });
    });
    await Share.share({ message: lines.join('\n'), title: 'Programme de messe' });
  };

  const confirmResetProgram = () => {
    if (!celebration) return;
    showLocalizedAlert(
      'Réinitialiser le programme ?',
      'Cette action supprimera tous les chants sélectionnés pour cette préparation.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            resetCelebration(celebration.id);
          },
        },
      ]
    );
  };

  const playProgram = () => {
    setStartPlaybackOnOpen(true);
    setCelebrationMode(true);
  };

  const openChantDetails = (chantId: string) => {
    router.push(`/chant/${chantId}`);
  };

  const selectChant = (slot: MesseSlot, chantId: string) => {
    const selectedIds = celebrationSlots.find((item) => item.id === slot.id)?.selectedChantIds ?? [];
    if (!selectedIds.includes(chantId) && celebration) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCelebrationSlotChants(
        celebration.id,
        getSlotSelectionKey(slot),
        [...selectedIds, chantId]
      );
    }
    setActiveSlotId(null);
  };

  const handleAdoptProgram = (program: SuggestedProgram) => {
    if (!celebration) return;
    resetCelebration(celebration.id);
    program.slots.forEach((slot) => {
      if (slot.chant) {
        const part = ALL_PARTS.find((item) => item.id === slot.partId);
        if (part) {
          setCelebrationSlotChants(
            celebration.id,
            getSlotSelectionKey(part),
            [slot.chant.id]
          );
        }
      }
    });
    setWizardVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ═══ MODE CÉLÉBRATION ═══
  if (celebrationMode) {
    return (
      <Modal
        visible
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setCelebrationMode(false);
          setStartPlaybackOnOpen(false);
        }}
      >
        <SafeAreaProvider>
          <CelebrationMode
            celebration={celebration}
            chants={chants}
            autoStart={startPlaybackOnOpen}
            onExit={() => {
              setCelebrationMode(false);
              setStartPlaybackOnOpen(false);
            }}
          />
        </SafeAreaProvider>
      </Modal>
    );
  }

  // ═══ RENDU NORMAL ═══
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={goBackSafely} style={styles.iconBtn} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choisir une préparation de Messe"
          onPress={() => setPreparationsVisible(true)}
          style={styles.headerCopy}
        >
          <View style={styles.preparationTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {celebration?.title ?? 'Préparation de Messe'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={19} color={theme.textSecondary} />
          </View>
          <Text style={styles.headerSub} numberOfLines={1}>
            {todayLiturgical.seasonLabel} · {stats.filledSlots}/{stats.totalSlots} parties · ~{stats.estimatedMin} min
          </Text>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Créer une préparation de Messe"
            onPress={() => {
              setNewPreparationTitle('');
              setNewPreparationVisible(true);
            }}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="plus" size={20} color={TOKENS.gold} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ouvrir mon historique"
            onPress={() => router.push('/historique')}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="history" size={19} color={theme.textSecondary} />
          </Pressable>
          {stats.totalSelected > 0 && (
            <Pressable onPress={shareProgram} style={styles.iconBtn} hitSlop={8}>
              <MaterialCommunityIcons
                name="share-variant-outline"
                size={19}
                color={theme.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* BARRE DE PROGRESSION */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stats.progress}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{stats.progress} % complété</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* BOUTON PROGRAMME AUTO */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setWizardVisible(true);
          }}
          style={({ pressed }) => [
            styles.magicBtn,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={[TOKENS.gold, '#4F1027']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.magicGradient}
          >
            <View style={styles.magicIconWrap}>
              <MaterialCommunityIcons name="auto-fix" size={20} color="#FFF" />
            </View>
            <View style={styles.magicCopy}>
              <Text style={styles.magicTitle}>Programme intelligent</Text>
              <Text style={styles.magicSub}>
                Auto-généré pour {todayLiturgical.seasonLabel}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#FFF" />
          </LinearGradient>
        </Pressable>

        {/* BLOCS LITURGIQUES */}
        {MASS_BLOCKS.map((block) => (
          <View key={block.id} style={styles.block}>
            <View style={styles.blockHeader}>
              <View style={[styles.blockBar, { backgroundColor: block.color }]} />
              <Text style={styles.blockLabel}>{block.label.toUpperCase()}</Text>
            </View>

            <View style={styles.blockBody}>
              {block.parts.map((slot) => {
                const selectedIds = celebrationSlots.find((item) => item.id === slot.id)?.selectedChantIds ?? [];
                const selectedChants = selectedIds
                  .map((id) => chants.find((c) => c.id === id))
                  .filter((chant): chant is Chant => Boolean(chant));
                const isFilled = selectedChants.length > 0;
                const globalIndex = ALL_PARTS.indexOf(slot) + 1;

                return (
                  <View key={slot.id} style={styles.slot}>
                    <Pressable
                      onPress={() => openPicker(slot.id)}
                      style={styles.slotMain}
                    >
                      <View
                        style={[
                          styles.slotNumber,
                          isFilled && {
                            backgroundColor: block.color,
                            borderColor: block.color,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotNumberText,
                            isFilled && { color: '#FFF' },
                          ]}
                        >
                          {globalIndex}
                        </Text>
                      </View>

                      <View style={styles.slotCopy}>
                        <Text style={styles.slotTitle}>{slot.title}</Text>
                        {isFilled ? (
                          selectedChants.map((c) => (
                            <Pressable
                              key={c.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Ouvrir les paroles de ${c.titre}`}
                              onPress={() => openChantDetails(c.id)}
                              style={styles.slotChant}
                            >
                              <MaterialCommunityIcons
                                name="music-note"
                                size={11}
                                color={block.color}
                              />
                              <Text style={styles.slotChantTitle} numberOfLines={1}>
                                {c.titre}
                              </Text>
                              <Text style={styles.slotChantLang}>
                                {LANG_LABELS[c.langue] || c.langue}
                              </Text>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Retirer ${c.titre} de ${slot.title}`}
                                onPress={() => celebration && setCelebrationSlotChants(
                                  celebration.id,
                                  getSlotSelectionKey(slot),
                                  selectedIds.filter((id) => id !== c.id)
                                )}
                                style={styles.inlineRemoveButton}
                                hitSlop={6}
                              >
                                <MaterialCommunityIcons
                                  name="close-circle-outline"
                                  size={17}
                                  color={theme.textSecondary}
                                />
                              </Pressable>
                            </Pressable>
                          ))
                        ) : (
                          <Text style={styles.slotSubtitle} numberOfLines={1}>
                            {slot.subtitle}
                          </Text>
                        )}
                      </View>

                      {isFilled ? (
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={14}
                          color={theme.textSecondary}
                        />
                      ) : (
                        <View style={styles.slotAddBtn}>
                          <MaterialCommunityIcons
                            name="plus"
                            size={12}
                            color={block.color}
                          />
                          <Text style={[styles.slotAddText, { color: block.color }]}>
                            Ajouter
                          </Text>
                        </View>
                      )}
                    </Pressable>

                    {isFilled && (
                      <View style={styles.slotActions}>
                        <Pressable
                          onPress={() => playChant(selectedChants[0]!.id)}
                          style={styles.slotAction}
                          hitSlop={4}
                        >
                          <MaterialCommunityIcons
                            name="play-circle-outline"
                            size={20}
                            color={ActionColors.playback}
                          />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {customSlots.map((slot) => {
          const selectedIds = celebrationSlots.find((item) => item.id === slot.id)?.selectedChantIds ?? [];
          const selectedChants = selectedIds
            .map((id) => chants.find((chant) => chant.id === id))
            .filter((chant): chant is Chant => Boolean(chant));
          const customIndex = celebrationSlots.findIndex((item) => item.id === slot.id);

          return (
            <View key={slot.id} style={styles.block}>
              <View style={styles.blockHeader}>
                <View style={[styles.blockBar, { backgroundColor: TOKENS.teal }]} />
                <Text style={styles.blockLabel}>{slot.title.toLocaleUpperCase()}</Text>
                <View style={styles.blockActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Déplacer ${slot.title} vers le haut`}
                    disabled={customIndex <= 0}
                    onPress={() => moveCelebrationSlot(slot.id, -1)}
                    hitSlop={8}
                    style={[styles.reorderButton, customIndex <= 0 && styles.reorderButtonDisabled]}
                  >
                    <MaterialCommunityIcons name="chevron-up" size={16} color={customIndex <= 0 ? '#A0A7B5' : theme.textSecondary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Déplacer ${slot.title} vers le bas`}
                    disabled={customIndex >= celebrationSlots.length - 1}
                    onPress={() => moveCelebrationSlot(slot.id, 1)}
                    hitSlop={8}
                    style={[styles.reorderButton, customIndex >= celebrationSlots.length - 1 && styles.reorderButtonDisabled]}
                  >
                    <MaterialCommunityIcons name="chevron-down" size={16} color={customIndex >= celebrationSlots.length - 1 ? '#A0A7B5' : theme.textSecondary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer le temps ${slot.title}`}
                    onPress={() => celebration && removeCustomMoment(celebration.id, slot.id)}
                    style={styles.removeMomentButton}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons name="close" size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.blockBody}>
                {selectedChants.map((chant) => (
                  <Pressable
                    key={chant.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir les paroles de ${chant.titre}`}
                    onPress={() => openChantDetails(chant.id)}
                    style={styles.customMomentSong}
                  >
                    <MaterialCommunityIcons name="music-note" size={15} color={TOKENS.gold} />
                    <Text style={styles.slotChantTitle} numberOfLines={1}>{chant.titre}</Text>
                    <Text style={styles.customMomentLanguage}>
                      {LANG_LABELS[chant.langue] || chant.langue}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Retirer ${chant.titre} du temps ${slot.title}`}
                      onPress={() => celebration && setCelebrationSlotChants(
                        celebration.id,
                        getSlotSelectionKey(slot),
                        selectedIds.filter((id) => id !== chant.id)
                      )}
                      style={styles.slotAction}
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons name="close-circle-outline" size={18} color={theme.textSecondary} />
                    </Pressable>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openPicker(slot.id)}
                  style={styles.customMomentAddSong}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={19} color={TOKENS.gold} />
                  <Text style={styles.customMomentAddSongText}>
                    {selectedChants.length ? 'Ajouter un chant' : 'Choisir un chant'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Pressable
          accessibilityRole="button"
          onPress={() => setAddMomentVisible(true)}
          style={({ pressed }) => [styles.addMomentButton, pressed && { opacity: 0.75 }]}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addMomentButtonText}>Ajouter un temps</Text>
        </Pressable>

        {/* ACTIONS */}
        {stats.totalSelected > 0 && (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setStartPlaybackOnOpen(false);
                setCelebrationMode(true);
              }}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Mode célébration</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void shareProgram();
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <MaterialCommunityIcons name="share-variant" size={16} color={ActionColors.playback} />
              <Text style={styles.secondaryBtnText}>Partager</Text>
            </Pressable>
          </View>
        )}

        {stats.totalSelected > 0 && (
          <Pressable
            onPress={confirmResetProgram}
            style={styles.resetBtn}
          >
            <MaterialCommunityIcons name="refresh" size={14} color={theme.textSecondary} />
            <Text style={styles.resetText}>Réinitialiser le programme</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal
        visible={preparationsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPreparationsVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable onPress={() => setPreparationsVisible(false)} style={styles.modalScrim} />
          <View style={styles.preparationSheet}>
            <View style={styles.sheetHandle} />
            {renamePreparationId ? (
              <>
                <View style={styles.preparationSheetHeader}>
                  <View style={styles.sheetHeadingCopy}>
                    <Text style={styles.sheetEyebrow}>MODIFIER LE NOM</Text>
                    <Text style={styles.sheetTitle}>Renommer la Messe</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Annuler le renommage"
                    onPress={() => setRenamePreparationId(null)}
                    style={styles.closeBtn}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <Text style={styles.createPreparationSubtitle}>Choisissez un nouveau nom pour cette préparation.</Text>
                <TextInput
                  accessibilityLabel="Nouveau nom de la préparation"
                  autoFocus
                  maxLength={80}
                  onChangeText={setRenamePreparationTitle}
                  onSubmitEditing={savePreparationName}
                  placeholder="Ex. Messe du dimanche"
                  placeholderTextColor="#7A8494"
                  returnKeyType="done"
                  style={styles.createPreparationInput}
                  value={renamePreparationTitle}
                />
                <View style={styles.createPreparationActions}>
                  <Pressable onPress={() => setRenamePreparationId(null)} style={styles.createCancelButton}>
                    <Text style={styles.createCancelLabel}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!renamePreparationTitle.trim()}
                    onPress={savePreparationName}
                    style={[styles.createConfirmButton, !renamePreparationTitle.trim() && styles.createDisabledButton]}
                  >
                    <Text style={styles.createConfirmLabel}>Enregistrer</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.preparationSheetHeader}>
                  <View style={styles.sheetHeadingCopy}>
                    <Text style={styles.sheetEyebrow}>VOTRE BIBLIOTHÈQUE</Text>
                    <Text style={styles.sheetTitle}>Préparations</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fermer la liste des préparations"
                    onPress={() => setPreparationsVisible(false)}
                    style={styles.closeBtn}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setNewPreparationTitle('');
                    setNewPreparationVisible(true);
                  }}
                  style={styles.newPreparationButton}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.newPreparationLabel}>Nouvelle préparation</Text>
                </Pressable>
                <ScrollView contentContainerStyle={styles.preparationList}>
                  {celebrations.map((item) => {
                    const selected = item.id === celebration?.id;
                    const chantCount = new Set(
                      Object.values(item.selectedChants).flatMap((ids) => ids ?? [])
                    ).size;
                    return (
                      <View key={item.id} style={[styles.preparationRow, selected && styles.preparationRowActive]}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => {
                            setActiveCelebration(item.id);
                            setPreparationsVisible(false);
                          }}
                          style={styles.preparationSelect}
                        >
                          <MaterialCommunityIcons
                            name={selected ? 'check-circle' : 'circle-outline'}
                            size={20}
                            color={selected ? TOKENS.gold : theme.textSecondary}
                          />
                          <View style={styles.preparationCopy}>
                            <Text numberOfLines={1} style={styles.preparationName}>{item.title}</Text>
                            <Text style={styles.preparationMeta}>
                              {formatDateLong(item.date, language)} · {chantCount} chant{chantCount === 1 ? '' : 's'}
                            </Text>
                            <Text style={styles.preparationMeta}>
                              Modifiée le {formatDateLong(item.updated_at ?? item.created_at ?? item.date, language)}
                            </Text>
                          </View>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Renommer ${item.title}`}
                          onPress={() => {
                            setRenamePreparationId(item.id);
                            setRenamePreparationTitle(item.title);
                          }}
                          style={[styles.removeButton, styles.renameButton]}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.textSecondary} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Supprimer ${item.title}`}
                          onPress={() => {
                            showLocalizedAlert(
                              'Supprimer cette préparation ?',
                              `« ${item.title} » et ses choix de chants seront supprimés.`,
                              [
                                { text: 'Annuler', style: 'cancel' },
                                {
                                  text: 'Supprimer',
                                  style: 'destructive',
                                  onPress: () => deleteCelebration(item.id),
                                },
                              ],
                            );
                          }}
                          style={styles.removeButton}
                        >
                          <MaterialCommunityIcons name="delete-outline" size={20} color={ActionColors.danger} />
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={newPreparationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewPreparationVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingFill}
        >
          <View style={styles.createPreparationOverlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Annuler la création de préparation"
              onPress={() => setNewPreparationVisible(false)}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.createPreparationCard}>
              <Text style={styles.createPreparationTitle}>Nouvelle Messe</Text>
              <Text style={styles.createPreparationSubtitle}>Donnez un nom à cette préparation.</Text>
              <TextInput
                accessibilityLabel="Nom de la préparation"
                autoFocus
                maxLength={80}
                onChangeText={setNewPreparationTitle}
                onSubmitEditing={createPreparation}
                placeholder="Ex. Messe du dimanche"
                placeholderTextColor="#7A8494"
                returnKeyType="done"
                style={styles.createPreparationInput}
                value={newPreparationTitle}
              />
              <View style={styles.createPreparationActions}>
                <Pressable onPress={() => setNewPreparationVisible(false)} style={styles.createCancelButton}>
                  <Text style={styles.createCancelLabel}>Annuler</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!newPreparationTitle.trim()}
                  onPress={createPreparation}
                  style={[styles.createConfirmButton, !newPreparationTitle.trim() && styles.createDisabledButton]}
                >
                  <Text style={styles.createConfirmLabel}>Créer</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PICKER */}
      <Modal
        visible={activeSlot !== undefined}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <View style={styles.modalRoot}>
          <Pressable onPress={closePicker} style={styles.modalScrim} />
          <View style={styles.pickerSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeadingCopy}>
                <Text style={styles.sheetEyebrow}>CHOISIR UN CHANT</Text>
                <Text style={styles.sheetTitle}>{activeSlot?.title}</Text>
                <Text style={styles.sheetSubtitle}>{activeSlot?.subtitle}</Text>
              </View>
              <Pressable onPress={closePicker} style={styles.closeBtn} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={18} color={ActionColors.discovery} />
              <TextInput
                onChangeText={setPickerQuery}
                placeholder="Titre, auteur, paroles…"
                placeholderTextColor={TOKENS.inkMuted}
                style={styles.searchInput}
                value={pickerQuery}
                autoCorrect={false}
              />
              {pickerQuery.length > 0 && (
                <Pressable onPress={() => setPickerQuery('')} hitSlop={6}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={theme.textSecondary} />
                </Pressable>
              )}
            </View>

            {!pickerQuery && (
              <View style={styles.pickerHint}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={13} color={TOKENS.gold} />
                <Text style={styles.pickerHintText}>
                  Suggestions basées sur ce moment liturgique
                </Text>
              </View>
            )}

            <ScrollView
              style={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {pickerChants.length === 0 ? (
                <View style={styles.pickerEmpty}>
                  <MaterialCommunityIcons name="music-note-off" size={32} color={theme.textSecondary} />
                  <Text style={styles.pickerEmptyText}>Aucun chant trouvé</Text>
                </View>
              ) : (
                pickerChants.map((chant) => {
                  const selected = Boolean(activeSlot && celebrationSlots
                    .find((slot) => slot.id === activeSlot.id)
                    ?.selectedChantIds.includes(chant.id));
                  const usedElsewhere = usedChantIds.has(chant.id) && !selected;

                  return (
                    <View key={chant.id} style={styles.pickerRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Consulter ${chant.titre}`}
                        onPress={() => openChantFromPicker(chant.id)}
                        style={({ pressed }) => [
                          styles.pickerItemMain,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <View style={styles.pickerArtwork}>
                          <MaterialCommunityIcons name="music-note" size={18} color={TOKENS.gold} />
                        </View>
                        <View style={styles.pickerCopy}>
                          <Text style={styles.pickerTitle} numberOfLines={1}>
                            {chant.titre}
                          </Text>
                          <Text style={styles.pickerMeta} numberOfLines={1}>
                            {chant.auteur || 'Anonyme'} · {LANG_LABELS[chant.langue] || chant.langue} {CATEGORIE_LABELS[chant.categorie] || chant.categorie}
                          </Text>
                          {usedElsewhere && (
                            <View style={styles.pickerWarn}>
                              <MaterialCommunityIcons
                                name="alert-circle-outline"
                                size={10}
                                color={TOKENS.gold}
                              />
                              <Text style={styles.pickerWarnText}>
                                Déjà utilisé dans ce programme
                              </Text>
                            </View>
                          )}
                        </View>
                      </Pressable>

                      <View style={styles.pickerActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Voir ${chant.titre}`}
                          onPress={() => openChantFromPicker(chant.id)}
                          style={styles.pickerSecondaryAction}
                        >
                          <MaterialCommunityIcons name="book-open-variant" size={15} color={theme.textSecondary} />
                          <Text style={styles.pickerSecondaryActionText}>Voir</Text>
                        </Pressable>

                        {selected ? (
                          <View style={styles.pickerSelected}>
                            <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                          </View>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Ajouter ${chant.titre}`}
                            onPress={() => activeSlot && selectChant(activeSlot, chant.id)}
                            style={styles.pickerPrimaryAction}
                          >
                            <MaterialCommunityIcons name="plus" size={14} color="#FFF" />
                            <Text style={styles.pickerPrimaryActionText}>Ajouter</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addMomentVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddMomentVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingFill}
        >
          <View style={styles.modalRoot}>
            <Pressable onPress={() => setAddMomentVisible(false)} style={styles.modalScrim} />
            <View style={styles.customMomentSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeadingCopy}>
                  <Text style={styles.sheetEyebrow}>PROGRAMME DE MESSE</Text>
                  <Text style={styles.sheetTitle}>Ajouter un temps</Text>
                  <Text style={styles.sheetSubtitle}>Créez une étape et choisissez les chants du répertoire.</Text>
                </View>
                <Pressable onPress={() => setAddMomentVisible(false)} style={styles.closeBtn} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                autoFocus
                maxLength={60}
                onChangeText={setCustomMomentTitle}
                onSubmitEditing={handleAddCustomMoment}
                placeholder="Ex. Procession, méditation…"
                placeholderTextColor={TOKENS.inkMuted}
                returnKeyType="done"
                style={styles.customMomentInput}
                value={customMomentTitle}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!customMomentTitle.trim()}
                onPress={handleAddCustomMoment}
                style={({ pressed }) => [
                  styles.adoptBtn,
                  !customMomentTitle.trim() && styles.disabledButton,
                  pressed && customMomentTitle.trim() && { opacity: 0.8 },
                ]}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.adoptText}>Créer le temps</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* WIZARD PROGRAMME INTELLIGENT */}
      <CelebrationWizard
        visible={wizardVisible}
        date={todayStr}
        onDismiss={() => setWizardVisible(false)}
        onAdopt={handleAdoptProgram}
      />
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════
// MODAL — PROGRAMME INTELLIGENT
// ══════════════════════════════════════════════════════════
function CelebrationWizard({
  visible,
  date,
  onDismiss,
  onAdopt,
}: {
  visible: boolean;
  date: string;
  onDismiss: () => void;
  onAdopt: (program: SuggestedProgram) => void;
}) {
  const { language } = useTranslation();
  const theme = useTheme();
  const chants = useAppStore((s) => s.chants);
  const [databaseChants, setDatabaseChants] = useState<Chant[]>([]);
  const [style, setStyle] = useState<CelebrationStyle>('traditionnel');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('mix');
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    void searchChants({
      categories: [
        'entree', 'kyrie', 'gloria', 'psaume', 'acclamation', 'credo',
        'priere_universelle', 'offertoire', 'sanctus', 'agnus_dei',
        'communion', 'action_grace', 'chant_final',
      ],
      limit: 100,
    })
      .then((page) => { if (active) setDatabaseChants(page.items); })
      .catch((error: unknown) => {
        console.error('Impossible de charger les suggestions locales pour la Messe.', error);
      });
    return () => { active = false; };
  }, [visible]);

  const program = useMemo(
    () => generateCelebration(date, databaseChants.length ? databaseChants : chants, style, languageMode),
    [date, databaseChants, chants, style, languageMode, seed]
  );

  const handleAdopt = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAdopt(program);
  };

  const handleRegenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeed((s) => s + 1);
  };

  const day = program.day;
  const SEASON_COLORS: Record<string, string> = {
    purple: TOKENS.purple,
    white: TOKENS.inkSoft,
    red: TOKENS.red,
    green: TOKENS.green,
    rose: TOKENS.pink,
  };
  const seasonColor = SEASON_COLORS[day.color] ?? TOKENS.gold;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.wizardRoot}>
        <Pressable onPress={onDismiss} style={styles.modalScrim} />
        <View style={styles.wizardSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.wizardHeader}>
            <View style={styles.wizardHeaderCopy}>
              <View style={styles.wizardEyebrowRow}>
                <MaterialCommunityIcons name="auto-fix" size={12} color={TOKENS.gold} />
                <Text style={styles.wizardEyebrow}>PROGRAMME INTELLIGENT</Text>
              </View>
              <Text style={styles.wizardTitle}>Célébration sur mesure</Text>
            </View>
            <Pressable onPress={onDismiss} style={styles.closeBtn} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.wizardContent}
          >
            {/* CONTEXTE LITURGIQUE */}
            <LinearGradient
              colors={[seasonColor, TOKENS.inkSoft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.contextCard}
            >
              <View style={styles.contextTop}>
                <View style={styles.contextDot} />
                <Text style={styles.contextDate}>{formatDateLong(date, language)}</Text>
              </View>
              <Text style={styles.contextSeason}>{day.seasonLabel}</Text>
              <Text style={styles.contextTheme}>{day.themeLabel}</Text>

              {day.gospelRef ? (
                <View style={styles.contextGospel}>
                  <MaterialCommunityIcons
                    name="book-open-variant"
                    size={12}
                    color="rgba(255,255,255,0.8)"
                  />
                  <Text style={styles.contextGospelText}>{day.gospelRef}</Text>
                </View>
              ) : null}

              <View style={styles.contextKeywords}>
                {day.keywords.slice(0, 4).map((kw) => (
                  <View key={kw} style={styles.keywordPill}>
                    <Text style={styles.keywordText}>{kw}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {/* STYLE */}
            <Text style={styles.sectionLabel}>STYLE DE CÉLÉBRATION</Text>
            <View style={styles.choiceRow}>
              <StyleCard
                icon="church"
                label="Traditionnel"
                desc="Classique"
                active={style === 'traditionnel'}
                onPress={() => setStyle('traditionnel')}
              />
              <StyleCard
                icon="star-four-points"
                label="Contemporain"
                desc="Moderne"
                active={style === 'contemporain'}
                onPress={() => setStyle('contemporain')}
              />
              <StyleCard
                icon="earth"
                label="Guinéen"
                desc="Local"
                active={style === 'guineen'}
                onPress={() => setStyle('guineen')}
              />
            </View>

            {/* LANGUE */}
            <Text style={styles.sectionLabel}>LANGUES</Text>
            <View style={styles.choiceRow}>
              <LangCard
                label="Français"
                active={languageMode === 'fr'}
                onPress={() => setLanguageMode('fr')}
              />
              <LangCard
                label="Local"
                active={languageMode === 'local'}
                onPress={() => setLanguageMode('local')}
              />
              <LangCard
                label="Mix"
                active={languageMode === 'mix'}
                onPress={() => setLanguageMode('mix')}
              />
            </View>

            {/* APERÇU */}
            <Text style={styles.sectionLabel}>APERÇU DU PROGRAMME</Text>
            <View style={styles.preview}>
              {program.slots.map((slot, idx) => (
                <View key={slot.partId} style={styles.previewRow}>
                  <Text style={styles.previewIndex}>
                    {String(idx + 1).padStart(2, '0')}
                  </Text>
                  <View style={styles.previewCopy}>
                    <Text style={styles.previewTitle}>{slot.title}</Text>
                    {slot.chant ? (
                      <Text style={styles.previewChant} numberOfLines={1}>
                        {slot.chant.titre} · {LANG_LABELS[slot.chant.langue] || slot.chant.langue}
                      </Text>
                    ) : (
                      <Text style={styles.previewEmpty}>Aucun chant disponible</Text>
                    )}
                  </View>
                  {slot.chant && slot.reason ? (
                    <View style={styles.previewReason}>
                      <Text style={styles.previewReasonText} numberOfLines={2}>
                        {slot.reason}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>

            {/* STATS */}
            <View style={styles.statsRowWiz}>
              <StatBox
                icon="clock-outline"
                value={`~${program.estimatedMin} min`}
                label="Durée"
              />
              <StatBox
                icon="earth"
                value={String(Object.keys(program.langueBreakdown).length)}
                label="Langues"
              />
              <StatBox
                icon="star-outline"
                value={String(program.newSongsCount)}
                label="Nouveautés"
              />
            </View>

            {/* ACTIONS */}
            <View style={styles.wizardActions}>
              <Pressable onPress={handleRegenerate} style={styles.regenBtn}>
                <MaterialCommunityIcons name="refresh" size={16} color={theme.textSecondary} />
                <Text style={styles.regenText}>Regénérer</Text>
              </Pressable>
              <Pressable onPress={handleAdopt} style={styles.adoptBtn}>
                <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                <Text style={styles.adoptText}>Adopter</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Sous-composants du wizard
function StyleCard({
  icon, label, desc, active, onPress,
}: {
  icon: string; label: string; desc: string; active: boolean; onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.styleCard, active && styles.styleCardActive]}
    >
      <View style={[styles.styleIcon, active && { backgroundColor: TOKENS.gold }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={active ? '#FFF' : theme.textSecondary}
        />
      </View>
      <Text style={[styles.styleLabel, active && { color: TOKENS.gold }]}>
        {label}
      </Text>
      <Text style={styles.styleDesc}>{desc}</Text>
    </Pressable>
  );
}

function LangCard({
  label, active, onPress,
}: {
  label: string; active: boolean; onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.langCardWiz, active && styles.langCardWizActive]}
    >
      <MaterialCommunityIcons name="translate" size={18} color={theme.textSecondary} />
      <Text style={[styles.langLabelWiz, active && { color: TOKENS.gold }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatBox({
  icon, value, label,
}: {
  icon: string; value: string; label: string;
}) {
  return (
    <View style={styles.statBoxWiz}>
      <MaterialCommunityIcons name={icon as any} size={14} color={TOKENS.gold} />
      <Text style={styles.statValueWiz}>{value}</Text>
      <Text style={styles.statLabelWiz}>{label}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
// MODE CÉLÉBRATION — plein écran
// ══════════════════════════════════════════════════════════
function CelebrationMode({
  celebration,
  chants,
  autoStart,
  onExit,
}: {
  celebration: Celebration | undefined;
  chants: Chant[];
  autoStart: boolean;
  onExit: () => void;
}) {
  const theme = useTheme();
  const { height: viewportHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compactLayout = viewportHeight < 600;
  const router = useRouter();
  const setCelebrationSlotChants = useAppStore((state) => state.setCelebrationSlotChants);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [activeChantBySlot, setActiveChantBySlot] = useState<Record<string, string>>({});
  const [selectedAudioByChant, setSelectedAudioByChant] = useState<Record<string, string>>({});
  const [partition, setPartition] = useState<ChantResource | null>(null);
  const [chantPickerVisible, setChantPickerVisible] = useState(false);
  const [modeMenuVisible, setModeMenuVisible] = useState(false);
  const [mediaMode, setMediaMode] = useState<'audio' | 'partition'>('audio');
  const [chantSearch, setChantSearch] = useState('');
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const finishedHandled = useRef(false);
  const autoStartHandled = useRef(false);
  const listenedSecondsRef = useRef(0);
  const lastAudioPositionRef = useRef<number | null>(null);
  const recordedListenRef = useRef(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [audioModeReady, setAudioModeReady] = useState(Platform.OS !== 'ios');
  const [audioModeError, setAudioModeError] = useState<string | null>(null);
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const playback = useAudioPlayerStatus(player);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let mounted = true;
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    })
      .then(() => {
        if (mounted) setAudioModeReady(true);
      })
      .catch((error: unknown) => {
        console.error('Impossible de configurer la lecture audio du mode célébration.', error);
        if (mounted) setAudioModeError('La session audio ne peut pas être initialisée sur cet appareil.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const slots = useMemo(
    () => getCelebrationSlots(celebration, chants),
    [celebration, chants]
  );
  const queue = useMemo<CelebrationQueueItem[]>(() => {
    return slots.flatMap((slot) =>
      slot.selectedChantIds.flatMap((id) => {
        const chant = chants.find((item) => item.id === id);
        return chant
          ? [{
              ...chant,
              _slot: slot.title,
              _slotId: slot.id,
              _block: slot.blockLabel,
              _color: slot.color,
            }]
          : [];
      })
    );
  }, [slots, chants]);

  const activeSlotIndex = useMemo(() => {
    const selectedIndex = slots.findIndex((slot) => slot.id === activeSlotId);
    if (selectedIndex >= 0) return selectedIndex;
    const firstFilledIndex = slots.findIndex((slot) => slot.selectedChantIds.length > 0);
    return firstFilledIndex >= 0 ? firstFilledIndex : 0;
  }, [activeSlotId, slots]);
  const activeSlot = slots[activeSlotIndex];
  const activeChantIds = activeSlot?.selectedChantIds ?? [];
  const rememberedChantId = activeSlot ? activeChantBySlot[activeSlot.id] : undefined;
  const currentChantId = rememberedChantId && activeChantIds.includes(rememberedChantId)
    ? rememberedChantId
    : activeChantIds[0];
  const current = currentChantId
    ? queue.find((item) => item._slotId === activeSlot?.id && item.id === currentChantId)
    : undefined;
  const currentIndex = current
    ? queue.findIndex((item) => item._slotId === activeSlot?.id && item.id === current.id)
    : -1;
  const activeChantIndex = currentChantId ? activeChantIds.indexOf(currentChantId) : -1;
  const audioSources = getAudioSources(current);
  const selectedAudioUri = current
    ? selectedAudioByChant[current.id] ?? audioSources[0]?.uri
    : undefined;
  const partitionResources = getPartitionResources(current);

  useEffect(() => {
    listenedSecondsRef.current = 0;
    lastAudioPositionRef.current = null;
    recordedListenRef.current = false;
  }, [current?.id, selectedAudioUri]);

  useEffect(() => {
    if (playback.didJustFinish) {
      listenedSecondsRef.current = 0;
      lastAudioPositionRef.current = null;
      recordedListenRef.current = false;
      return;
    }
    if (!playback.playing || !current || !selectedAudioUri) {
      lastAudioPositionRef.current = null;
      return;
    }

    const previousTime = lastAudioPositionRef.current;
    if (previousTime !== null) {
      const elapsed = playback.currentTime - previousTime;
      if (elapsed > 0 && elapsed <= 1.5) listenedSecondsRef.current += elapsed;
    }
    lastAudioPositionRef.current = playback.currentTime;

    const threshold = playback.duration > 0 ? Math.min(30, playback.duration * 0.8) : 30;
    if (!recordedListenRef.current && listenedSecondsRef.current >= threshold) {
      recordedListenRef.current = true;
      void recordChantListen(current.id).catch((error: unknown) => {
        console.error(`Impossible d’enregistrer l’écoute du chant ${current.id}.`, error);
      });
    }
  }, [
    current,
    playback.currentTime,
    playback.didJustFinish,
    playback.duration,
    playback.playing,
    selectedAudioUri,
  ]);

  useEffect(() => {
    if (!autoStart || autoStartHandled.current) return;
    autoStartHandled.current = true;
    const firstPlayableIndex = queue.findIndex((item) => getAudioSources(item).length > 0);
    if (firstPlayableIndex >= 0) {
      const firstPlayable = queue[firstPlayableIndex];
      setActiveSlotId(firstPlayable._slotId);
      setActiveChantBySlot((selected) => ({
        ...selected,
        [firstPlayable._slotId]: firstPlayable.id,
      }));
      setAutoPlayNext(true);
    }
  }, [autoStart, queue]);

  useEffect(() => {
    player.pause();
    if (selectedAudioUri) player.replace(selectedAudioUri);
  }, [player, selectedAudioUri]);

  useEffect(() => {
    if (!autoPlayNext || !selectedAudioUri || !audioModeReady) return;
    player.play();
    setAutoPlayNext(false);
  }, [player, selectedAudioUri, autoPlayNext, audioModeReady]);

  useEffect(() => {
    if (!playback.didJustFinish) {
      finishedHandled.current = false;
      return;
    }
    if (finishedHandled.current) return;
    finishedHandled.current = true;
    const nextPlayableIndex = queue.findIndex(
      (item, index) => index > currentIndex && getAudioSources(item).length > 0
    );
    if (nextPlayableIndex >= 0) {
      const nextPlayable = queue[nextPlayableIndex];
      setActiveSlotId(nextPlayable._slotId);
      setActiveChantBySlot((selected) => ({
        ...selected,
        [nextPlayable._slotId]: nextPlayable.id,
      }));
      setAutoPlayNext(true);
    }
  }, [playback.didJustFinish, queue, currentIndex]);

  const selectSlot = (index: number) => {
    const slot = slots[index];
    if (!slot) return;
    Haptics.selectionAsync();
    player.pause();
    setAutoPlayNext(false);
    setActiveSlotId(slot.id);
    setActiveChantBySlot((selected) => ({
      ...selected,
      [slot.id]: slot.selectedChantIds[0] ?? '',
    }));
  };

  const selectChant = (chantId: string) => {
    if (!activeSlot) return;
    player.pause();
    setAutoPlayNext(false);
    setActiveChantBySlot((selected) => ({ ...selected, [activeSlot.id]: chantId }));
  };

  const movePart = (direction: -1 | 1) => {
    const nextIndex = activeSlotIndex + direction;
    if (nextIndex < 0 || nextIndex >= slots.length) return;
    selectSlot(nextIndex);
  };

  const moveChant = (direction: -1 | 1) => {
    const nextIndex = activeChantIndex + direction;
    const chantId = activeChantIds[nextIndex];
    if (!chantId) return;
    selectChant(chantId);
  };

  const addChantToActiveSlot = (chant: Chant) => {
    if (!celebration || !activeSlot) return;
    const nextIds = [...activeSlot.selectedChantIds, chant.id];
    setCelebrationSlotChants(celebration.id, getSlotSelectionKey(activeSlot), nextIds);
    setActiveChantBySlot((selected) => ({ ...selected, [activeSlot.id]: chant.id }));
    setChantPickerVisible(false);
    setChantSearch('');
  };

  const pickerOptions = useMemo(() => ({
    query: chantSearch,
    enabled: Boolean(activeSlot),
    preferredCategory: activeSlot?.category,
    excludeIds: activeSlot?.selectedChantIds,
  }), [activeSlot, chantSearch]);
  const {
    items: pickerChants,
    loading: pickerLoading,
    loadingMore: pickerLoadingMore,
    hasMore: pickerHasMore,
    loadMore: loadMorePickerChants,
  } = useLocalChantSearch(pickerOptions, 180);

  const toggleAudio = () => {
    if (!selectedAudioUri || !audioModeReady) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (playback.playing) player.pause();
    else player.play();
  };

  const openPartition = async (resource: ChantResource) => {
    if (resource.kind === 'external') {
      try {
        await Linking.openURL(resource.uri);
      } catch (error) {
        console.error('Impossible d’ouvrir cette partition.', error);
        showLocalizedAlert('Ouverture impossible', 'Cette ressource ne peut pas être ouverte sur cet appareil.');
      }
      return;
    }
    setPartition(resource);
  };

  const currentPartSongs = activeSlot?.selectedChantIds.length ?? 0;
  const celebrationLabel = autoStart ? 'LECTURE DU PROGRAMME' : 'MODE CÉLÉBRATION';
  const openCurrentChant = () => {
    if (current?.id) router.push(`/chant/${current.id}`);
  };
  const modeMenu = (
    <View style={styles.celModeMenu}>
      <Text style={styles.celModeMenuTitle}>Mode d’affichage</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: mediaMode === 'audio' }}
        onPress={() => {
          setMediaMode('audio');
          setModeMenuVisible(false);
        }}
        style={styles.celModeMenuOption}
      >
        <MaterialCommunityIcons name="headphones" size={20} color={theme.textSecondary} />
        <View style={styles.celModeMenuCopy}>
          <Text style={styles.celModeMenuOptionTitle}>Audio</Text>
          <Text style={styles.celModeMenuOptionDetail}>Écouter les chants</Text>
        </View>
        {mediaMode === 'audio' && (
          <MaterialCommunityIcons name="check" size={19} color={TOKENS.gold} />
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: mediaMode === 'partition', disabled: partitionResources.length === 0 }}
        disabled={partitionResources.length === 0}
        onPress={() => {
          if (playback.playing) player.pause();
          setMediaMode('partition');
          setModeMenuVisible(false);
        }}
        style={[
          styles.celModeMenuOption,
          partitionResources.length === 0 && styles.celModeMenuOptionDisabled,
        ]}
      >
        <MaterialCommunityIcons name="music-clef-treble" size={20} color={theme.textSecondary} />
        <View style={styles.celModeMenuCopy}>
          <Text style={styles.celModeMenuOptionTitle}>Partition</Text>
          <Text style={styles.celModeMenuOptionDetail}>
            {partitionResources.length > 0
              ? `${partitionResources.length} document${partitionResources.length === 1 ? '' : 's'} disponible${partitionResources.length === 1 ? '' : 's'}`
              : 'Aucune partition pour ce chant'}
          </Text>
        </View>
        {mediaMode === 'partition' && (
          <MaterialCommunityIcons name="check" size={19} color={TOKENS.gold} />
        )}
      </Pressable>
    </View>
  );

  return (
    <View style={styles.celebrationRoot}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.celSafeArea} edges={['top', 'right', 'bottom', 'left']}>
        <View style={[styles.celHeader, compactLayout && styles.celHeaderCompact]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitter le mode Messe"
            onPress={() => {
              player.pause();
              onExit();
            }}
            style={styles.celExit}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="close" size={22} color="#FFF" />
            <Text style={styles.celExitText}>Fermer</Text>
          </Pressable>
          <View style={styles.celHeaderCopy}>
            <Text numberOfLines={1} style={styles.celEyebrow}>{celebration?.title ?? celebrationLabel}</Text>
            <Text style={styles.celCounter}>
              {autoStart ? 'Lecture automatique' : 'Lecture et sélection'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mode ${mediaMode === 'audio' ? 'audio' : 'partition'}`}
            accessibilityHint="Choisir entre lecture audio et affichage des partitions"
            accessibilityState={{ expanded: modeMenuVisible }}
            onPress={() => setModeMenuVisible(true)}
            style={styles.celModeButton}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name={mediaMode === 'audio' ? 'headphones' : 'music-clef-treble'}
              size={17}
              color={theme.textSecondary}
            />
            <Text style={styles.celModeButtonText}>
              {mediaMode === 'audio' ? 'Audio' : 'Partition'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={17} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          style={[styles.celPartScroller, compactLayout && styles.celPartScrollerCompact]}
          contentContainerStyle={styles.celPartList}
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Parties de la messe"
        >
          {slots.map((slot, index) => {
            const selected = index === activeSlotIndex;
            return (
              <Pressable
                key={slot.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${slot.title}, ${slot.selectedChantIds.length} chant${slot.selectedChantIds.length === 1 ? '' : 's'}`}
                onPress={() => selectSlot(index)}
                style={[styles.celPartButton, selected && styles.celPartButtonActive]}
              >
                <View style={[styles.celPartDot, { backgroundColor: slot.color }]} />
                <Text numberOfLines={1} style={[styles.celPartButtonText, selected && styles.celPartButtonTextActive]}>
                  {slot.title}
                </Text>
                <Text style={[styles.celPartCount, selected && styles.celPartCountActive]}>
                  {slot.selectedChantIds.length}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.celSelectionArea, compactLayout && styles.celSelectionAreaCompact]}>
          <View style={styles.celSectionHeading}>
            <View style={styles.celSectionHeadingCopy}>
              <Text style={styles.celSelectedBlock}>{activeSlot?.blockLabel?.toUpperCase() ?? 'MESSE'}</Text>
              <Text numberOfLines={1} style={styles.celSelectedPart}>{activeSlot?.title ?? 'Aucune partie'}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ajouter un chant à ${activeSlot?.title ?? 'cette partie'}`}
              onPress={() => setChantPickerVisible(true)}
              disabled={!activeSlot}
              style={styles.celAddButton}
            >
              <MaterialCommunityIcons name="plus" size={19} color="#FFF" />
              <Text style={styles.celAddText}>Ajouter</Text>
            </Pressable>
          </View>

          {currentPartSongs > 0 && (
            <ScrollView
              horizontal
              contentContainerStyle={styles.celSongList}
              showsHorizontalScrollIndicator={false}
              accessibilityLabel={`Chants de ${activeSlot?.title}`}
            >
              {activeSlot?.selectedChantIds.map((chantId, index) => {
                const song = chants.find((chant) => chant.id === chantId);
                if (!song) return null;
                const selected = chantId === current?.id;
                return (
                  <Pressable
                    key={chantId}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => selectChant(chantId)}
                    style={[styles.celSongChip, selected && styles.celSongChipActive]}
                  >
                    <Text style={[styles.celSongIndex, selected && styles.celSongIndexActive]}>{index + 1}</Text>
                    <Text numberOfLines={1} style={[styles.celSongChipText, selected && styles.celSongChipTextActive]}>
                      {song.titre}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {current ? (
          <View style={[styles.celSongHeading, compactLayout && styles.celSongHeadingCompact]}>
            <View style={styles.celTitleRow}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={styles.celTitle}>{current.titre}</Text>
                {current.auteur && <Text numberOfLines={1} style={styles.celAuthor}>{current.auteur}</Text>}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir les paroles de ${current.titre}`}
                onPress={openCurrentChant}
                style={styles.celReadButton}
              >
                <MaterialCommunityIcons name="book-open-variant" size={16} color="#FFF" />
                <Text style={styles.celReadButtonText}>Voir</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.celNoSongHeading}>
            <MaterialCommunityIcons name="music-note-plus" size={24} color={TOKENS.gold} />
            <Text style={styles.celNoSongTitle}>Aucun chant dans cette partie</Text>
            <Text style={styles.celNoSongHelp}>Ajoutez un chant sans quitter le mode Messe.</Text>
            <Pressable onPress={() => setChantPickerVisible(true)} style={styles.celEmptyAddButton}>
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.celEmptyAddText}>Choisir un chant</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.celLyricsArea, compactLayout && styles.celLyricsAreaCompact]}>
          <View style={styles.celLyricsHeading}>
            <Text style={[styles.celSectionTitle, compactLayout && styles.celSectionTitleCompact]}>PAROLES</Text>
            {current && currentPartSongs > 1 && (
              <Text style={styles.celLyricsPosition}>{activeChantIndex + 1} / {currentPartSongs}</Text>
            )}
          </View>
          {current ? (
            <ScrollView
              key={`${activeSlot?.id}-${current.id}`}
              style={styles.celLyricsScroll}
              contentContainerStyle={styles.celLyricsContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <Text selectable style={[styles.celLyricsText, compactLayout && styles.celLyricsTextCompact]}>
                {current.paroles?.trim() ? current.paroles : 'Paroles indisponibles pour ce chant.'}
              </Text>
            </ScrollView>
          ) : (
            <View style={styles.celEmptyLyrics}>
              <Text style={styles.celEmptyLyricsText}>Les paroles du chant choisi apparaîtront ici.</Text>
            </View>
          )}
        </View>

        {current && mediaMode === 'partition' && (
          <View style={[styles.celPartitionOptions, compactLayout && styles.celAudioDockCompact]}>
            {partitionResources.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.celResourceActions}
              >
                {partitionResources.map((resource) => (
                  <Pressable
                    key={resource.uri}
                    accessibilityRole="button"
                    onPress={() => openPartition(resource)}
                    style={styles.celResourceButton}
                  >
                    <MaterialCommunityIcons name="file-music-outline" size={17} color="#FFF" />
                    <Text numberOfLines={1} style={styles.celResourceText}>{resource.label}</Text>
                    <MaterialCommunityIcons name="open-in-new" size={15} color="#FFF" />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.celUnavailableText}>
                Aucune partition disponible pour ce chant.
              </Text>
            )}
          </View>
        )}

        {current && mediaMode === 'audio' && (
          <View style={[styles.celAudioDock, compactLayout && styles.celAudioDockCompact]}>
            {audioSources.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.celMediaOptions}>
                {audioSources.map((source) => (
                  <Pressable
                    key={source.uri}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedAudioUri === source.uri }}
                    onPress={() => {
                      player.pause();
                      setSelectedAudioByChant((selected) => ({ ...selected, [current.id]: source.uri }));
                    }}
                    style={[styles.celMediaOption, selectedAudioUri === source.uri && styles.celMediaOptionActive]}
                  >
                    <Text numberOfLines={1} style={styles.celMediaOptionText}>{source.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {selectedAudioUri ? (
              <>
                <View style={styles.celAudioRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Chant précédent dans cette partie"
                    disabled={activeChantIndex <= 0}
                    onPress={() => moveChant(-1)}
                    style={[styles.celTrackButton, activeChantIndex <= 0 && styles.celDisabledButton]}
                  >
                    <MaterialCommunityIcons name="skip-previous" size={21} color="#FFF" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={playback.playing ? 'Mettre en pause' : 'Lire le chant'}
                    accessibilityState={{ disabled: !audioModeReady }}
                    disabled={!audioModeReady}
                    onPress={toggleAudio}
                    style={[styles.celPlayBtn, !audioModeReady && styles.celDisabledButton]}
                  >
                    <MaterialCommunityIcons name={playback.playing ? 'pause' : 'play'} size={25} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Chant suivant dans cette partie"
                    disabled={activeChantIndex < 0 || activeChantIndex >= activeChantIds.length - 1}
                    onPress={() => moveChant(1)}
                    style={[styles.celTrackButton, (activeChantIndex < 0 || activeChantIndex >= activeChantIds.length - 1) && styles.celDisabledButton]}
                  >
                    <MaterialCommunityIcons name="skip-next" size={21} color="#FFF" />
                  </Pressable>
                  <Text numberOfLines={1} style={styles.celAudioStatus}>
                    {audioModeError ?? (!audioModeReady
                      ? 'Initialisation audio…'
                      : playback.error
                        ? `Lecture impossible : ${playback.error}`
                        : playback.isBuffering
                          ? 'Chargement…'
                          : playback.isLoaded
                            ? `${formatAudioTime(playback.currentTime)} / ${formatAudioTime(playback.duration)}`
                            : 'Audio prêt')}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="adjustable"
                  accessibilityLabel="Progression audio"
                  onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
                  onPress={(event) => {
                    if (playback.duration <= 0 || progressWidth <= 0) return;
                    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / progressWidth));
                    void player.seekTo(ratio * playback.duration);
                  }}
                  style={styles.celProgressTrack}
                >
                  <View style={[styles.celProgressFill, { width: `${playback.duration > 0 ? Math.min(100, playback.currentTime / playback.duration * 100) : 0}%` }]} />
                </Pressable>
              </>
            ) : (
              <Text style={styles.celUnavailableText}>Aucun audio disponible pour ce chant</Text>
            )}
          </View>
        )}

        <View style={[styles.celPartNavigation, compactLayout && styles.celPartNavigationCompact]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Partie précédente"
            disabled={activeSlotIndex <= 0}
            onPress={() => movePart(-1)}
            style={[styles.celPartNavButton, compactLayout && styles.celPartNavButtonCompact, activeSlotIndex <= 0 && styles.celDisabledButton]}
          >
            <MaterialCommunityIcons name="chevron-left" size={23} color="#FFFFFF" />
            <Text style={styles.celPartNavText}>Précédent</Text>
          </Pressable>
          <Text style={styles.celPartNavCounter}>{activeSlotIndex + 1} / {slots.length}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Partie suivante"
            disabled={activeSlotIndex >= slots.length - 1}
            onPress={() => movePart(1)}
            style={[styles.celPartNavButton, compactLayout && styles.celPartNavButtonCompact, styles.celPartNavNext, activeSlotIndex >= slots.length - 1 && styles.celDisabledButton]}
          >
            <Text style={styles.celPartNavText}>Suivant</Text>
            <MaterialCommunityIcons name="chevron-right" size={23} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      {Platform.OS === 'ios'
        ? modeMenuVisible && (
            <View style={[styles.celModeMenuOverlay, styles.celModeMenuOverlayInline]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer le menu de mode"
                onPress={() => setModeMenuVisible(false)}
                style={StyleSheet.absoluteFill}
              />
              <View style={{ marginTop: insets.top + 52 }}>{modeMenu}</View>
            </View>
          )
        : (
            <Modal
              visible={modeMenuVisible}
              transparent
              animationType="fade"
              statusBarTranslucent
              onRequestClose={() => setModeMenuVisible(false)}
            >
              <View style={styles.celModeMenuOverlay}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fermer le menu de mode"
                  onPress={() => setModeMenuVisible(false)}
                  style={StyleSheet.absoluteFill}
                />
                <View style={{ marginTop: insets.top + 52 }}>{modeMenu}</View>
              </View>
            </Modal>
          )}

      <Modal
        visible={chantPickerVisible}
        animationType="slide"
        onRequestClose={() => setChantPickerVisible(false)}
      >
        <SafeAreaView style={styles.celPickerRoot} edges={['top', 'bottom']}>
          <View style={styles.celPickerHeader}>
            <View style={styles.celPickerCopy}>
              <Text style={styles.celPickerTitle}>Ajouter un chant</Text>
              <Text style={styles.celPickerSubtitle}>{activeSlot?.title ?? ''}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer la sélection" onPress={() => setChantPickerVisible(false)} style={styles.celPickerClose}>
              <MaterialCommunityIcons name="close" size={23} color={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.celPickerSearch}>
            <MaterialCommunityIcons name="magnify" size={20} color={ActionColors.discovery} />
            <TextInput
              accessibilityLabel="Rechercher un chant"
              value={chantSearch}
              onChangeText={setChantSearch}
              placeholder="Titre, paroles ou auteur"
              placeholderTextColor="#6A7380"
              style={styles.celPickerInput}
            />
          </View>
          <ScrollView contentContainerStyle={styles.celPickerList}>
            {pickerLoading && pickerChants.length === 0 && (
              <Text style={styles.celPickerEmpty}>Recherche dans la bibliothèque locale…</Text>
            )}
            {pickerChants.map((chant) => (
              <Pressable key={chant.id} onPress={() => addChantToActiveSlot(chant)} style={styles.celPickerItem}>
                <View style={styles.celPickerItemIcon}>
                  <MaterialCommunityIcons name="music-note" size={19} color={TOKENS.gold} />
                </View>
                <View style={styles.celPickerItemCopy}>
                  <Text numberOfLines={1} style={styles.celPickerItemTitle}>{chant.titre}</Text>
                  <Text numberOfLines={1} style={styles.celPickerItemMeta}>
                    {chant.categorie.replaceAll('_', ' ')} · {chant.langue.toUpperCase()}
                  </Text>
                </View>
                <MaterialCommunityIcons name="plus-circle-outline" size={21} color={TOKENS.gold} />
              </Pressable>
            ))}
            {pickerChants.length === 0 && (
              !pickerLoading && <Text style={styles.celPickerEmpty}>Aucun autre chant ne correspond à cette recherche.</Text>
            )}
            {pickerHasMore && (
              <Pressable accessibilityRole="button" onPress={() => { void loadMorePickerChants(); }} style={styles.celPickerItem}>
                <Text style={styles.celPickerItemTitle}>{pickerLoadingMore ? 'Chargement…' : 'Charger plus'}</Text>
              </Pressable>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={partition !== null}
        animationType="slide"
        onRequestClose={() => setPartition(null)}
      >
        <SafeAreaView style={styles.celPartitionRoot} edges={['top', 'bottom']}>
          <View style={styles.celPartitionHeader}>
            <Text numberOfLines={1} style={styles.celPartitionTitle}>
              {partition?.label ?? 'Partition'}
            </Text>
            <Pressable onPress={() => setPartition(null)} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>
          {partition?.kind === 'pdf' ? (
            <WebView
              source={{ uri: partition.uri }}
              style={styles.celPartitionViewer}
              onError={(event) => {
                console.error('Impossible de charger la partition PDF.', event.nativeEvent);
                showLocalizedAlert('Chargement impossible', 'La partition PDF ne peut pas être affichée.');
              }}
            />
          ) : partition?.kind === 'image' ? (
            <ScrollView contentContainerStyle={styles.celPartitionImageContainer}>
              <Image
                source={{ uri: partition.uri }}
                resizeMode="contain"
                style={styles.celPartitionImage}
                onError={(event) => {
                  console.error('Impossible de charger la partition image.', event.nativeEvent.error);
                  showLocalizedAlert('Chargement impossible', 'La partition image ne peut pas être affichée.');
                }}
              />
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ============ UTILITAIRES ============
function formatAudioTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function formatDateLong(date: string, language: 'fr' | 'en'): string {
  const d = new Date(date);
  return d
    .toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase();
}

// ============ STYLES ============
const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: TOKENS.paper },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 1 },
  preparationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 17, fontWeight: '600',
    color: TOKENS.ink, letterSpacing: -0.2,
  },
  headerSub: { fontSize: 11, color: TOKENS.inkMuted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  progressTrack: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: TOKENS.paperDeep,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5, borderRadius: 3,
    backgroundColor: TOKENS.gold,
  },
  progressLabel: {
    fontSize: 11, fontWeight: '700',
    color: TOKENS.gold, letterSpacing: 0.2,
  },

  content: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    gap: 16,
  },
  addMomentButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: TOKENS.teal,
  },
  addMomentButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  magicBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: TOKENS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  magicGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  magicIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  magicCopy: { flex: 1, gap: 2 },
  magicTitle: {
    fontFamily: 'serif',
    fontSize: 16, fontWeight: '700',
    color: '#FFF', letterSpacing: -0.2,
  },
  magicSub: {
    fontSize: 11, color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },

  block: {
    backgroundColor: TOKENS.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
    overflow: 'hidden',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  blockActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  blockBar: { width: 14, height: 2.5, borderRadius: 2 },
  blockLabel: {
    fontSize: 10, fontWeight: '800',
    letterSpacing: 1.8, color: TOKENS.inkMuted,
  },
  blockBody: { paddingBottom: 6 },
  removeMomentButton: { marginLeft: 'auto', padding: 2 },
  customMomentSong: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F5F1F3',
  },
  inlineRemoveButton: { paddingLeft: 2 },
  customMomentLanguage: { color: TOKENS.inkMuted, fontSize: 10, marginLeft: 'auto' },
  customMomentAddSong: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
  },
  customMomentAddSongText: { color: TOKENS.gold, fontSize: 12, fontWeight: '700' },

  slot: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TOKENS.rule,
  },
  slotMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  slotNumber: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: TOKENS.rule,
    backgroundColor: TOKENS.paper,
  },
  slotNumberText: {
    fontFamily: 'serif',
    fontSize: 13, fontWeight: '700',
    color: TOKENS.inkMuted,
  },
  slotCopy: { flex: 1, gap: 3 },
  slotTitle: {
    fontSize: 14, fontWeight: '700',
    color: TOKENS.ink, letterSpacing: -0.1,
  },
  slotSubtitle: { fontSize: 11, color: TOKENS.inkMuted },
  slotChant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F5F1F3',
  },
  slotChantTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.ink,
    fontStyle: 'italic',
  },
  slotChantLang: { fontSize: 11 },
  slotAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: TOKENS.paperDeep,
  },
  slotAddText: {
    fontSize: 10.5, fontWeight: '700',
    letterSpacing: 0.2,
  },
  slotActions: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reorderButton: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  reorderButtonDisabled: { opacity: 0.45 },
  slotAction: {
    width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center',
  },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: TOKENS.ink,
  },
  primaryBtnText: {
    color: '#FFF', fontSize: 13.5,
    fontWeight: '700', letterSpacing: 0.2,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
  },
  secondaryBtnText: {
    color: TOKENS.ink, fontSize: 13, fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  resetText: {
    fontSize: 11.5, color: TOKENS.inkMuted, fontWeight: '600',
  },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    maxHeight: '88%',
    backgroundColor: TOKENS.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
  },
  preparationSheet: {
    maxHeight: '82%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: TOKENS.paper,
  },
  preparationSheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  newPreparationButton: {
    minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 8, borderRadius: 13, backgroundColor: TOKENS.gold,
  },
  newPreparationLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  preparationList: { gap: 7, paddingBottom: 8 },
  preparationRow: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: TOKENS.rule,
    borderRadius: 13, backgroundColor: TOKENS.surface,
  },
  preparationRowActive: { borderColor: TOKENS.gold, backgroundColor: `${TOKENS.gold}0A` },
  preparationSelect: { flex: 1, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  preparationCopy: { flex: 1, gap: 4 },
  preparationName: { color: TOKENS.ink, fontSize: 13, fontWeight: '700' },
  preparationMeta: { color: TOKENS.inkMuted, fontSize: 10 },
  removeButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  renameButton: { borderRadius: 10, backgroundColor: '#F3F4F6' },
  keyboardAvoidingFill: { flex: 1 },
  createPreparationOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  createPreparationCard: {
    width: '100%', maxWidth: 420, gap: 10, padding: 20, borderRadius: 20, backgroundColor: TOKENS.paper,
  },
  createPreparationTitle: { color: TOKENS.ink, fontSize: 19, fontWeight: '800' },
  createPreparationSubtitle: { color: TOKENS.inkMuted, fontSize: 12 },
  createPreparationInput: {
    minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: TOKENS.rule,
    borderRadius: 12, color: TOKENS.ink, fontSize: 14,
  },
  createPreparationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  createCancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14 },
  createCancelLabel: { color: TOKENS.inkMuted, fontSize: 13, fontWeight: '700' },
  createConfirmButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 11, backgroundColor: TOKENS.gold },
  createConfirmLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  createDisabledButton: { opacity: 0.45 },
  customMomentSheet: {
    gap: 16,
    backgroundColor: TOKENS.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
  },
  customMomentInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.rule,
    color: TOKENS.ink,
    fontSize: 14,
  },
  disabledButton: { opacity: 0.45 },
  sheetHandle: {
    width: 42, height: 5, borderRadius: 3,
    backgroundColor: TOKENS.inkSubtle,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.5,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sheetHeadingCopy: { flex: 1, gap: 3 },
  sheetEyebrow: {
    fontSize: 9.5, fontWeight: '800',
    letterSpacing: 1.8, color: TOKENS.gold,
  },
  sheetTitle: {
    fontFamily: 'serif',
    fontSize: 22, fontWeight: '600',
    color: TOKENS.ink, letterSpacing: -0.4,
  },
  sheetSubtitle: { fontSize: 12, color: TOKENS.inkMuted },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
  },
  searchInput: {
    flex: 1, minHeight: 40,
    color: TOKENS.ink, fontSize: 14,
  },

  pickerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  pickerHintText: {
    fontSize: 11, color: TOKENS.inkMuted,
    fontStyle: 'italic',
  },

  pickerList: { marginTop: 4 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TOKENS.rule,
  },
  pickerItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  pickerArtwork: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: TOKENS.goldWash,
  },
  pickerCopy: { flex: 1, gap: 2, minWidth: 0 },
  pickerTitle: {
    fontSize: 14, fontWeight: '700',
    color: TOKENS.ink, letterSpacing: -0.1,
  },
  pickerMeta: { fontSize: 11, color: TOKENS.inkMuted },
  pickerWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pickerWarnText: {
    fontSize: 10, color: TOKENS.gold,
    fontWeight: '600', fontStyle: 'italic',
  },
  pickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
  },
  pickerSecondaryActionText: {
    color: TOKENS.ink,
    fontSize: 10,
    fontWeight: '700',
  },
  pickerPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: TOKENS.gold,
  },
  pickerPrimaryActionText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  pickerSelected: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: TOKENS.gold,
  },
  pickerEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  pickerEmptyText: { fontSize: 13, color: TOKENS.inkMuted },

  // ═══ WIZARD ═══
  wizardRoot: { flex: 1, justifyContent: 'flex-end' },
  wizardSheet: {
    maxHeight: '92%',
    backgroundColor: TOKENS.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingBottom: 14,
    gap: 12,
  },
  wizardHeaderCopy: { flex: 1, gap: 3 },
  wizardEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wizardEyebrow: {
    fontSize: 9.5, fontWeight: '800',
    letterSpacing: 1.8, color: TOKENS.gold,
  },
  wizardTitle: {
    fontFamily: 'serif',
    fontSize: 22, fontWeight: '600',
    color: TOKENS.ink, letterSpacing: -0.4,
  },
  wizardContent: {
    paddingHorizontal: 22,
    paddingBottom: 40,
    gap: 18,
  },

  contextCard: {
    borderRadius: 22, padding: 20, gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 3,
  },
  contextTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contextDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF',
  },
  contextDate: {
    fontSize: 10, fontWeight: '800',
    letterSpacing: 1.5, color: 'rgba(255,255,255,0.9)',
  },
  contextSeason: {
    fontFamily: 'serif',
    fontSize: 24, fontWeight: '600',
    color: '#FFF', letterSpacing: -0.5, marginTop: 4,
  },
  contextTheme: {
    fontSize: 13, color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
  },
  contextGospel: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4,
  },
  contextGospelText: {
    fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600',
  },
  contextKeywords: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8,
  },
  keywordPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  keywordText: {
    fontSize: 10.5, fontWeight: '700',
    color: '#FFF', letterSpacing: 0.2,
  },

  sectionLabel: {
    fontSize: 10, fontWeight: '800',
    letterSpacing: 1.8, color: TOKENS.inkMuted,
    marginTop: 4,
  },
  choiceRow: { flexDirection: 'row', gap: 10 },

  styleCard: {
    flex: 1, padding: 12, borderRadius: 16,
    backgroundColor: TOKENS.surface,
    borderWidth: 1.5, borderColor: TOKENS.rule,
    alignItems: 'center', gap: 6,
  },
  styleCardActive: {
    borderColor: TOKENS.gold, backgroundColor: TOKENS.goldWash,
  },
  styleIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: TOKENS.paperDeep,
  },
  styleLabel: {
    fontSize: 12, fontWeight: '700',
    color: TOKENS.ink, letterSpacing: -0.1,
  },
  styleDesc: { fontSize: 9.5, color: TOKENS.inkMuted },

  langCardWiz: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    backgroundColor: TOKENS.surface,
    borderWidth: 1.5, borderColor: TOKENS.rule,
    alignItems: 'center', gap: 4,
  },
  langCardWizActive: {
    borderColor: TOKENS.gold, backgroundColor: TOKENS.goldWash,
  },
  langLabelWiz: { fontSize: 11, fontWeight: '700', color: TOKENS.ink },

  preview: {
    borderRadius: 18,
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
    overflow: 'hidden',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TOKENS.rule,
  },
  previewIndex: {
    fontFamily: 'serif',
    fontSize: 13, fontWeight: '600',
    color: TOKENS.inkSubtle, width: 22,
  },
  previewCopy: { flex: 1, gap: 1 },
  previewTitle: {
    fontSize: 11, fontWeight: '700',
    color: TOKENS.inkMuted,
    letterSpacing: 0.3, textTransform: 'uppercase',
  },
  previewChant: {
    fontSize: 13, fontWeight: '600', color: TOKENS.ink,
  },
  previewEmpty: {
    fontSize: 12, color: TOKENS.inkMuted, fontStyle: 'italic',
  },
  previewReason: { maxWidth: 100 },
  previewReasonText: {
    fontSize: 9, color: TOKENS.gold,
    fontStyle: 'italic', textAlign: 'right',
  },

  statsRowWiz: { flexDirection: 'row', gap: 10 },
  statBoxWiz: {
    flex: 1, alignItems: 'center', gap: 3,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: TOKENS.paperDeep,
  },
  statValueWiz: {
    fontFamily: 'serif',
    fontSize: 16, fontWeight: '600', color: TOKENS.ink,
  },
  statLabelWiz: {
    fontSize: 9.5, color: TOKENS.inkMuted,
    letterSpacing: 0.3, textTransform: 'uppercase',
  },

  wizardActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16,
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.rule,
  },
  regenText: { fontSize: 13, fontWeight: '700', color: TOKENS.ink },
  adoptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: TOKENS.ink,
  },
  adoptText: {
    color: '#FFF', fontSize: 13.5,
    fontWeight: '700', letterSpacing: 0.2,
  },

  // ═══ MODE CÉLÉBRATION ═══
  celebrationRoot: { flex: 1, backgroundColor: '#000000' },
  celSafeArea: { flex: 1, minHeight: 0, backgroundColor: '#000000' },
  celHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  celHeaderCompact: { paddingVertical: 2 },
  celExit: {
    minWidth: 84, height: 42, flexDirection: 'row', gap: 5, paddingHorizontal: 10,
    borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  celExitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  celHeaderCopy: { flex: 1, alignItems: 'flex-start', gap: 2 },
  celModeButton: {
    minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 10, borderRadius: 13, backgroundColor: '#F3F5F8',
  },
  celModeButtonText: { color: TOKENS.ink, fontSize: 11, fontWeight: '700' },
  celEyebrow: {
    maxWidth: 260, fontSize: 10, fontWeight: '800',
    letterSpacing: 1.2, color: 'rgba(255,255,255,0.7)',
  },
  celCounter: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)',
  },
  celPartScroller: { flexGrow: 0, flexShrink: 0, maxHeight: 54, backgroundColor: '#000000' },
  celPartScrollerCompact: { maxHeight: 44 },
  celPartList: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  celPartButton: {
    minHeight: 36, maxWidth: 190, flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 10, borderRadius: 11, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  celPartButtonActive: { borderColor: TOKENS.gold, backgroundColor: 'rgba(122,31,61,0.35)' },
  celPartDot: { width: 6, height: 6, borderRadius: 3 },
  celPartButtonText: { maxWidth: 135, color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  celPartButtonTextActive: { color: '#FFFFFF', fontWeight: '800' },
  celPartCount: { minWidth: 16, color: 'rgba(255,255,255,0.65)', fontSize: 10, textAlign: 'center' },
  celPartCountActive: { color: '#FFFFFF' },
  celSelectionArea: { paddingHorizontal: 16, paddingTop: 6, gap: 8, backgroundColor: '#000000' },
  celSelectionAreaCompact: { paddingTop: 2, gap: 4 },
  celSectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  celSectionHeadingCopy: { flex: 1, gap: 2 },
  celSelectedBlock: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  celSelectedPart: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  celAddButton: {
    minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, borderRadius: 10, backgroundColor: TOKENS.gold,
  },
  celAddText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  celSongList: { flexDirection: 'row', gap: 7, paddingBottom: 2 },
  celSongChip: {
    maxWidth: 230, minHeight: 33, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  celSongChipActive: { backgroundColor: 'rgba(122,31,61,0.38)' },
  celSongIndex: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' },
  celSongIndexActive: { color: '#FFFFFF' },
  celSongChipText: { maxWidth: 185, color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '600' },
  celSongChipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  celSongHeading: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6, gap: 4, backgroundColor: '#000000' },
  celSongHeadingCompact: { paddingTop: 4, paddingBottom: 3, gap: 2 },
  celTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  celReadButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: TOKENS.gold,
  },
  celReadButtonText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  celNoSongHeading: { minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 18, backgroundColor: '#000000' },
  celNoSongTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  celNoSongHelp: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center' },
  celEmptyAddButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, paddingHorizontal: 11, borderRadius: 10, backgroundColor: TOKENS.gold },
  celEmptyAddText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  celLyricsArea: {
    flex: 1, minHeight: 100, marginHorizontal: 16, marginTop: 4, marginBottom: 4,
    paddingHorizontal: 16, paddingTop: 13, borderRadius: 15, backgroundColor: '#111111',
  },
  celLyricsAreaCompact: {
    minHeight: 0, marginTop: 2, marginBottom: 2, paddingHorizontal: 12, paddingTop: 7,
  },
  celLyricsHeading: { minHeight: 24, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  celLyricsPosition: { color: '#667489', fontSize: 11, fontWeight: '600' },
  celLyricsScroll: { flex: 1, minHeight: 0 },
  celLyricsContent: { flexGrow: 1, paddingBottom: 18 },
  celEmptyLyrics: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  celEmptyLyricsText: { color: '#67768A', fontSize: 13, textAlign: 'center' },
  celAudioDock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 5, gap: 3, backgroundColor: '#000000' },
  celAudioDockCompact: { paddingTop: 1, paddingBottom: 2, gap: 1 },
  celPartitionOptions: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 3, backgroundColor: '#000000' },
  celModeMenuOverlay: {
    flex: 1, alignItems: 'flex-end', paddingHorizontal: 12, backgroundColor: 'rgba(11, 20, 35, 0.12)',
  },
  celModeMenuOverlayInline: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, elevation: 20,
  },
  celModeMenu: {
    width: 270, padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF',
    shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  celModeMenuTitle: { paddingHorizontal: 8, paddingBottom: 7, color: TOKENS.ink, fontSize: 11, fontWeight: '800' },
  celModeMenuOption: {
    minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 8, borderRadius: 11,
  },
  celModeMenuOptionDisabled: { opacity: 0.45 },
  celModeMenuCopy: { flex: 1, gap: 3 },
  celModeMenuOptionTitle: { color: TOKENS.ink, fontSize: 13, fontWeight: '700' },
  celModeMenuOptionDetail: { color: '#697386', fontSize: 10 },
  celAudioRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  celPartNavigation: {
    minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)', backgroundColor: '#000000',
  },
  celPartNavigationCompact: { minHeight: 44, paddingVertical: 2 },
  celPartNavButton: { minWidth: 112, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 11, backgroundColor: '#F0F2F5' },
  celPartNavButtonCompact: { minHeight: 34 },
  celPartNavNext: { backgroundColor: TOKENS.gold },
  celPartNavText: { color: TOKENS.ink, fontSize: 11, fontWeight: '700' },
  celPartNavCounter: { color: '#77829A', fontSize: 11, fontWeight: '700' },
  celDisabledButton: { opacity: 0.35 },
  celPickerRoot: { flex: 1, backgroundColor: '#F7F8FA' },
  celPickerHeader: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  celPickerCopy: { flex: 1, gap: 3 },
  celPickerTitle: { color: TOKENS.ink, fontSize: 19, fontWeight: '800' },
  celPickerSubtitle: { color: '#697386', fontSize: 12 },
  celPickerClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  celPickerSearch: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 11, borderWidth: 1, borderColor: '#DDE1E8', borderRadius: 11, backgroundColor: '#FFFFFF' },
  celPickerInput: { flex: 1, minHeight: 42, color: TOKENS.ink, fontSize: 13 },
  celPickerList: { padding: 16, gap: 8 },
  celPickerItem: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF' },
  celPickerItemIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#7A1F3D18' },
  celPickerItemCopy: { flex: 1, gap: 4 },
  celPickerItemTitle: { color: TOKENS.ink, fontSize: 13, fontWeight: '700' },
  celPickerItemMeta: { color: '#697386', fontSize: 11, textTransform: 'capitalize' },
  celPickerEmpty: { color: '#697386', fontSize: 13, textAlign: 'center', padding: 24 },
  celContent: { flex: 1 },
  celContentInner: { paddingHorizontal: 18, paddingBottom: 28 },
  celBody: { alignItems: 'center', gap: 12, paddingTop: 12 },
  celEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  celEmptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  celBlockBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12,
  },
  celBlockText: {
    color: '#FFF', fontSize: 9.5,
    fontWeight: '800', letterSpacing: 1.5,
  },
  celSlot: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700',
  },
  celTitle: {
    fontFamily: 'serif',
    fontSize: 23, fontWeight: '700',
    color: '#FFF', textAlign: 'left',
    letterSpacing: -0.3, lineHeight: 28,
  },
  celAuthor: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic',
  },
  celMediaOptions: {
    flexDirection: 'row', alignItems: 'center',
    gap: 7, marginTop: 2, paddingBottom: 3,
  },
  celMediaOption: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  celMediaOptionActive: { borderColor: TOKENS.gold, backgroundColor: 'rgba(122,31,61,0.25)' },
  celMediaOptionText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  celAudioControls: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 22, marginTop: 2,
  },
  celTrackButton: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  celPlayBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: TOKENS.gold,
    shadowColor: TOKENS.gold,
    shadowOpacity: 0.35, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  celProgressTrack: {
    width: '100%', height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden',
  },
  celProgressFill: { height: '100%', backgroundColor: TOKENS.gold },
  celAudioStatus: {
    color: 'rgba(255,255,255,0.65)', fontSize: 11,
    flex: 1, textAlign: 'right', minHeight: 16,
  },
  celUnavailable: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 12,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  celUnavailableText: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  celResourceActions: {
    flexDirection: 'row', alignItems: 'center',
    gap: 7, paddingVertical: 3,
  },
  celResourceButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  celResourceText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  celResourceMissing: { color: 'rgba(255,255,255,0.5)', fontSize: 11, paddingVertical: 8 },
  celLyricsCard: {
    width: '100%', marginTop: 8, padding: 18, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  celSectionTitle: {
    color: 'rgba(255,255,255,0.55)', fontSize: 10,
    fontWeight: '800', letterSpacing: 1.8, marginBottom: 14,
  },
  celSectionTitleCompact: { marginBottom: 4 },
  celLyricsText: {
    width: '100%', maxWidth: 760, alignSelf: 'center',
    fontSize: 17, lineHeight: 29, letterSpacing: 0.1,
    color: 'rgba(255,255,255,0.93)', textAlign: 'left',
  },
  celLyricsTextCompact: { fontSize: 15, lineHeight: 23 },
  celProgram: { width: '100%', marginTop: 28 },
  celProgramTitle: {
    color: '#FFF', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.8, marginBottom: 12,
  },
  celProgramSection: {
    marginBottom: 10, padding: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  celProgramHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  celProgramMark: { width: 4, height: 32, borderRadius: 2 },
  celProgramHeadingCopy: { flex: 1, gap: 2 },
  celProgramBlock: {
    color: 'rgba(255,255,255,0.48)', fontSize: 9,
    fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase',
  },
  celProgramSlot: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  celProgramCount: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  celQueueItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 42, paddingHorizontal: 9, borderRadius: 10,
  },
  celQueueItemActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  celQueueTitle: { flex: 1, color: '#FFF', fontSize: 12, fontWeight: '600' },
  celQueueAvailability: { color: 'rgba(255,255,255,0.45)', fontSize: 9 },
  celProgramEmpty: {
    color: 'rgba(255,255,255,0.45)', fontSize: 11,
    fontStyle: 'italic', paddingVertical: 7,
  },
  celPartitionRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  celPartitionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
  },
  celPartitionTitle: { flex: 1, color: TOKENS.ink, fontSize: 15, fontWeight: '700', marginRight: 12 },
  celPartitionViewer: { flex: 1, backgroundColor: '#FFFFFF' },
  celPartitionImageContainer: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 12,
  },
  celPartitionImage: { width: '100%', height: 700 },
});