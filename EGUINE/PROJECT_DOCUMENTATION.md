# Cantique Guinée — Documentation Complète du Projet

> **Projet** : Cantique Guinée (nom technique du projet : EGUINE) — Application de chants liturgiques
> **Stack** : React Native + Expo Router + Expo SDK 57
> **Langage** : TypeScript
> **État** : Produit fonctionnel avec base SQLite locale, catalogue unifié, historique, recherche locale et préparation de Messe
> **Dernière mise à jour** : 2026-10-19

---

## 1. Architecture Générale

### 1.1 Structure de dossiers

```
EGUINE/
├── app.json                  # Config Expo et métadonnées de l’app
├── app.config.*              # Fichiers de config exposés éventuels (non centralisés ici)
├── package.json              # Dépendances, scripts de lancement et tests
├── babel.config.js           # Babel preset expo
├── metro.config.js           # Metro config avec shims web
├── tsconfig.json             # TypeScript config
├── scripts/
│   └── chant-database.test.mjs # Tests SQLite / migrations / recherche locale
├── src/
│   ├── app/                  # Routing Expo Router
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx   # Tab bar custom avec mini-player
│   │   │   ├── home/
│   │   │   ├── chants/
│   │   │   ├── messe/
│   │   │   ├── favoris/
│   │   │   └── parametres/
│   │   ├── _layout.tsx       # Initialisation DB + Stack global
│   │   ├── index.tsx         # Redirection d’entrée vers /home
│   │   ├── connexion/
│   │   ├── agenda/
│   │   ├── aide/
│   │   ├── historique/
│   │   ├── mes-chants/
│   │   ├── search/
│   │   ├── saint/
│   │   ├── chant/
│   │   ├── priere/
│   │   └── lecture/
│   ├── components/
│   │   ├── auth/
│   │   ├── chant/
│   │   ├── lecture/
│   │   ├── notifications/
│   │   ├── priere/
│   │   ├── settings/
│   │   ├── ui/
│   │   └── themed-*.tsx      # View / Text génériques multi-thèmes
│   ├── constants/
│   │   └── theme.ts          # Palette ActionColors et tokens visuels
│   ├── data/
│   │   ├── initialChants.ts  # Données de base de catalogue
│   │   └── songbookChants.ts # Références du carnet Saint-Pothin
│   ├── database/
│   │   ├── schema.ts          # Migrations, tables, index SQLite
│   │   ├── chant-database.ts  # Opérations SQLite et recherche locale
│   │   └── search-query.ts    # Construction SQL de recherche FTS/LIKE
│   ├── hooks/
│   │   ├── use-responsive.ts
│   │   ├── use-theme.ts
│   │   ├── use-font-size.ts
│   │   ├── use-color-scheme.ts
│   │   ├── use-local-chant-search.ts
│   │   └── use-store-hydrated.ts
│   ├── store/
│   │   └── useAppStore.ts    # Store Zustand avec persistance AsyncStorage
│   ├── utils/
│   │   ├── celebration-order.ts, themed-styles.ts, navigation.ts
│   │   ├── personal-chant-storage-core.ts
│   │   └── chant-resource-import-core.ts
│   ├── shims/
│   │   ├── shims.ts
│   │   ├── backhandler.web.js
│   │   └── LoadingView.js
│   ├── types/
│   │   ├── index.ts
│   │   └── css.d.ts
│   ├── global.css
│   └── assets/
│       └── images / expo icons / splash
```

### 1.2 Navigation

- **Router** : Expo Router (file-based routing)
- **Layout principal** : `src/app/_layout.tsx` initialise la base locale et affiche un `<Stack>` global.
- **Navigation tab** : `src/app/(tabs)/_layout.tsx` expose les 5 onglets principaux : Accueil, Chants, Messe, Favoris, Réglages.
- **Routes cachées** : agenda, aide, historique, mes-chants, recherche, saint, lecture, profil, détail/édition de chants et prières.
- **Redirection** : `src/app/index.tsx` renvoie vers `/home` comme route par défaut.
- **Mini-player** : intégré dans la tab bar ; il affiche le chant courant, permet lecture/pause et fermeture rapide.

### 1.3 Écrans et modules majeurs du projet

- `src/app/(tabs)/home` : accueil, reprise d’activité, nouveautés, historique, préparation de messe.
- `src/app/(tabs)/chants` : catalogue, filtres, catégories, langues, éléments de Messe, favoris et historique.
- `src/app/(tabs)/messe` : préparation de célébration, parties liturgiques, ordre des chants, brouillons.
- `src/app/(tabs)/favoris` : favoris de chants et prières, navigation rapide vers les contenus préférés.
- `src/app/(tabs)/parametres` : paramètres de thème, langue, notifications, taille de police, stockage local.
- `src/app/search` : recherche locale dans la bibliothèque SQLite avec pagination et historique des recherches.
- `src/app/agenda` : agenda hebdomadaire avec filtres et ajout d’événements personnels.
- `src/app/aide` : FAQ de l’application.
- `src/app/mes-chants` : bibliothèque personnelle locale avec import audio/partition/PDF, contenus privés, gestion des ressources.
- `src/app/historique` : historique des lectures, écoutes, préparations et récentes modifications.
- `src/app/saint` : pages liées au saint du jour / spiritualité / références de lecture.

---

## 2. Stack Technique et Versions

### 2.1 Expo SDK 57

| Package | Version |
|---------|---------|
| `expo` | `~57.0.30` |
| `react` | `19.2.3` |
| `react-native` | `0.86.3` |
| `react-native-web` | `^0.21.0` |
| `babel-preset-expo` | `~57.0.10` |
| `@types/react` | `~19.2.0` |
| `typescript` | `~5.9.2` / `~6.0.3` |
| `expo-router` | `~57.0.28` |
| `expo-symbols` | `~57.0.3` |
| `expo-linear-gradient` | `~57.0.2` |
| `expo-haptics` | `~57.0.3` |
| `expo-font` | `~57.0.3` |
| `expo-image` | `~57.0.5` |
| `expo-status-bar` | `~57.0.1` |
| `expo-splash-screen` | `~57.0.10` |
| `expo-web-browser` | `~57.0.3` |
| `expo-constants` | `~57.0.17` |
| `expo-device` | `~57.0.2` |
| `expo-linking` | `~57.0.13` |
| `expo-system-ui` | `~57.0.4` |
| `expo-clipboard` | `~57.0.2` |
| `expo-document-picker` | `~57.0.3` |
| `expo-file-system` | `~57.0.7` |
| `expo-audio` | `~57.0.5` |
| `expo-image-picker` | `~57.0.20` |
| `expo-sqlite` | `~57.0.4` |
| `react-native-reanimated` | `4.5.1` |
| `react-native-safe-area-context` | `~5.7.0` |
| `react-native-screens` | `~4.26.0` |
| `react-native-gesture-handler` | `~2.32.0` |
| `@expo/vector-icons` | `^15.0.2` |
| `zustand` | `^4.5.7` |

