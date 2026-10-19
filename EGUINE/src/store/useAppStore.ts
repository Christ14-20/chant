import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Celebration, Chant, Langue, OfflineStatus, Playlist, Priere, Role, User } from '@/types';
import { initialChants } from '@/data/initialChants';
import { DEFAULT_CELEBRATION_SLOT_IDS, reorderCelebrationSlotIds } from '@/utils/celebration-order';
import { normalizeInterfaceLanguage } from '@/i18n/translations';

interface RecentActivity {
  path: string;
}

export type InterfaceLanguage = 'fr' | 'en';

interface AppState {
  user: User | null;
  isLoggedIn: boolean;
  setUser: (user: User | null) => void;
  updateUser: (partial: Partial<User>) => void;
  login: (name: string, email?: string) => void;
  logout: () => void;
  role: Role;
  setRole: (role: Role) => void;
  languagePref: Langue;
  setLanguagePref: (lang: Langue) => void;
  interfaceLanguage: InterfaceLanguage;
  setInterfaceLanguage: (language: InterfaceLanguage) => void;
  hasSeenWelcome: boolean;
  completeWelcome: () => void;
  replayWelcome: () => void;
  discoveredScreens: string[];
  markDiscoveryScreenSeen: (screenId: string) => void;
  resetDiscoveryGuides: () => void;
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  setFontSize: (size: 'small' | 'medium' | 'large' | 'xlarge') => void;
  autoDownload: boolean;
  setAutoDownload: (value: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  // Favoris chants — tableau d'IDs
  favorites: string[];
  chants: Chant[];
  personalChants: Chant[];
  addPersonalChant: (chant: Chant) => void;
  updatePersonalChant: (
    chantId: string,
    updates: Partial<Omit<Chant, 'id' | 'est_personnel' | 'created_at'>>
  ) => void;
  removePersonalChant: (chantId: string) => void;
  getChant: (id: string) => Chant | undefined;
  getFavoriteChants: () => Chant[];
  toggleFavorite: (chantId: string) => void;
  isFavorite: (chantId: string) => boolean;
  playlists: Playlist[];
  addPlaylist: (nom: string, chantIds?: string[]) => void;
  removePlaylist: (playlistId: string) => void;
  addToPlaylist: (playlistId: string, chantId: string) => void;
  offlineStatus: OfflineStatus;
  setOfflineStatus: (status: OfflineStatus) => void;
  downloadedChants: string[];
  toggleDownload: (chantId: string) => void;
  isDownloaded: (chantId: string) => boolean;
  clearCache: () => Promise<void>;
  prieres: Priere[];
  favoritePrieres: string[];
  isFavoritePriere: (priereId: string) => boolean;
  toggleFavoritePriere: (priereId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
  celebrations: Celebration[];
  hasBootstrappedCelebrations: boolean;
  activeCelebrationId: string | null;
  recentActivities: RecentActivity[];
  recordRecentActivity: (path: string) => void;
  removeRecentActivity: (path: string) => void;
  clearRecentActivities: () => void;
  addCelebration: (celebration: Celebration) => void;
  duplicateCelebration: (celebrationId: string) => void;
  setActiveCelebration: (celebrationId: string) => void;
  updateCelebration: (celebrationId: string, updates: Partial<Pick<Celebration, 'title' | 'date' | 'temps_liturgique' | 'status'>>) => void;
  deleteCelebration: (celebrationId: string) => void;
  setCelebrationSlotChants: (celebrationId: string, slotKey: string, chantIds: string[]) => void;
  reorderCelebrationSlots: (celebrationId: string, slotId: string, direction: -1 | 1) => void;
  addCustomMoment: (celebrationId: string, title: string) => void;
  removeCustomMoment: (celebrationId: string, momentId: string) => void;
  resetCelebration: (celebrationId: string) => void;
  currentChantId: string | null;
  isPlaying: boolean;
  playbackProgress: number;
  playChant: (chantId: string) => void;
  togglePlay: () => void;
  setPlaybackProgress: (progress: number) => void;
  stopPlayer: () => void;
}

const defaultRole: Role = 'fidelle';
const defaultLanguagePref: Langue = 'fr';
function getDeviceInterfaceLanguage(): InterfaceLanguage {
  try {
    return normalizeInterfaceLanguage(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'fr';
  }
}
const defaultInterfaceLanguage = getDeviceInterfaceLanguage();
let pendingAppStorageWrite: Promise<void> = Promise.resolve();
const appStorage = {
  getItem: (name: string) => typeof window === 'undefined' ? Promise.resolve(null) : AsyncStorage.getItem(name),
  setItem: (name: string, value: string) => {
    const write = pendingAppStorageWrite
      .catch((error: unknown) => {
        console.error('Une écriture précédente du stockage local eGuine a échoué.', error);
      })
      .then(async () => {
        if (typeof window !== 'undefined') await AsyncStorage.setItem(name, value);
      });
    pendingAppStorageWrite = write;
    return write;
  },
  removeItem: (name: string) => typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.removeItem(name),
};
export function flushAppStorePersistence(): Promise<void> {
  return pendingAppStorageWrite;
}
function isStoredPersonalChant(value: unknown): value is Chant {
  if (!value || typeof value !== 'object') return false;
  const chant = value as Partial<Chant>;
  return chant.est_personnel === true
    && typeof chant.id === 'string'
    && typeof chant.titre === 'string'
    && typeof chant.paroles === 'string'
    && typeof chant.langue === 'string'
    && typeof chant.categorie === 'string'
    && Array.isArray(chant.tags)
    && Array.isArray(chant.variantes)
    && Array.isArray(chant.ressources)
    && typeof chant.created_at === 'string'
    && typeof chant.updated_at === 'string'
    && chant.ressources.every((resource) =>
      Boolean(resource)
      && typeof resource.id === 'string'
      && typeof resource.uri === 'string'
      && ['audio', 'image', 'pdf'].includes(resource.type)
    );
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  user: null,
  isLoggedIn: false,
  setUser: (user) => set({ user }),
  updateUser: (partial) =>
    set((state) => ({ user: state.user ? { ...state.user, ...partial } : state.user })),
  login: (name, email) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role: 'fidelle',
      language_pref: 'fr',
      created_at: new Date().toISOString(),
    };
    set({ user: newUser, isLoggedIn: true, role: 'fidelle' });
  },
  logout: () => set({ user: null, isLoggedIn: false, favorites: [], favoritePrieres: [], downloadedChants: [] }),
  role: defaultRole,
  setRole: (role) =>
    set((state) => ({
      role,
      user: state.user ? { ...state.user, role } : state.user,
    })),
  languagePref: defaultLanguagePref,
  setLanguagePref: (languagePref) =>
    set((state) => ({
      languagePref,
      user: state.user ? { ...state.user, language_pref: languagePref } : state.user,
    })),
  interfaceLanguage: defaultInterfaceLanguage,
  setInterfaceLanguage: (interfaceLanguage) => set({ interfaceLanguage }),
  hasSeenWelcome: false,
  completeWelcome: () => set({ hasSeenWelcome: true }),
  replayWelcome: () => set({ hasSeenWelcome: false }),
  discoveredScreens: [],
  markDiscoveryScreenSeen: (screenId) => set((state) => ({
    discoveredScreens: state.discoveredScreens.includes(screenId)
      ? state.discoveredScreens
      : [...state.discoveredScreens, screenId],
  })),
  resetDiscoveryGuides: () => set({ discoveredScreens: [] }),
  themeMode: 'light',
  setThemeMode: (themeMode) => set({ themeMode }),
  fontSize: 'medium',
  setFontSize: (fontSize) => set({ fontSize }),
  autoDownload: false,
  setAutoDownload: (autoDownload) => set({ autoDownload }),
  notificationsEnabled: true,
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  favorites: [],
  chants: initialChants,
  personalChants: [],
  addPersonalChant: (chant) =>
    set((state) => {
      if (state.personalChants.some((saved) => saved.id === chant.id)) {
        throw new Error(`Le chant personnel ${chant.id} existe déjà.`);
      }
      const personalChant = { ...chant, est_personnel: true };
      return {
        personalChants: [...state.personalChants, personalChant],
        chants: [...state.chants.filter((saved) => saved.id !== chant.id), personalChant],
      };
    }),
  updatePersonalChant: (chantId, updates) =>
    set((state) => {
      const personalChant = state.personalChants.find((chant) => chant.id === chantId);
      if (!personalChant) return state;
      const updatedChant = {
        ...personalChant,
        ...updates,
        id: chantId,
        est_personnel: true,
        updated_at: new Date().toISOString(),
      };
      return {
        personalChants: state.personalChants.map((chant) =>
          chant.id === chantId ? updatedChant : chant
        ),
        chants: state.chants.map((chant) => chant.id === chantId ? updatedChant : chant),
      };
    }),
  removePersonalChant: (chantId) =>
    set((state) => ({
      personalChants: state.personalChants.filter((chant) => chant.id !== chantId),
      chants: state.chants.filter((chant) => chant.id !== chantId),
      favorites: state.favorites.filter((id) => id !== chantId),
      playlists: state.playlists.map((playlist) => ({
        ...playlist,
        chants: playlist.chants.filter((chant) => chant.id !== chantId),
      })),
      celebrations: state.celebrations.map((celebration) => ({
        ...celebration,
        selectedChants: Object.fromEntries(
          Object.entries(celebration.selectedChants)
            .map(([slot, ids]) => [slot, (ids ?? []).filter((id) => id !== chantId)])
        ),
      })),
    })),
  getChant: (id) => get().chants.find((c) => c.id === id),
  getFavoriteChants: () => {
    const { favorites, chants } = get();
    return chants.filter((c) => favorites.includes(c.id));
  },
  toggleFavorite: (chantId) =>
    set((state) => ({
      favorites: state.favorites.includes(chantId)
        ? state.favorites.filter((id) => id !== chantId)
        : [...state.favorites, chantId],
    })),
  isFavorite: (chantId) => get().favorites.includes(chantId),
  playlists: [],
  addPlaylist: (nom, chantIds) =>
    set((state) => ({
      playlists: [
        ...state.playlists,
        {
          id: `pl-${Date.now()}`,
          user_id: state.user?.id ?? 'local',
          nom,
          chants: chantIds
            ?.map((id) => state.chants.find((c) => c.id === id))
            .filter((c): c is Chant => c !== undefined) || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    })),
  removePlaylist: (playlistId) =>
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== playlistId),
    })),
  addToPlaylist: (playlistId, chantId) =>
    set((state) => ({
      playlists: state.playlists.map((p) => {
        if (p.id !== playlistId) return p;
        const chant = state.chants.find((c) => c.id === chantId);
        if (!chant || p.chants.some((c) => c.id === chantId)) return p;
        return {
          ...p,
          chants: [...p.chants, chant],
          updated_at: new Date().toISOString(),
        };
      }),
    })),
  offlineStatus: 'connecte',
  setOfflineStatus: (offlineStatus) => set({ offlineStatus }),
  downloadedChants: [],
  toggleDownload: (chantId) =>
    set((state) => ({
      downloadedChants: state.downloadedChants.includes(chantId)
        ? state.downloadedChants.filter((id) => id !== chantId)
        : [...state.downloadedChants, chantId],
    })),
  isDownloaded: (chantId) => get().downloadedChants.includes(chantId),
  clearCache: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    set({ downloadedChants: [] });
  },
  prieres: [],
  favoritePrieres: [],
  isFavoritePriere: (priereId) => get().favoritePrieres.includes(priereId),
  toggleFavoritePriere: (priereId) =>
    set((state) => ({
      favoritePrieres: state.favoritePrieres.includes(priereId)
        ? state.favoritePrieres.filter((id) => id !== priereId)
        : [...state.favoritePrieres, priereId],
    })),
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  unreadNotifications: 0,
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  celebrations: [],
  hasBootstrappedCelebrations: false,
  activeCelebrationId: null,
  recentActivities: [],
  recordRecentActivity: (path) => {
    const normalizedPath = path.split('?')[0].replace(/\/+$/, '') || '/';
    if (normalizedPath === '/' || normalizedPath === '/home') return;
    set((state) => ({
      recentActivities: [
        { path: normalizedPath },
        ...state.recentActivities.filter((activity) => activity.path !== normalizedPath),
      ].slice(0, 5),
    }));
  },
  removeRecentActivity: (path) =>
    set((state) => ({
      recentActivities: state.recentActivities.filter((activity) => activity.path !== path),
    })),
  clearRecentActivities: () => set({ recentActivities: [] }),
  addCelebration: (celebration) => {
    const now = new Date().toISOString();
    set((state) => ({
      celebrations: [
        ...state.celebrations,
        {
          ...celebration,
          created_at: celebration.created_at ?? now,
          updated_at: celebration.updated_at ?? now,
          status: celebration.status ?? 'draft',
          slotOrder: celebration.slotOrder ?? [...DEFAULT_CELEBRATION_SLOT_IDS],
        },
      ],
      activeCelebrationId: celebration.id,
    }));
  },
  duplicateCelebration: (celebrationId) =>
    set((state) => {
      const source = state.celebrations.find((celebration) => celebration.id === celebrationId);
      if (!source) return state;
      const cloneId = `messe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duplicate: Celebration = {
        ...source,
        id: cloneId,
        title: `${source.title} (copie)`,
        selectedChants: Object.fromEntries(
          Object.entries(source.selectedChants).map(([key, ids]) => [key, [...(ids ?? [])]])
        ),
        customMoments: source.customMoments ? source.customMoments.map((moment) => ({ ...moment })) : [],
        slotOrder: source.slotOrder ? [...source.slotOrder] : [...DEFAULT_CELEBRATION_SLOT_IDS],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'draft',
      };
      return {
        celebrations: [...state.celebrations, duplicate],
        activeCelebrationId: cloneId,
      };
    }),
  setActiveCelebration: (activeCelebrationId) => set({ activeCelebrationId }),
  updateCelebration: (celebrationId, updates) =>
    set((state) => ({
      celebrations: state.celebrations.map((celebration) =>
        celebration.id === celebrationId
          ? { ...celebration, ...updates, updated_at: new Date().toISOString() }
          : celebration
      ),
    })),
  deleteCelebration: (celebrationId) =>
    set((state) => {
      const celebrations = state.celebrations.filter((celebration) => celebration.id !== celebrationId);
      return {
        celebrations,
        activeCelebrationId: state.activeCelebrationId === celebrationId
          ? celebrations[0]?.id ?? null
          : state.activeCelebrationId,
      };
    }),
  addCustomMoment: (celebrationId, title) =>
    set((state) => ({
      celebrations: state.celebrations.map((celebration) => {
        if (celebration.id !== celebrationId) return celebration;
        const customMomentId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const nextCustomMoments = [...(celebration.customMoments ?? []), { id: customMomentId, title }];
        return {
          ...celebration,
          updated_at: new Date().toISOString(),
          customMoments: nextCustomMoments,
          slotOrder: [...new Set([...(celebration.slotOrder ?? DEFAULT_CELEBRATION_SLOT_IDS), customMomentId])],
        };
      }),
    })),
  removeCustomMoment: (celebrationId, momentId) =>
    set((state) => ({
      celebrations: state.celebrations.map((celebration) => {
        if (celebration.id !== celebrationId) return celebration;
        const selectedChants = { ...celebration.selectedChants };
        delete selectedChants[momentId];
        delete selectedChants[`slot:${momentId}`];
        return {
          ...celebration,
          updated_at: new Date().toISOString(),
          customMoments: (celebration.customMoments ?? []).filter((moment) => moment.id !== momentId),
          slotOrder: (celebration.slotOrder ?? DEFAULT_CELEBRATION_SLOT_IDS).filter((slotId) => slotId !== momentId),
          selectedChants,
        };
      }),
    })),
  setCelebrationSlotChants: (celebrationId, slotKey, chantIds) =>
    set((state) => ({
      celebrations: state.celebrations.map((celebration) =>
        celebration.id !== celebrationId
          ? celebration
          : {
              ...celebration,
              updated_at: new Date().toISOString(),
              selectedChants: {
                ...celebration.selectedChants,
                [slotKey]: [...new Set(chantIds)],
              },
            }
      ),
    })),
  reorderCelebrationSlots: (celebrationId, slotId, direction) =>
    set((state) => ({
      celebrations: state.celebrations.map((celebration) => {
        if (celebration.id !== celebrationId) return celebration;
        const slotIds = [
          ...DEFAULT_CELEBRATION_SLOT_IDS,
          ...(celebration.customMoments ?? []).map((moment) => moment.id),
        ];
        return {
          ...celebration,
          slotOrder: reorderCelebrationSlotIds(celebration.slotOrder, slotId, direction, slotIds),
          updated_at: new Date().toISOString(),
        };
      }),
    })),
  resetCelebration: (celebrationId) =>
    set((state) => ({
      celebrations: state.celebrations.map((celebration) =>
        celebration.id === celebrationId
          ? { ...celebration, selectedChants: {}, updated_at: new Date().toISOString() }
          : celebration
      ),
    })),
  currentChantId: null,
  isPlaying: false,
  playbackProgress: 0,
  playChant: (currentChantId) => {
    const currentState = get();
    if (currentState.chants.some((chant) => chant.id === currentChantId)) {
      set({ currentChantId, isPlaying: true, playbackProgress: currentState.currentChantId === currentChantId ? currentState.playbackProgress : 0 });
    }
  },
  togglePlay: () => set((state) => state.currentChantId ? { isPlaying: !state.isPlaying } : state),
  setPlaybackProgress: (playbackProgress) => set({ playbackProgress: Math.max(0, Math.min(1, playbackProgress)) }),
  stopPlayer: () => set({ currentChantId: null, isPlaying: false, playbackProgress: 0 }),
}), {
  name: 'eguine-celebrations',
  storage: createJSONStorage(() => appStorage),
  partialize: (state) => ({
    celebrations: state.celebrations,
    hasBootstrappedCelebrations: state.hasBootstrappedCelebrations,
    activeCelebrationId: state.activeCelebrationId,
    recentActivities: state.recentActivities,
    themeMode: state.themeMode,
    fontSize: state.fontSize,
    languagePref: state.languagePref,
    interfaceLanguage: state.interfaceLanguage,
    hasSeenWelcome: state.hasSeenWelcome,
    discoveredScreens: state.discoveredScreens,
    notificationsEnabled: state.notificationsEnabled,
    personalChants: state.personalChants,
  }),
  merge: (persistedState, currentState) => {
    const persisted = persistedState && typeof persistedState === 'object'
      ? persistedState as Partial<AppState>
      : {};
    const hasLegacyInstallationState = Object.keys(persisted).length > 0;
    const personalChants = Array.isArray(persisted.personalChants)
      ? persisted.personalChants.filter(isStoredPersonalChant)
      : [];
    const recentActivities = Array.isArray(persisted.recentActivities)
      ? persisted.recentActivities
        .filter((activity): activity is RecentActivity =>
          Boolean(activity)
          && typeof activity === 'object'
          && typeof activity.path === 'string'
        )
        .slice(0, 5)
      : currentState.recentActivities;
    const personalIds = new Set(personalChants.map((chant) => chant.id));
    const celebrations = (Array.isArray(persisted.celebrations)
      ? persisted.celebrations
      : currentState.celebrations).filter((celebration) =>
      !(celebration.id === 'default'
        && celebration.title === 'Messe du dimanche'
        && celebration.date === '2024-09-22')
    );
    return {
      ...currentState,
      ...persisted,
      interfaceLanguage: persisted.interfaceLanguage === 'en' || persisted.interfaceLanguage === 'fr'
        ? persisted.interfaceLanguage
        : currentState.interfaceLanguage,
      hasSeenWelcome: typeof persisted.hasSeenWelcome === 'boolean'
        ? persisted.hasSeenWelcome
        : hasLegacyInstallationState,
      discoveredScreens: Array.isArray(persisted.discoveredScreens)
        ? [...new Set(persisted.discoveredScreens.filter((screenId): screenId is string => typeof screenId === 'string'))]
        : currentState.discoveredScreens,
      celebrations,
      hasBootstrappedCelebrations: persisted.hasBootstrappedCelebrations === true,
      personalChants,
      recentActivities,
      activeCelebrationId: typeof persisted.activeCelebrationId === 'string'
        && celebrations
          .some((celebration) => celebration.id === persisted.activeCelebrationId)
        ? persisted.activeCelebrationId
        : celebrations[0]?.id ?? null,
      chants: [
        ...currentState.chants.filter((chant) => !personalIds.has(chant.id)),
        ...personalChants,
      ],
    };
  },
  onRehydrateStorage: () => (_state, error) => {
    if (error) {
      console.error('Impossible de restaurer les préférences locales eGuine.', error);
    }
  },
}));
