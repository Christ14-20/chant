import type { Categorie, Langue, TempsLiturgique } from '@/types';
import { ActionColors } from '@/constants/theme';

export type ContentType = 'all' | 'chants' | 'prieres' | 'lectures';
export type DurationFilter = 'short' | 'medium' | 'long' | 'veryLong';
export type SortOption =
  | 'recent'
  | 'mostPlayed'
  | 'mostLiked'
  | 'titleAsc'
  | 'titleDesc'
  | 'durationAsc'
  | 'durationDesc';

export type ChantFilters = {
  contentType: ContentType;
  categories: string[];
  languages: string[];
  seasons: string[];
  moods: string[];
  occasions: string[];
  durations: DurationFilter[];
  audioOnly: boolean;
  lyricsOnly: boolean;
  partitionOnly: boolean;
  downloadedOnly: boolean;
};

export const EMPTY_FILTERS: ChantFilters = {
  contentType: 'all',
  categories: [],
  languages: [],
  seasons: [],
  moods: [],
  occasions: [],
  durations: [],
  audioOnly: false,
  lyricsOnly: false,
  partitionOnly: false,
  downloadedOnly: false,
};

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'recent', label: 'Ajoutés récemment' },
  { id: 'mostPlayed', label: 'Plus écoutés' },
  { id: 'mostLiked', label: 'Plus appréciés' },
  { id: 'titleAsc', label: 'Titre A → Z' },
  { id: 'titleDesc', label: 'Titre Z → A' },
  { id: 'durationAsc', label: 'Durée : courte → longue' },
  { id: 'durationDesc', label: 'Durée : longue → courte' },
];

export const DURATIONS: { id: DurationFilter; label: string; min: number; max: number }[] = [
  { id: 'short', label: '< 3 min', min: 0, max: 180 },
  { id: 'medium', label: '3–5 min', min: 180, max: 300 },
  { id: 'long', label: '5–8 min', min: 300, max: 480 },
  { id: 'veryLong', label: '> 8 min', min: 480, max: Number.MAX_SAFE_INTEGER },
];

export const OCCASIONS: string[] = [
  'Messe',
  'Prière personnelle',
  'Prière en famille',
  'Groupe de prière',
  'Adoration',
  'Veillée',
  'Funérailles',
  'Mariage',
  'Baptême',
  'Première communion',
];

export function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function normalizeLabel(value: string): string {
  return value.replaceAll('_', ' ').toLocaleLowerCase();
}

export const COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  gold: ActionColors.primary,
  text: '#0A1F44',
  muted: '#0A1F44',
  border: '#FFFFFF',
};

export type CategoryOption = { value: Categorie; label: string };
export type LanguageOption = { id: string; label: string; code: Langue };
export type MoodOption = { id: string; label: string; icon: string; color?: string };
