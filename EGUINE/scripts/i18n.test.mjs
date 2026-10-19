import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getMissingEnglishTranslations,
  normalizeInterfaceLanguage,
  translate,
  translateCategory,
} from '../src/i18n/translations.ts';
import { scaleTextStyle } from '../src/utils/scaled-text-style.ts';

test('applies the selected text scale to explicit and default typography', () => {
  assert.equal(scaleTextStyle({ fontSize: 16, lineHeight: 24 }, 0.85).fontSize, 14);
  assert.equal(scaleTextStyle({ fontSize: 16, lineHeight: 24 }, 0.85).lineHeight, 20);
  assert.equal(scaleTextStyle({ fontSize: 16 }, 1.15).fontSize, 18);
  assert.equal(scaleTextStyle({ fontSize: 16 }, 1.3).fontSize, 21);
  assert.equal(scaleTextStyle(undefined, 1.3).fontSize, 18);
});

test('detects supported device languages and falls back to French', () => {
  assert.equal(normalizeInterfaceLanguage('en-US'), 'en');
  assert.equal(normalizeInterfaceLanguage('EN-gb'), 'en');
  assert.equal(normalizeInterfaceLanguage('fr-FR'), 'fr');
  assert.equal(normalizeInterfaceLanguage('es-ES'), 'fr');
  assert.equal(normalizeInterfaceLanguage(undefined), 'fr');
});

test('translates common interface text and leaves French unchanged', () => {
  assert.equal(translate('Réglages', 'en'), 'Settings');
  assert.equal(translate('Réglages', 'fr'), 'Réglages');
  assert.equal(translate('Aucun chant disponible', 'en'), 'No songs available');
  assert.equal(translate('Cantique libre non répertorié', 'en'), 'Cantique libre non répertorié');
});

test('translates app text with surrounding whitespace and interpolated values', () => {
  assert.equal(translate('  Mes chants  ', 'en'), '  My songs  ');
  assert.equal(translate('12 chants ajoutés', 'en'), '12 songs added');
  assert.equal(translate('{{count}} chants ajoutés', 'en', { count: 3 }), '3 songs added');
  assert.equal(translate('Ajouter un chant à Entrée', 'en'), 'Add a song to Entrance');
  assert.equal(translate('Renommer Messe du dimanche', 'en'), 'Rename Messe du dimanche');
  assert.equal(translate('2e dimanche de Carême', 'en'), '2nd Sunday of Lent');
});

test('translates category slugs without changing French mode', () => {
  assert.equal(translateCategory('priere_universelle', 'en'), 'Prayer of the faithful');
  assert.equal(translateCategory('priere_universelle', 'fr'), 'priere universelle');
});

test('reports missing translations and de-duplicates their source strings', () => {
  assert.deepEqual(
    getMissingEnglishTranslations(['Réglages', 'Texte non traduit', 'Texte non traduit']),
    ['Texte non traduit'],
  );
});

test('maps all static screen text and literal accessibility labels', () => {
  const sourceRoot = fileURLToPath(new URL('../src', import.meta.url));
  const visibleStrings = new Set();

  function collectStrings(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        collectStrings(filePath);
      } else if (filePath.endsWith('.tsx')) {
        const source = fs.readFileSync(filePath, 'utf8');
        const jsxText = [...source.matchAll(/>\s*([^<>{}\n]+?)\s*</g)]
          .map((match) => match[1].replace(/\s+/g, ' ').trim());
        const literalProps = [...source.matchAll(
          /(?:placeholder|accessibilityLabel|accessibilityHint|title|label|subtitle)=("([^"]+)"|'([^']+)')/g,
        )].map((match) => match[2] ?? match[3]);
        const optionLabels = [...source.matchAll(
          /(?:label|title|subtitle|description|placeholder|emptyTitle|emptyMessage|buttonText|message|seasonLabel|themeLabel)\s*[:=]\s*(['"])(.*?)\1/g,
        )].map((match) => match[2]);
        const alerts = [...source.matchAll(
          /showLocalizedAlert\(\s*(['"])(.*?)\1\s*(?:,\s*(['"])(.*?)\3)?/gs,
        )].flatMap((match) => [match[2], match[4]].filter(Boolean));

        for (const value of [
          ...jsxText,
          ...literalProps,
          ...optionLabels,
          ...alerts,
        ]) {
          if (value && /[A-Za-zÀ-ÿ]/.test(value)
            && !/[{}=()]/.test(value)
            && !value.includes('&&')
            && !value.includes('||')) {
            visibleStrings.add(value);
          }
        }
      }
    }
  }

  collectStrings(path.join(sourceRoot, 'app'));
  collectStrings(path.join(sourceRoot, 'components'));
  assert.deepEqual(getMissingEnglishTranslations([...visibleStrings]), []);
});
