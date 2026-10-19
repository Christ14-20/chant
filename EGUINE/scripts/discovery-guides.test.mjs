import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCOVERY_GUIDES,
  WELCOME_STEPS,
  getDiscoveryGuide,
  normalizeDiscoveryPath,
} from '../src/utils/discovery-guides.ts';
import { getMissingEnglishTranslations, translate } from '../src/i18n/translations.ts';

test('normalizes tab routes and route indexes before resolving screen guides', () => {
  assert.equal(normalizeDiscoveryPath('/(tabs)/home/index'), '/home');
  assert.equal(getDiscoveryGuide('/(tabs)/favoris/index')?.id, 'favorites');
  assert.equal(getDiscoveryGuide('/chant/category/langue/soussou')?.id, 'categories');
  assert.equal(getDiscoveryGuide('/chant/chant-1/partition')?.id, 'chantResource');
  assert.equal(getDiscoveryGuide('/mes-chants/nouveau')?.id, 'newPersonalSong');
  assert.equal(getDiscoveryGuide('/lecture')?.id, 'liturgy');
  assert.equal(getDiscoveryGuide('/connexion')?.id, 'login');
  assert.equal(getDiscoveryGuide('/unknown-screen'), undefined);
});

test('each guided screen has distinct, translated offline copy', () => {
  const ids = DISCOVERY_GUIDES.map((guide) => guide.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    getMissingEnglishTranslations([
      ...WELCOME_STEPS.flatMap(({ title, description }) => [title, description]),
      ...DISCOVERY_GUIDES.flatMap(({ title, description }) => [title, description]),
      'Passer',
      'Suivant',
      'Précédent',
      'Commencer',
      'Terminé',
      'Étape {{current}} sur {{total}}',
    ]),
    [],
  );
  assert.equal(translate('Étape {{current}} sur {{total}}', 'en', { current: 1, total: 3 }), 'Step 1 of 3');
});