### 2.2 Configuration fichiers

**`app.json`** :
```json
{
  "expo": {
    "sdkVersion": "57.0.0",
    "name": "Cantique Guinée",
    "slug": "EGUINE",
    "version": "1.0.0",
    "orientation": "default",
    "icon": "./assets/images/icon.png",
    "scheme": "eguine",
    "userInterfaceStyle": "light",
    "ios": { "icon": "./assets/images/icon.png", "supportsTablet": true },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#7A1F3D",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": { "output": "static", "favicon": "./assets/images/favicon.png" },
    "plugins": ["expo-router", ["expo-splash-screen", { "backgroundColor": "#FFFFFF", "image": "./assets/images/splash-icon.png",     "imageWidth": 280,
    "resizeMode": "contain" }], "expo-font", "expo-web-browser"]
  }
}
```
L’orientation suit celle de l’appareil (portrait ou paysage) et la cible iOS inclut les tablettes.
Le nom affiché et les icônes de l’application utilisent la marque **Cantique Guinée**. Le slug technique `EGUINE` et le schéma de liens `eguine` restent inchangés afin de préserver l’identité de l’application et ses liens existants.

**`tsconfig.json`** : extends `expo/tsconfig.base`, paths `@/*` → `./src/*`, `@/assets/*` → `./assets/*`

**`babel.config.js`** : `['babel-preset-expo', { unstable_transformImportMeta: true }]`

**`metro.config.js`** : `getDefaultConfig(__dirname)` + shims pour BackHandler et LoadingView

---

## 2. Stack Technique et Versions

### 2.1 Expo SDK 57

| Package | Version |
|---------|---------|
| `expo` | `~57.0.21` |
| `react` | `19.2.3` |
| `react-native` | `0.86.3` |
| `react-native-web` | `^0.21.0` |
| `babel-preset-expo` | `~57.0.10` |
| `@types/react` | `~19.2.0` |
| `typescript` | `~6.0.3` |
| `expo-router` | `~57.0.20` |
| `expo-symbols` | `~57.0.2` |
| `expo-linear-gradient` | `~57.0.1` |
| `expo-haptics` | `~57.0.2` |
| `expo-font` | `~57.0.3` |
| `expo-image` | `~57.0.4` |
| `expo-status-bar` | `~57.0.1` |
| `expo-splash-screen` | `~57.0.8` |
| `expo-web-browser` | `~57.0.2` |
| `expo-constants` | `~57.0.17` |
| `expo-device` | `~57.0.1` |
| `expo-linking` | `~57.0.9` |
| `expo-system-ui` | `~57.0.3` |
| `expo-clipboard` | `~57.0.1` |
| `expo-image-picker` | `~57.0.16` |
| `react-native-reanimated` | `4.5.1` |
| `react-native-safe-area-context` | `~5.7.0` |
| `react-native-screens` | `~4.26.0` |
| `react-native-gesture-handler` | `~2.32.0` |
| `react-native-worklets` | (installé via `npx expo install`) |
| `@expo/vector-icons` | (installé via `npx expo install`) |
| `zustand` | `^4.5.7` |

### 2.2 Configuration fichiers

**`app.json`** :
```json
{
  "expo": {
    "sdkVersion": "57.0.0",
    "name": "Cantique Guinée",
    "slug": "EGUINE",
    "version": "1.0.0",
    "orientation": "default",
    "icon": "./assets/images/icon.png",
    "scheme": "eguine",
    "userInterfaceStyle": "light",
    "ios": { "icon": "./assets/images/icon.png", "supportsTablet": true },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#7A1F3D",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": { "output": "static", "favicon": "./assets/images/favicon.png" },
    "plugins": ["expo-router", ["expo-splash-screen", { "backgroundColor": "#FFFFFF", "image": "./assets/images/splash-icon.png",     "imageWidth": 280,
    "resizeMode": "contain" }], "expo-font", "expo-web-browser"]
  }
}
```
L’orientation suit celle de l’appareil (portrait ou paysage) et la cible iOS inclut les tablettes.
Le nom affiché et les icônes de l’application utilisent la marque **Cantique Guinée**. Le slug technique `EGUINE` et le schéma de liens `eguine` restent inchangés afin de préserver l’identité de l’application et ses liens existants.

**`tsconfig.json`** : extends `expo/tsconfig.base`, paths `@/*` → `./src/*`, `@/assets/*` → `./assets/*`

**`babel.config.js`** : `['babel-preset-expo', { unstable_transformImportMeta: true }]`

**`metro.config.js`** : `getDefaultConfig(__dirname)` + shims pour BackHandler et LoadingView

---

## 3. Système de State (Zustand)

### 3.1 `useAppStore.ts`

**Fichier** : `src/store/useAppStore.ts`

**State** :
- `user: User | null`
- `isLoggedIn: boolean`
- `role: Role` ('fidelle' | 'choriste' | 'paroisse' | 'admin')
- `languagePref: Langue`
- `themeMode: 'light' | 'dark' | 'system'`
- `fontSize: 'small' | 'medium' | 'large' | 'xlarge'`
- `autoDownload: boolean`
- `notificationsEnabled: boolean`
- `favorites: string[]` (IDs de chants)
- `favoritePrieres: string[]` (IDs de prières)
- `chants: Chant[]`
- `prieres: Priere[]`
- `playlists: Playlist[]`
- `downloadedChants: string[]`
- `offlineStatus: OfflineStatus`
- `searchQuery: string`
- `unreadNotifications: number`

**Actions clés** :
- `login(name: string, email?: string)` → crée un User, set `isLoggedIn: true`
- `logout()` → reset tout
- `setUser(user)` → set user
- `toggleFavorite(chantId)` → toggle dans favorites
- `toggleFavoritePriere(priereId)` → toggle dans favoritePrieres
- `toggleDownload(chantId)` → toggle downloadedChants
- `setSearchQuery(query)` → set searchQuery

### 3.2 Initialisation locale & synchronisation SQLite

- `src/app/_layout.tsx` déclenche l’hydratation Zustand, puis initialise `eguine.db` avec `initializeLocalChantDatabase`.
- Les états déjà persistés dans `AsyncStorage` (favoris, célébrations, bibliothèque personnelle) sont réinjectés dans SQLite pour garantir une source de vérité cohérente hors connexion.
- Les changements de favoris et de programme de Messe sont synchronisés vers SQLite via `replaceFavorites` et `replaceMassCelebrations`.
- La recherche locale s’appuie sur `useLocalChantSearch`, qui exécute `searchChants` avec pagination et détection de chargement plus avancée. Elle prend en charge les filtres par langue, catégorie, moment liturgique, contenu audio/partition, favoris et bibliothèque personnelle.
- Les écrans qui doivent être plus rapides ou plus volumiques ne filtrent plus l’ensemble complet en mémoire : ils interrogent directement SQLite avec `buildChantSearchQueries` et `FTS5` si disponible.

