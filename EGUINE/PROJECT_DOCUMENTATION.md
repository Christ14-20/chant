# EGUINE — Documentation Complète du Projet

> **Projet** : EGUINE — Application de chants liturgiques (Guinée)
> **Stack** : React Native + Expo Router + Expo SDK 57
> **Langage** : TypeScript
> **État** : Produit fonctionnel, home page refontée UX/UI premium
> **Dernière mise à jour** : 2026-09-09

---

## 1. Architecture Générale

### 1.1 Structure de dossiers

```
EGUINE/
├── app.json                  # Config Expo (sdkVersion: "57.0.0")
├── package.json              # Toutes les dépendances
├── babel.config.js           # Babel preset expo
├── metro.config.js           # Metro config avec shims
├── tsconfig.json             # TypeScript config (extends expo/tsconfig.base)
├── src/
│   ├── app/                  # Pages Expo Router (routing file-based)
│   │   ├── _layout.tsx       # Tab layout (4 tabs + routes cachées)
│   │   ├── index.tsx         # Redirect selon isLoggedIn
│   │   ├── connexion.tsx     # Page de connexion/signup/OTP
│   │   ├── home.tsx          # Page d'accueil principale (refontée)
│   │   ├── chants.tsx        # Liste des chants
│   │   ├── prieres.tsx       # Liste des prières
│   │   ├── messe.tsx         # Page messe
│   │   ├── favoris.tsx       # Favoris
│   │   ├── profile.tsx       # Profil
│   │   ├── parametres.tsx    # Paramètres
│   │   ├── notifications.tsx # Notifications
│   │   ├── lecture.tsx       # Lecture biblique
│   │   ├── chant/[id].tsx    # Détail d'un chant
│   │   ├── chant/nouveau.tsx # Nouveau chant
│   │   ├── priere/[id].tsx   # Détail d'une prière
│   │   └── priere/nouvelle.tsx # Nouvelle prière
│   ├── components/           # Composants réutilisables
│   │   ├── themed-text.tsx   # Texte avec thème + fontSize
│   │   ├── themed-view.tsx   # View avec thème
│   │   ├── chant/ChantCard.tsx    # Carte chant
│   │   ├── priere/PriereCard.tsx  # Carte prière
│   │   ├── ui/SearchBar.tsx       # Barre de recherche
│   │   ├── ui/collapsible.tsx     # Collapsible
│   │   ├── animated-icon.tsx      # Icône animée
│   │   ├── external-link.tsx      # Lien externe
│   │   ├── hint-row.tsx           # Ligne d'indice
│   │   ├── web-badge.tsx          # Badge web
│   │   └── messe/                 # Composants messe
│   ├── hooks/                # Hooks personnalisés
│   │   ├── use-responsive.ts     # wp(), hp(), useResponsive()
│   │   ├── use-theme.ts          # useTheme()
│   │   ├── use-font-size.ts      # useFontSize()
│   │   ├── use-color-scheme.ts   # Couleur système
│   │   └── use-color-scheme.web.ts
│   ├── store/                # Zustand store
│   │   └── useAppStore.ts    # État global de l'app
│   ├── data/                 # Données mock
│   │   └── mockData.ts       # chants, prieres, lectures, saints, paroisses, messes
│   ├── types/                # Types TypeScript
│   │   ├── index.ts          # Tous les types (Chant, Priere, Lecture, Saint, Parish, etc.)
│   │   └── css.d.ts
│   ├── constants/            # Constantes
│   │   └── theme.ts          # Colors, Fonts, Spacing
│   ├── shims/                # Shims web
│   │   ├── shims.ts
│   │   ├── backhandler.web.js
│   │   └── LoadingView.js
│   └── global.css            # Styles globaux
```

### 1.2 Navigation

- **Router** : Expo Router (file-based routing)
- **Layout** : `_layout.tsx` utilise `<Tabs>` avec 4 tabs principaux
- **Tabs** : Accueil, Chants, Prières, Réglages
- **Routes cachées** (tabBarStyle: { display: 'none' }) : connexion, messe, favoris, notifications, lecture, profile, chant/[id], chant/nouveau, priere/[id], priere/nouvelle
- **Redirect** : `index.tsx` redirige vers `/home` si connecté, `/connexion` sinon

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
    "name": "EGUINE",
    "slug": "EGUINE",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "eguine",
    "userInterfaceStyle": "light",
    "ios": { "icon": "./assets/expo.icon.png" },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": { "output": "static", "favicon": "./assets/images/favicon.png" },
    "plugins": ["expo-router", ["expo-splash-screen", { "backgroundColor": "#FFFFFF", "image": "./assets/images/splash-icon.png", "imageWidth": 76 }], "expo-font", "expo-web-browser"]
  }
}
```

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

## 7. Données Mock

### 7.1 `src/data/mockData.ts`

**Exporte** :
- `chants: Chant[]` — liste de chants liturgiques
- `prieres: Priere[]` — liste de prières
- `lectures: Lecture[]` — lectures bibliques
- `saints: Saint[]` — saints du jour
- `paroisses: Parish[]` — paroisses (4 paroisses en Guinée)
- `messes: Messe[]` — messes avec items par moment
- `joursMesse: Record<string, Messe>` — messes par date
- `tags: Tag[]` — tags pour les chants

**Fonctions** :
- `getLecture(date: string)` → Lecture | undefined
- `getSaint(date: string)` → Saint | undefined
- `getChantSuggestion(chant: Chant)` → Chant[]

### 7.2 Types (`src/types/index.ts`)

**Types principaux** :
- `Langue` : 'fr' | 'soussou' | 'poular' | 'malinke' | 'kissi' | 'guerze' | 'toma' | 'kpele' | 'baga' | 'loma' | 'mano' | 'kono' | 'en'
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

## 12. Page de Messe (`messe.tsx`)

### 12.1 Structure

- **Header** : Titre "Messe" + date du jour
- **Section** : Messes du jour par moment (entree, liturgie_parole, liturgie_eucharistique, communion, envoi)
- **Liste** : `FlatList` ou `ScrollView` avec `MesseItem` pour chaque moment
- **Détails** : Chants associés à chaque moment de la messe

### 12.2 Composants utilisés

- Composants `messe/` — Composants spécifiques à la messe
- `ChantCard` — Pour les chants de messe
- `ThemedText`, `ThemedView` — Layout

### 12.3 Logique

- `joursMesse[date]` → Messe du jour
- Affichage des `MesseItem` par `MomentMesse`
- Navigation vers `chant/[id]` pour chaque chant de messe

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

- `getSaint(new Date().toISOString())` — Saint du jour
- `getLecture(new Date().toISOString())` — Lecture du jour
- `lectures` depuis `mockData`

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
