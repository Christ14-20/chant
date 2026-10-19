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

Le symbole associe une croix, un livre ouvert et une note de musique dans la palette bordeaux, ivoire et or. La signature est « La voix de nos célébrations ».

## Vérifications

```bash
npm exec tsc -- --noEmit
npm run test:database
npx expo export --platform all
```

Après une modification de configuration native ou des icônes, reconstruire l’application iOS/Android pour voir le nouveau nom et les nouveaux visuels sur les installations natives.

## Documentation

Voir [`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md) pour l’architecture, les routes, le stockage local et les détails techniques.