---

## 4. Hooks Personnalisés

### 4.1 `use-responsive.ts`

**Fichier** : `src/hooks/use-responsive.ts`

**Exports** :
- `wp(pct: number) => number` — largeur responsive (pourcentage de l'écran)
- `hp(pct: number) => number` — hauteur responsive
- `useResponsive()` → `{ width, height, bp, isSmall, isTablet, hp, wp, cols, cardWidth, fs, pad }`

**Breakpoints** :
- `xs` : < 360px
- `sm` : 360-599px
- `md` : 600-899px (tablette)
- `lg` : ≥ 900px (tablette)

**Breakpoint logic** :
```ts
const bp = width < 360 ? 'xs' : width < 600 ? 'sm' : width < 900 ? 'md' : 'lg';
const isTablet = bp === 'md' || bp === 'lg';
const cols = isTablet ? 3 : 2;
const cardWidth = isTablet ? (width - 80) / 3 : (width - 56) / 2;
```

### 4.2 `use-theme.ts`

**Fichier** : `src/hooks/use-theme.ts`

**Export** : `useTheme()` → retourne `Colors[scheme]` (light ou dark)

**Logique** :
- Si `themeMode === 'light'` → scheme = 'light'
- Si `themeMode === 'dark'` → scheme = 'dark'
- Sinon → utilise le système

### 4.3 `use-font-size.ts`

**Fichier** : `src/hooks/use-font-size.ts`

**Export** : `useFontSize()` → `{ scale, fs(base: number) => number }`

**Scales** :
```ts
const SCALE = { small: 0.85, medium: 1, large: 1.15, xlarge: 1.3 };
```

### 4.4 `use-color-scheme.ts`

**Fichier** : `src/hooks/use-color-scheme.ts`

**Export** : `useColorScheme()` → retourne le scheme système ('light' | 'dark')

### 4.5 `use-local-chant-search.ts`

**Fichier** : `src/hooks/use-local-chant-search.ts`

**Responsabilité** :
- Exécute une recherche locale paginée sur la base SQLite (`searchChants`)
- Gère `debounce`, `loadMore`, `loadingMore`, `enabled` et messages d’erreur
- Stream le résultat dans un état stable avec `useEffect` + `useRef`
- S’aligne sur les filtres de `ChantSearchOptions` (langue, catégorie, moment, contenu audio/partition, favoris, etc.)

**Sortie** : `{ items, total, loading, loadingMore, error, hasMore, loadMore }`

### 4.6 `use-store-hydrated.ts`

**Fichier** : `src/hooks/use-store-hydrated.ts`

**Responsabilité** :
- Attend que Zustand ait terminé de réhydrater le store persistant avant d’initialiser ou afficher les écrans dépendants du stockage local.
- Evite les avancées dans l’interface avant la disponibilité du state `user`, `favorites`, `personalChants`, etc.

---

## 5. Composants Core

### 5.1 `ThemedText`

**Fichier** : `src/components/themed-text.tsx`

**Props** : `ThemedTextProps` extends `TextProps` avec `type` et `themeColor`

**Types disponibles** :
- `'default'` (16px, poids 500)
- `'title'` (48px, poids 600)
- `'small'` (14px, poids 500)
- `'smallBold'` (14px, poids 700)
- `'subtitle'` (32px, poids 600)
- `'link'` (14px)
- `'linkPrimary'` (14px, bleu)
- `'code'` (12px, mono)

**Usage** :
```tsx
<ThemedText type="title">Bonjour</ThemedText>
<ThemedText type="small" themeColor="textSecondary">Second texte</ThemedText>
```

### 5.2 `ThemedView`

**Fichier** : `src/components/themed-view.tsx`

**Props** : `ThemedViewProps` extends `ViewProps` avec `type`

**Types** :
- `'background'` (défaut) — fond selon thème
- `'card'` — fond element + bordure + borderRadius 12
- `'transparent'` — pas de fond

**Usage** :
```tsx
<ThemedView type="card">Contenu</ThemedView>
<ThemedView type="transparent">Contenu transparent</ThemedView>
```

### 5.3 `SearchBar`

**Fichier** : `src/components/ui/SearchBar.tsx`

**Props** : `SearchBarProps`
- `value: string` — valeur actuelle
- `onChangeText: (text: string) => void` — callback changement
- `placeholder?: string` — placeholder (défaut: 'Rechercher...')
- `placeholderTextColor?: string` — couleur placeholder (défaut: '#8E8E93')
- `autoFocus?: boolean` — focus automatique
- `onFocus?: () => void` — callback focus
- `onBlur?: () => void` — callback blur
- `onClear?: () => void` — callback clear
- `onSubmit?: (text: string) => void` — callback submit
- `disabled?: boolean` — désactivé
- `testID?: string` — identifiant test

**Fonctionnalités** :
- Barre de recherche animée avec `Animated.Value` pour le borderColor
- Icône loupe `SymbolView name="magnifyingglass"`
- Bouton clear `SymbolView name="xmark.circle.fill"` quand texte non vide
- Barre inférieure avec hint "Rechercher un chant, une prière ou un thème" quand focused et vide
- Border color passe de `theme.border` à `#208AEF` quand focused
- `useCallback` pour tous les handlers
- `inputRef` pour focus/blur programmatique

**Styles** :
- `wrapper` : `gap: Spacing.two`
- `container` : flexDirection row, alignItems center, marginHorizontal `wp(4)`, marginVertical `wp(2)`, paddingHorizontal `wp(3)`, paddingVertical (iOS: `wp(2)`, Android: `wp(1)`), borderRadius `wp(2)`, borderWidth 2
- `input` : flex: 1, fontSize 16

---

## 6. Thème et Couleurs

### 6.1 `src/constants/theme.ts`

**Colors** :
```ts
export const Colors = {
  light: {
    background: '#FFFFFF',
    backgroundElement: '#F7F8FC',
    backgroundSelected: '#EEF1F7',
    text: '#171A2B',
    textSecondary: '#72788A',
    border: '#E1E5EE',
    separator: '#EEF0F5',
    primary: '#3157D5',
  },
  dark: {
    background: '#020F1A',
    backgroundElement: '#071D33',
    backgroundSelected: '#102D47',
    text: '#F4F8FC',
    textSecondary: '#8FA6BA',
    border: '#1B3B58',
    separator: '#12304B',
    primary: '#168CFF',
  },
} as const;
```

**Fonts** :
- iOS : `Avenir Next` (sans), `ui-serif`, `ui-rounded`, `ui-monospace`
- Android/Web : `sans-serif`, `serif`, `normal`, `monospace`

**Spacing** :
```ts
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 };
```

---

## 7. Contenu local

Les chants sont stockés dans SQLite. `src/data/initialChants.ts` regroupe les chants latins et les chants autorisés extraits du carnet Saint-Pothin. Les contenus sont importés au premier démarrage ; les lectures, saints, horaires de paroisses, prières, événements d’agenda et notifications ne sont pas préremplis avec des données de démonstration.

### 7.2 Types (`src/types/index.ts`)

**Types principaux** :
- `Langue` : 'fr' | 'la' | 'soussou' | 'poular' | 'malinke' | 'kissi' | 'guerze' | 'toma' | 'kpele' | 'baga' | 'loma' | 'mano' | 'kono' | 'en'
- `Categorie` : 'entree' | 'kyrie' | 'gloria' | 'psaume' | 'acclamation' | 'offertoire' | 'sanctus' | 'agnus_dei' | 'communion' | 'action_grace' | 'chant_final' | 'louange' | 'adoration' | 'penitence' | 'marial' | 'funerailles' | 'autre'
- `TempsLiturgique` : 'avent' | 'noel' | 'careme' | 'triduum_pascal' | 'temps_pascal' | 'temps_ordinaire'
- `MomentMesse` : 'entree' | 'liturgie_parole' | 'liturgie_eucharistique' | 'communion' | 'envoi'
- `Chant`, `Priere`, `Lecture`, `Saint`, `Parish`, `Messe`, `MesseItem`, `Tag`, `Variant`, `Favorite`, `Playlist`, `User`, `Intention`

---

## 8. Page d'Accueil (`home.tsx`) — Refonte Premium

### 8.1 Structure de la Home

**Ordre des sections** (de haut en bas) :

1. **Header** — Salutation + date + notification + avatar (unique)
2. **Recherche** — Pressable placeholder qui ouvre `/search`
3. **Hero** — Saint du jour + verset + temps liturgique avec CTA "Voir les lectures →"
4. **Aujourd'hui** (cœur de l'app) — 4 cartes : Saint, Évangile, Chant, Prière
5. **Accès rapide** — 4 verbes : Chanter, Lire, Prier, Préparer
6. **Pour vous** — Chants populaires (horizontal scroll)
7. **Ma paroisse** — Section personnalisée avec prochaine messe

