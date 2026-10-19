import type { Celebration } from '@/types';
import { DEFAULT_CELEBRATION_SLOT_IDS } from './celebration-order.ts';

export type CelebrationLanguage = 'fr' | 'en';

export function createInitialCelebration(
  now: Date,
  language: CelebrationLanguage,
): Celebration {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    id: 'messe-first-run',
    title: language === 'en' ? 'My first Mass' : 'Ma première messe',
    date,
    temps_liturgique: 'temps_ordinaire',
    selectedChants: {},
    customMoments: [],
    slotOrder: [...DEFAULT_CELEBRATION_SLOT_IDS],
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    status: 'draft',
  };
}

export function resolveInitialCelebrations(
  savedCelebrations: Celebration[],
  persistedCelebrations: Celebration[],
  hasBootstrappedCelebrations: boolean,
  now: Date,
  language: CelebrationLanguage,
): { celebrations: Celebration[]; hasBootstrappedCelebrations: true } {
  const celebrationsById = new Map(
    savedCelebrations.map((celebration) => [celebration.id, celebration]),
  );
  for (const celebration of persistedCelebrations) {
    celebrationsById.set(celebration.id, celebration);
  }
  if (celebrationsById.size === 0 && !hasBootstrappedCelebrations) {
    const initial = createInitialCelebration(now, language);
    celebrationsById.set(initial.id, initial);
  }
  return {
    celebrations: [...celebrationsById.values()],
    hasBootstrappedCelebrations: true,
  };
}
