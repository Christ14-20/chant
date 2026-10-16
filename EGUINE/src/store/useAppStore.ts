import { create } from 'zustand';
import type { Celebration, Chant, Langue, MomentMesse, OfflineStatus, Playlist, Priere, Role, User } from '@/types';
import { chants as mockChants, prieres as mockPrières } from '@/data/mockData';

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
  addCelebration: (celebration: Celebration) => void;
  addChantToCelebration: (celebrationId: string, moment: MomentMesse, chantId: string) => void;
  removeChantFromCelebration: (celebrationId: string, moment: MomentMesse, chantId: string) => void;
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
const DEFAULT_CELEBRATION: Celebration = {
  id: 'default',
  title: 'Messe du dimanche',
  date: '2024-09-22',
  temps_liturgique: 'temps_ordinaire',
  selectedChants: { entree: ['2'], communion: ['3'], envoi: ['4'] },
};

export const useAppStore = create<AppState>((set, get) => ({
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
  themeMode: 'light',
  setThemeMode: (themeMode) => set({ themeMode }),
  fontSize: 'medium',
  setFontSize: (fontSize) => set({ fontSize }),
  autoDownload: false,
  setAutoDownload: (autoDownload) => set({ autoDownload }),
  notificationsEnabled: true,
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  favorites: [],
  chants: mockChants,
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
  playlists: [
    {
      id: 'pl-1',
      user_id: 'user-1',
      nom: 'Mes favoris',
      description: 'Mes chants préférés',
      chants: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  addPlaylist: (nom, chantIds) =>
    set((state) => ({
      playlists: [
        ...state.playlists,
        {
          id: `pl-${Date.now()}`,
          user_id: state.user?.id || 'user-1',
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
  prieres: mockPrières,
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
  unreadNotifications: 2,
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  celebrations: [DEFAULT_CELEBRATION],
  addCelebration: (celebration) =>
    set((state) => ({ celebrations: [...state.celebrations, celebration] })),
  addChantToCelebration: (celebrationId, moment, chantId) =>
    set((state) => ({
      celebrations: state.celebrations.map((celebration) =>
        celebration.id !== celebrationId
          ? celebration
          : {
              ...celebration,
              selectedChants: {
                ...celebration.selectedChants,
                [moment]: [...new Set([...(celebration.selectedChants[moment] ?? []), chantId])],
              },
            }
      ),
    })),
  removeChantFromCelebration: (celebrationId, moment, chantId) =>
    set((state) => ({
      celebrations: state.celebrations.map((celebration) =>
        celebration.id !== celebrationId
          ? celebration
          : {
              ...celebration,
              selectedChants: {
                ...celebration.selectedChants,
                [moment]: (celebration.selectedChants[moment] ?? []).filter((id) => id !== chantId),
              },
            }
      ),
    })),
  resetCelebration: (celebrationId) =>
    set((state) => ({
      celebrations: state.celebrations.map((celebration) =>
        celebration.id === celebrationId ? { ...celebration, selectedChants: {} } : celebration
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
}));