### 8.2 Composants de la Home

**`HeroSection`** :
- `ImageBackground` avec `LinearGradient`
- Saint badge avec couleur liturgique
- Verset du jour (déterministe : `new Date().getDate() % VERSSES.length`)
- CTA "Voir les lectures →"

**`AujourdHuiCard`** :
- Icône + Titre + Sous-titre + CTA
- Utilisé pour : Saint du jour, Évangile, Chant du jour, Prière du jour

**`AccessCard`** :
- Icône + Label + Sous-titre
- 4 cartes : Chanter (`statsChants`), Lire, Prier, Préparer

**`PopularChantCard`** :
- Icône + Titre + Langue/Catégorie + Cœur + Vues
- Horizontal scroll

**`ParishCard`** :
- Icône + Nom de paroisse + Ville/Diocèse + Infos messe + CTA "Préparer →"

### 8.3 Logique de la Home

**Chant du jour** (déterministe) :
```ts
const dayIndex = new Date().getDate() % publishedChants.length;
return publishedChants[dayIndex];
```

**Verset du jour** :
```ts
function getVerseOfDay(): string {
  const dayIndex = new Date().getDate() % VERSSES.length;
  return VERSSES[dayIndex];
}
```

**Couleur liturgique** :
```ts
const LITURGICAL_COLORS = {
  avent: '#4B0082', noel: '#C41E3A', careme: '#800080',
  paques: '#FFD700', pentecote: '#FF0000', temps_ordinaire: '#228B22',
};
```

**Prières** (sélection déterministe) :
```ts
const prayerDayIndex = new Date().getDate() % prieres.length;
const morningPrayer = prieres.find(p => p.publie && p.moment_jour === 'matin') || prieres[prayerDayIndex];
```

**Gestion de la connexion** :
- `handleQuickAction('/favoris')` → vérifie `isLoggedIn`, redirige vers `/connexion` si non connecté

### 8.4 Styles de la Home

- `heroContainer` : `height: hp(22)`, borderRadius 16, shadow
- `aujourdHuiCard` : flexDirection row, minWidth '48%', borderRadius 12
- `accessCard` : width '48%', borderRadius 12
- `popularCard` : width `wp(52)`, borderRadius
- `parishCard` : flexDirection row, borderRadius 12
- Couleurs cohérentes : couleurs liturgiques pour les sections, pas de couleurs arc-en-ciel

---

## 9. Page de Connexion (`connexion.tsx`)

### 9.1 Structure

**Modes** : `'login' | 'signup' | 'otp'`

**Sections** :
1. **StatusBar** — WiFi, signal, heure, batterie
2. **Login** — Email, Password, Remember me, Forgot password, Sign in, OR divider, Google/Apple, Sign up link
3. **Signup** — Name, Email, Password, Sign up, OR divider, Google/Apple, Sign in link
4. **OTP** — 4 boîtes OTP, Code sécurisé, Continue, Resend OTP, Sign in link

### 9.2 Handlers

**`handleSignIn`** :
```ts
login(name || 'Utilisateur', email);
router.replace('/home');
```

**`handleSignUp`** :
```ts
login(name || 'Nouvel utilisateur', email);
router.replace('/home');
```

**`handleOtpContinue`** :
```ts
login(name || 'Utilisateur', email);
router.replace('/home');
```

### 9.3 Responsive

- `wp()` et `hp()` pour toutes les dimensions
- `const { width, height } = Dimensions.get('window')`
- `wp(percentage)` = `(width * percentage) / 100`
- `hp(percentage)` = `(height * percentage) / 100`

### 9.4 Styles

