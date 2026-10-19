# Cantique Guinée

Application mobile et web de chants liturgiques, de prières et de préparation de célébrations, réalisée avec React Native, Expo Router et Expo SDK 57.

Le nom technique du projet et son slug Expo restent `EGUINE` pour préserver les liens et l’identité du projet. Le nom affiché de l’application est **Cantique Guinée**.

## Démarrer

Depuis le dossier `EGUINE` :

```bash
npm install
npx expo start
```

Commandes de développement :

```bash
npm run android
npm run ios
npm run web
```

## Identité visuelle

- Logo horizontal : `assets/images/cantique-guinee-logo.png`
- Logo vectoriel : `assets/images/cantique-guinee-logo.svg`
- Icône principale iOS et Android : `assets/images/icon.png`
- Icônes adaptatives Android : `assets/images/android-icon-*.png`
- Icône de lancement : `assets/images/splash-icon.png`
- Favicon web : `assets/images/favicon.png`

Le symbole de l’application associe une croix, un livre ouvert et une note de musique dans la palette bordeaux, ivoire et or. L’écran de lancement et l’attente d’ouverture de la bibliothèque affichent l’illustration fournie représentant une chorale qui chante, mains levées. La signature de marque est « La voix de nos célébrations ».

Expo Go conserve son propre écran de démarrage marqué Expo ; l’écran de lancement personnalisé est appliqué aux builds natifs de Cantique Guinée.

## Langues de l’interface

L’interface est disponible en français et en anglais. Le premier lancement reprend le français ou l’anglais du téléphone lorsqu’il est pris en charge ; sinon, le français est utilisé. La langue peut ensuite être modifiée dans **Réglages → Langue de l’application** et sa préférence est conservée localement. Ce réglage est distinct de la langue préférée des chants.

Les libellés sont centralisés dans `src/i18n/translations.ts`. Les composants `LocalizedText`, `LocalizedTextInput` et `LocalizedPressable` traduisent le texte visible, les champs et les noms accessibles ; les alertes passent par `showLocalizedAlert()`. Le contrôle `npm run test:i18n` vérifie les traductions, l’interpolation et la couverture des libellés statiques. Les traductions et le catalogue de chants fonctionnent hors ligne.

## Vérifications

```bash
npm exec tsc -- --noEmit
npm run test:database
npx expo export --platform all
```

Après une modification de configuration native ou des icônes, reconstruire l’application iOS/Android pour voir le nouveau nom et les nouveaux visuels sur les installations natives.

## Documentation

Voir [`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md) pour l’architecture, les routes, le stockage local et les détails techniques.