- `const styles = StyleSheet.create({...})` (pas d'objet brut)
- Tous les styles utilisent `wp()`/`hp()` pour les dimensions
- `fontSize: wp(X)` pour le texte
- `paddingVertical: hp(X)`, `paddingHorizontal: wp(X)`
- `borderRadius: wp(X)`

### 9.5 Icônes Feather

- `Feather name="radio"` — pour signal (correction depuis "signal")
- `Feather name="smartphone"` — pour apple (correction depuis "apple")

---

## 10. Page des Chants (`chants.tsx`)

### 10.1 Structure

- **Header** : Titre "Chants" + icône search
- **SearchBar** : Barre de recherche avec `value` et `onChangeText`
- **Filtres** : Boutons de catégorie (tous les chants, par catégorie)
- **Liste** : `FlatList` de `ChantCard` en grille 2 colonnes
- **Footer** : Bouton flottant pour ajouter un chant (`chant/nouveau.tsx`)

### 10.2 Composants utilisés

- `ChantCard` — Carte individuelle avec favori, download, partage
- `SearchBar` — Recherche avec hint
- `ThemedView`, `ThemedText` — Layout et texte thématisés

### 10.3 Logique

- Filtre par `chant.categorie` et `chant.langue`
- `FlatList` avec `numColumns={2}`
- `onPress` → `router.push(`/chant/${chant.id}`)`
- `onFavoritePress` → `toggleFavorite(chant.id)`
- `onDownloadPress` → `toggleDownload(chant.id)`

---

## 11. Page des Prières (`prieres.tsx`)

### 11.1 Structure

- **Header** : Titre "Prières" + icône search
- **SearchBar** : Barre de recherche
- **Filtres** : Par moment du jour (matin, midi, soir, nuit)
- **Liste** : `FlatList` de `PriereCard`

### 11.2 Composants utilisés

- `PriereCard` — Carte avec icône moment, titre, preview, favori
- `SearchBar` — Recherche

### 11.3 Logique

- Filtre par `priere.moment_jour` et `priere.langue`
- `onPress` → `router.push(`/priere/${priere.id}`)`
- `onFavoritePress` → `toggleFavoritePriere(priere.id)`

---

## 12. Programme et mode célébration de la Messe

### 12.1 Structure

- **Écran du programme** : `src/app/(tabs)/messe/index.tsx` affiche les chants associés à chaque temps et permet de composer le programme.
- **Mode célébration** : plein écran présenté dans une `Modal`, sans barre d’onglets superposée.
- **Séquence** : 13 parties, dont le Credo et la Prière universelle, réparties entre ouverture, liturgie de la Parole, liturgie eucharistique et envoi.
- **Navigation** : sélection directe d’une partie dans le bandeau horizontal, ou déplacement avec les boutons fixes « Précédent » et « Suivant ».
- **Chants** : les chants déjà associés à la partie apparaissent sous forme de sélecteur horizontal. « Ajouter » ouvre une sélection sans quitter le mode célébration.
- **Paroles** : zone de lecture distincte et défilante ; les contrôles de partie restent disponibles pendant la lecture.
- **Médias** : lecture audio quand un fichier est disponible ; les partitions et documents associés peuvent être ouverts depuis le mode.
- **Petits écrans** : une disposition compacte est appliquée lorsque la hauteur disponible est inférieure à 600 dp.

### 12.2 Composants utilisés

- `CelebrationMode` — sélecteurs de partie et de chant, paroles, médias et navigation.
- `getCelebrationSlots()` — construit les parties à partir du programme et des chants associés.
- `useAppStore` — conserve les sélections de chants du programme.

### 12.3 Logique

- Changer de partie actualise le chant et les paroles affichés sans quitter le mode.
- Une partie sans chant propose d’en ajouter un sur place.
- Une partie contenant plusieurs chants expose un sélecteur horizontal ; la sélection reste indépendante pour chaque partie.
- Les paroles longues défilent dans leur propre zone, sans déplacer les boutons de navigation.

---

## 13. Page des Favoris (`favoris.tsx`)

### 13.1 Structure

- **Header** : Titre "Favoris"
- **Tabs** : Chants favoris / Prières favoris (segmented control)
- **Liste** : `FlatList` des éléments favoris
- **Vide** : Message "Aucun favori" si `favorites.length === 0` et `favoritePrieres.length === 0`

### 13.2 Logique

- `useAppStore((s) => s.favorites)` — IDs des chants favoris
- `useAppStore((s) => s.favoritePrieres)` — IDs des prières favoris
- `useAppStore((s) => s.chants)` — Liste complète des chants pour filtrer
- `useAppStore((s) => s.prieres)` — Liste complète des prières pour filtrer
- Toggle favori via `toggleFavorite` / `toggleFavoritePriere`

---

## 14. Page de Profil (`profile.tsx`)

### 14.1 Structure

- **Header** : Avatar utilisateur + Nom + Email
- **Section** : Informations personnelles (nom, email, rôle)
- **Section** : Paramètres rapides (langue, thème, taille police)
- **Bouton** : Déconnexion (`logout()`)

### 14.2 Logique

- `useAppStore((s) => s.user)` — Informations utilisateur
- `useAppStore((s) => s.role)` — Rôle
- `useAppStore((s) => s.logout)` — Déconnexion
- Navigation vers `parametres.tsx` pour les réglages détaillés

---

## 15. Page des Paramètres (`parametres.tsx`)

### 15.1 Structure

- **Header** : Titre "Paramètres"
- **Section** : Apparence (thème light/dark/system)
- **Section** : Langue (fr, soussou, poular, malinke, etc.)
- **Section** : Taille de police (small, medium, large, xlarge)
- **Section** : Téléchargement automatique (toggle)
- **Section** : Notifications (toggle)
- **Section** : À propos

### 15.2 Logique

- `useAppStore((s) => s.themeMode)` et `setThemeMode`
- `useAppStore((s) => s.languagePref)` et `setLanguagePref`
- `useAppStore((s) => s.fontSize)` et `setFontSize`
- `useAppStore((s) => s.autoDownload)` et `setAutoDownload`
- `useAppStore((s) => s.notificationsEnabled)` et `setNotificationsEnabled`

---

## 16. Page des Notifications (`notifications.tsx`)

### 16.1 Structure

- **Header** : Titre "Notifications" + indicateur unread count
- **Liste** : `FlatList` des notifications
- **Chaque notification** : Icône, Titre, Message, Date, Lu/Non lu

### 16.2 Logique

- `useAppStore((s) => s.unreadNotifications)` — Compteur
- Marquer comme lu sur press
- `useAppStore((s) => s.notificationsEnabled)` — Vérifier si activé

---

## 17. Page de Lecture Biblique (`lecture.tsx`)

### 17.1 Structure

- **Header** : Titre "Lecture" + date du jour
- **Section** : Lecture du jour (Saint + Évangile)
- **Liste** : Lectures bibliques disponibles
- **Navigation** : Vers détail de lecture

### 17.2 Logique

Les lectures ne s’affichent que lorsqu’une source de contenu réelle est intégrée.

---

## 18. Détail d'un Chant (`chant/[id].tsx`)

### 18.1 Structure

- **Header** : Titre du chant + icône favori/download
- **Hero Image** : Image du chant avec `LinearGradient` overlay
- **Tabs** : Paroles, Partition, Audio
- **Paroles** : Texte complet du chant avec mise en page
- **Partition** : Partition musicale (image ou composant)
- **Audio** : Lecteur audio avec `Audio` d'expo-av
- **Voix chorales** : Soprano, Alto, Ténor, Basse
- **Informations** : Catégorie, langue, thème, durée

### 18.2 Composants utilisés

- `ChantCard` — Pour les chants suggérés
- `ThemedText`, `ThemedView` — Layout
- `SymbolView` — Icônes
- `LinearGradient` — Dégradé pour hero

### 18.3 Logique

- `useAppStore((s) => s.chants)` — Trouver le chant par ID
- `useAppStore((s) => s.toggleFavorite)` — Toggle favori
- `useAppStore((s) => s.toggleDownload)` — Toggle download
- `router.push(`/chant/nouveau`)` si nouveau chant

---

## 19. Nouveau Chant (`chant/nouveau.tsx`)

### 19.1 Structure

- **Header** : Titre "Nouveau Chant"
- **Formulaires** :
  - Titre
  - Catégorie (selecteur)
  - Langue (selecteur)
  - Thème
  - Paroles
  - Partition (upload)
  - Audio (upload)
- **Bouton** : Publier/Sauvegarder

### 19.2 Logique

- `useAppStore((s) => s.chants)` — Ajouter au store
- Validation des champs
- Upload de fichiers via `expo-image-picker`

---

## 20. Détail d'une Prière (`priere/[id].tsx`)

### 20.1 Structure

- **Header** : Titre de la prière + icône favori
- **Icône** : Grande icône selon le moment (matin/midi/soir/nuit)
- **Contenu** : Texte complet de la prière
- **Métadonnées** : Moment, langue, catégorie
- **Partage** : Bouton de partage
- **Favori** : Toggle favori

### 20.2 Composants utilisés

- `PriereCard` — Pour les prières suggérées
- `ThemedText`, `ThemedView` — Layout
- `SymbolView` — Icônes

### 20.3 Logique

- `useAppStore((s) => s.prieres)` — Trouver la prière par ID
- `useAppStore((s) => s.toggleFavoritePriere)` — Toggle favori

---

## 21. Nouvelle Prière (`priere/nouvelle.tsx`)

### 21.1 Structure

- **Header** : Titre "Nouvelle Prière"
- **Formulaires** :
  - Titre
  - Moment du jour (matin, midi, soir, nuit)
  - Langue
  - Catégorie
  - Contenu
- **Bouton** : Publier/Sauvegarder

### 21.2 Logique

- `useAppStore((s) => s.prieres)` — Ajouter au store
- Validation des champs

---

## 22. Composants de Cartes Détaillés

### 22.1 `ChantCard.tsx`

**Fichier** : `src/components/chant/ChantCard.tsx`

**Props** : `ChantCardProps`
- `chant: Chant` — Données du chant
- `onPress?: () => void` — Callback press
- `onFavoritePress?: (id: string) => void` — Callback favori
- `isFavorite?: boolean` — État favori externe
- `style?: any` — Style supplémentaire
- `variant?: 'default' | 'compact' | 'featured'` — Variante d'affichage
- `showPlayButton?: boolean` — Afficher bouton lecture

**Fonctionnalités** :
- **État local** : `isPressed` pour feedback tactile, `scaleAnim` pour animation spring
- **Favori** : `useAppStore((s) => s.toggleFavorite)` + `useAppStore((s) => s.isFavorite(chant.id))`
- **Handlers** :
  - `handlePressIn` → `setIsPressed(true)`, `Animated.spring` scale 0.97
  - `handlePressOut` → `setIsPressed(false)`, `Animated.spring` scale 1
  - `handleFavoritePress` → `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` + toggle
  - `handlePress` → `Haptics.impactAsync(...)` + `router.push(`/chant/${chant.id}`)` ou `onPress()`
- **Rendu** :
  - `CATEGORIE_LABELS` : Mapping des catégories vers labels français
  - `CATEGORIE_COLORS` : Couleurs par catégorie (entree=#34C759, kyrie=#FF9500, gloria=#FFCC00, psaume=#5856D6, acclamation=#AF52DE, offertoire=#FF2D55, sanctus=#FF3B30, agnus_dei=#FF6B6B, communion=#208AEF, action_grace=#34C759, chant_final=#FF9500, louange=#FFD700, adoration=#AF52DE, penitence=#8E8E93, marial=#E91E63, funerailles=#4A4A4A, autre=#8E8E93)
  - `LANG_FLAGS` : Drapeaux de langue (fr='🇫🇷', soussou='🇬🇳', poular='🇬🇳', malinke='🇬🇳')
  - Variant 'compact' : carte plus petite
  - Variant 'featured' : carte en vedette

### 22.2 `PriereCard.tsx`

**Fichier** : `src/components/priere/PriereCard.tsx`

**Props** : `PriereCardProps`
- `priere: Priere` — Données de la prière
- `onPress?: () => void` — Callback press
- `onFavoritePress?: (id: string) => void` — Callback favori
- `isFavorite?: boolean` — État favori
- `style?: any` — Style supplémentaire

**Fonctionnalités** :
- **Icône** : `MOMENT_ICONS[momentKey]` où `momentKey = priere.moment_jour || priere.categorie`
- **Couleur** : `MOMENT_COLORS[momentKey]`
- **Rendu** :
  - `header` : flexDirection row, alignItems center
  - `iconContainer` : 42x42, borderRadius 21, fond `{color}18`
  - `title` : fontSize 15, fontWeight 600
  - `meta` : fontSize 12, textTransform capitalize
  - `preview` : fontSize 13, lineHeight 19, numberOfLines 2
- **Favori** : `SymbolView name={isFavorite ? 'heart.fill' : 'heart'}`

---

## 23. Composants UI Détaillés

### 23.1 `SearchBar.tsx`

Voir section 5.3 pour les détails complets.

**Icônes `SymbolView` utilisées** :
- `magnifyingglass` — Icône de recherche
- `xmark.circle.fill` — Bouton clear

### 23.2 Autres composants UI

- **`collapsible.tsx`** — Composant repliable/dépliable
- **`animated-icon.tsx`** — Icône avec animation
- **`external-link.tsx`** — Lien externe avec ouverture navigateur
- **`hint-row.tsx`** — Ligne d'indice/informaton
- **`web-badge.tsx`** — Badge pour version web

---

## 24. Patterns de Code

### 24.1 Imports

```tsx
// Standard
import { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useResponsive, wp, hp } from "@/hooks/use-responsive";
import { useFontSize } from '@/hooks/use-font-size';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
```

### 24.2 Responsive

```tsx
// Toujours utiliser wp() et hp() pour les dimensions
const { wp, hp } = useResponsive();

// Dans StyleSheet
container: { paddingHorizontal: wp(4), paddingVertical: hp(2) },
title: { fontSize: wp(5), fontWeight: '700' },
card: { width: wp(48), borderRadius: wp(3) },
```

### 24.3 Types

```tsx
// Toujours typer les props
interface MyComponentProps {
  title: string;
  onPress: () => void;
  color: string;
}

// Utiliser `as any` pour SymbolView icon names
<SymbolView name={icon as any} size={28} tintColor={color} />
```

### 24.4 State Management

```tsx
// Lecture du store
const chants = useAppStore((s) => s.chants);
const isLoggedIn = useAppStore((s) => s.isLoggedIn);
const login = useAppStore((s) => s.login);

// Actions
login(name, email);
router.replace('/home');
```

### 24.5 Date-based Determinism

```tsx
// Chant du jour
const dayIndex = new Date().getDate() % publishedChants.length;
const chantDuJour = publishedChants[dayIndex];

// Verset du jour
const dayIndex = new Date().getDate() % VERSSES.length;
const verseOfDay = VERSSES[dayIndex];
```

### 24.6 Navigation

```tsx
const router = useRouter();
router.push('/home');        // Navigate
router.replace('/home');     // Remplace la route actuelle
router.back();               // Retour
```

---

## 25. Configuration TypeScript

**`tsconfig.json`** :
```json
{
  "compilerOptions": {
    "allowJs": true,
    "esModuleInterop": true,
    "jsx": "react-native",
    "lib": ["DOM", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "customConditions": ["react-native"],
    "noEmit": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "target": "ESNext",
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "extends": "expo/tsconfig.base"
}
```

---

## 26. Commandes Utiles

```bash
# Lancer le dev server
npx expo start

# Installer un package Expo
npx expo install <package>

# Vérifier les dépendances
npx expo-doctor

# TypeScript check
npx tsc --noEmit

# Installer les dépendances
npm install

# Lancer sur Android
npx expo start --android

# Lancer sur iOS
npx expo start --ios
```

---

## 27. Points Clés à Ne Pas Oublier

1. **Toujours utiliser `wp()`/`hp()`** pour les dimensions, jamais de valeurs absolues
2. **`StyleSheet.create`** pour tous les styles (pas d'objets bruts)
3. **`SymbolView` icon names** doivent être castés avec `as any`
4. **`useAppStore`** pour tout accès au state global
5. **`router.replace('/home')`** pour naviguer après connexion
6. **`login(name, email)`** pour authentifier l'utilisateur
7. **`isLoggedIn`** pour vérifier la connexion
8. **`index.tsx`** redirige automatiquement selon `isLoggedIn`
9. **`_layout.tsx`** gère les tabs et les routes cachées
10. **Expo SDK 57** : React 19.2.3, React Native 0.86.3
11. **`npx expo install`** pour tous les packages Expo (pas `npm install`)
12. **`@expo/vector-icons`** doit être installé séparément
13. **`react-native-worklets`** requis par `react-native-reanimated`
14. **`connexion.tsx`** utilise `const styles = StyleSheet.create({...})` (pas `const styles = {}`)
15. **`home.tsx`** est le cœur de l'application — structure "Aujourd'hui" en priorité
16. **`SearchBar`** utilise `Animated.Value` pour borderColor et `useCallback` pour tous les handlers
17. **`ChantCard`** utilise `Animated.spring` pour scale et `Haptics.impactAsync` pour feedback
18. **`PriereCard`** utilise `MOMENT_ICONS` et `MOMENT_COLORS` pour icône et couleur selon le moment
19. **Toutes les pages** utilisent `useResponsive()` pour `wp`/`hp` et `useTheme()` pour les couleurs
20. **`FlatList`** avec `numColumns={2}` pour les listes de chants/prières
21. **`CATEGORIE_COLORS`** dans ChantCard : 17 catégories avec couleurs spécifiques
22. **`LANG_FLAGS`** dans ChantCard : 4 langues avec drapeaux emoji
23. **`MOMENT_ICONS`** dans PriereCard : icônes SymbolView selon le moment de la prière
24. **`getVerseOfDay()`** et `getChantOfDay()` utilisent `new Date().getDate()` pour déterministe
25. **`handleQuickAction('/favoris')`** vérifie `isLoggedIn` avant de naviguer

---

## 28. Vérification

- **`npx expo-doctor`** : Tous les 21 checks passent ✅
- **`npx tsc --noEmit`** : Zéro erreur TypeScript ✅
- **`npx expo start`** : Dev server fonctionne ✅

---

## 29. Mes chants — bibliothèque personnelle locale

- **Routes** : `src/app/mes-chants/index.tsx` (bibliothèque), `src/app/mes-chants/nouveau.tsx` (création) et `src/app/mes-chants/[id].tsx` (détail).
- **Accès** : entrée depuis le catalogue des chants. Les chants personnels sont marqués privés et restent sur l’appareil.
- **Contenu** : titre et métadonnées, paroles, enregistrement audio, images de partition et documents PDF.
- **Persistance** : Zustand/AsyncStorage conserve les métadonnées ; les fichiers importés sont copiés dans le stockage documentaire de l’application.
- **Réutilisation** : les chants personnels sont intégrés au catalogue local et peuvent être sélectionnés dans le programme de Messe.
- **Limites du MVP** : pas de synchronisation serveur, partage public, OCR ni résolution de conflits. Les médias et les permissions natives doivent être validés sur appareil ; la remise des PDF dépend des applications disponibles sur le système.

## 30. Base SQLite locale des chants

### Architecture et démarrage

- `expo-sqlite` ouvre `eguine.db`, persistée par l’application et disponible hors connexion. Le layout attend l’hydratation Zustand, exécute les migrations et importe ensuite le catalogue fourni ainsi que les chants personnels déjà enregistrés.
- `src/database/chant-database.ts` contient les opérations paramétrées, l’import idempotent, la recherche paginée, les favoris, les ressources et la persistance du programme de Messe. Les écrans catalogue, recherche, collections, bibliothèque personnelle et sélection de chants pour la Messe demandent des pages SQLite au lieu de filtrer la bibliothèque complète en mémoire.
- Zustand reste une projection de compatibilité pour les écrans et fonctionnalités existants qui attendent un tableau de chants. Les changements de favoris et de programme sont recopiés dans SQLite ; les nouveaux écrans de recherche et de consultation paginent directement depuis SQLite.
- Le backend distant n’est pas remplacé : aucun service de synchronisation de chants n’était présent dans cette application. Les colonnes d’état et la table `sync_outbox` préparent une synchronisation ultérieure sans la rendre nécessaire pour l’utilisation locale.

### Schéma et migrations

- La migration 1 (`src/database/schema.ts`) crée `chants`, `categories`, `chant_categories`, `tags`, `chant_tags`, `mass_parts`, `chant_mass_parts`, `chant_variants`, `favorites`, `personal_library`, `local_files`, `chant_resources`, `mass_celebrations`, `mass_celebration_items` et `sync_outbox`.
- Les associations catégorie/chant et partie de Messe/chant sont plusieurs-à-plusieurs avec clés primaires composites ; un chant n’est donc pas dupliqué lorsqu’il reçoit plusieurs catégories ou usages liturgiques.
- Les champs usuels (titre, paroles, langue, auteur, compositeur, tonalité, tempo, droits, publication et compteurs) sont indexables en colonnes ; les métadonnées supplémentaires sont conservées en JSON. Les variantes et ressources ont des tables dédiées.
- Les migrations sont suivies avec `PRAGMA user_version`. La migration 2 ajoute FTS5 externe et ses triggers de mise à jour. La migration 3 ajoute les métadonnées/statuts des préparations et `chant_history`. Si FTS5 n’est pas compilé dans SQLite sur une plateforme, l’application signale l’indisponibilité et retombe sur une recherche `LIKE` paramétrée.
- Index SQL : titre, langue/catégorie, mise à jour, relations de catégories/tags/parties, favoris, bibliothèque personnelle, ressources locales et file de synchronisation.

### Fichiers locaux et disponibilité

- Les médias ne sont pas stockés dans SQLite : `local_files` conserve leurs chemins, type MIME, taille, disponibilité et état de synchronisation ; `chant_resources` relie un média à un ou plusieurs chants.
- Les imports sont copiés du cache éventuel vers `FileSystem.documentDirectory/mes-chants/`. L’existence du fichier et l’espace libre sont vérifiés avant copie ; les erreurs de copie remontent à l’écran. Les écrans vérifient aussi l’existence des médias avant lecture ou ouverture et enregistrent les fichiers manquants.
- La suppression d’une ressource vérifie les autres références avant de supprimer le fichier. La base distingue import en cours, disponible, absent ou en échec, et fichiers locaux à synchroniser ultérieurement.

### Commandes et validations

- Installation des dépendances : `npm install` (Expo SDK 57 ; `expo-sqlite ~57.0.4`).
- Lancer l’application : `npm start` ; plateformes : `npm run android`, `npm run ios` ou `npm run web`.
- Vérification TypeScript : `npx tsc --noEmit`.
- Tests SQLite : `npm run test:database` (Node.js 22.13+ avec `node:sqlite`; la suite utilise Node 24 dans l’environnement de développement).
- La suite teste migrations et réouverture d’un fichier persistant, historique dédupliqué et comptage des écoutes, isolation et ordre des chants dans les préparations, CRUD, imports sans doublons, associations multiples, recherche FTS/titre/paroles/catégorie, favoris, fichiers absents et partagés, erreurs d’import, ainsi qu’un jeu de 10 000 chants paginé.
- Compatibilité runtime à confirmer par builds et essais appareil iOS/Android. Expo SQLite fournit aussi un backend web ; l’export web doit être contrôlé avec le serveur Expo utilisé au déploiement.

### Limites restantes

- Les tests Node valident le schéma et les requêtes SQLite avec le moteur `node:sqlite`, et simulent les cas d’import via un adaptateur ; ils ne remplacent pas une validation native des permissions, de l’espace disque, des interruptions audio et des formats de fichiers sur iOS/Android.
- Le tableau Zustand reste utilisé par quelques composants historiques, notamment certaines statistiques et écrans d’accueil. Il contient encore les données déjà chargées (catalogue fourni et chants personnels) ; les vues de listes/recherche évolutives, elles, sont paginées.
- La synchronisation serveur, les règles de résolution de conflits, le téléchargement sélectif de médias et la gestion de quota de stockage restent à construire lorsqu’un backend sera défini.

## 31. Catalogue unifié et historique local

- Le catalogue Chants centralise la recherche, les filtres principaux (tous, catégories, langues, humeur et chants de Messe), les filtres avancés (saison et disponibilité des médias), les favoris, les chants personnels et l’accès à l’historique. Les grandes cartes de catégories/langues/moments qui répétaient ces accès ont été retirées de l’accueil ; celui-ci privilégie la reprise des activités, les tendances et les nouveautés.
- `src/app/historique/index.tsx` regroupe les chants consultés/écoutés, les préparations persistantes et les chants personnels modifiés récemment. Les consultations sont dédupliquées par identifiant stable, avec le dernier accès et un compteur ; retirer une entrée ou effacer l’historique ne supprime pas le chant.
- Les écoutes ne sont comptées que depuis les lecteurs audio réels (audio local personnel et lecture du mode Célébration) après une durée significative ; le bouton de lecture simulé du détail des chants n’est pas interprété comme une écoute.
- Les préparations utilisent les mêmes identifiants de chants, conservent l’ordre par partie et restent isolées les unes des autres. On peut reprendre une ancienne préparation ou la supprimer après confirmation. Les brouillons ne sont pas confondus avec la simple visite de l’écran Messe.
- L’accueil propose une reprise rapide de la préparation active et des dernières activités. L’entrée Historique est aussi accessible depuis l’accueil, le catalogue Chants et le profil.

## 32. Ressources d’un chant

- Le détail d’un chant garde les paroles dans une zone à défilement manuel standard ; les contrôles de vitesse et de défilement automatique ont été retirés.
- Le bouton unique « Ressources » ouvre un menu contenant les paroles, les partitions, les parties vocales et les accords. Les mêmes options sont accessibles depuis le détail des chants personnels.
- Les routes `/chant/[id]/partition`, `/chant/[id]/voix` et `/chant/[id]/accords` sont propres à chaque identifiant de chant. Les partitions issues des URL directes, variantes et fichiers PDF/images sont présentées sur la page de partition ; les parties soprano, alto, ténor et basse sont proposées, avec un état « à venir » si aucun enregistrement vocal n’est associé.
- Les pages Voix et Accords existent même lorsque leurs ressources ne sont pas encore disponibles; aucun contenu audio ou musical fictif n’est ajouté.

## 33. Couleurs sémantiques des actions

- `src/constants/theme.ts` expose `ActionColors` comme palette partagée : bordeaux pour l’action principale et les favoris, bleu ardoise pour la lecture, vert-gris pour la recherche et la découverte, vert doux pour les confirmations/succès, et rouge atténué pour les actions destructives.
- Les couleurs sont appliquées aux icônes et accents des actions, avec des variantes claires pour les fonds. Les catégories liturgiques et les éléments de contenu conservent leurs propres couleurs lorsqu’elles portent une signification distincte.
- Cette convention distingue les fonctions sans multiplier les couleurs vives ni transformer les surfaces principales en blocs colorés.
