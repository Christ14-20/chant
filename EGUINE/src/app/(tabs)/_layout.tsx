import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import '../../shims/shims';

import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { ActionColors } from '@/constants/theme';

const TAB_ROUTES = ['home', 'chants', 'messe', 'favoris', 'parametres'];
const TAB_BAR_ROUTES = [...TAB_ROUTES, 'profile'];

export default function TabLayout() {
  useTheme();
  return (
      <Tabs
        tabBar={(props) => <KotlinTabBar {...props} />}
        screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'house';
          const tabName = normalizeTabRoute(route.name);
          if (tabName === 'home') iconName = focused ? 'house.fill' : 'house';
          else if (tabName === 'chants') iconName = focused ? 'music.note.list.fill' : 'music.note.list';
          else if (tabName === 'messe') iconName = focused ? 'cross.fill' : 'cross';
          else if (tabName === 'favoris') iconName = focused ? 'heart.fill' : 'heart';
          else if (tabName === 'parametres') iconName = focused ? 'ellipsis' : 'ellipsis';

          return <SymbolView name={iconName as any} size={size} tintColor={color} />;
        },
        tabBarActiveTintColor: '#7A1F3D',
        tabBarInactiveTintColor: '#0A1F44',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#FFFFFF',
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        headerShown: false,
        })}>
      <Tabs.Screen name="home/index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="chants/index" options={{ title: 'Chants' }} />
      <Tabs.Screen name="messe/index" options={{ title: 'Messe' }} />
      <Tabs.Screen name="favoris/index" options={{ title: 'Favoris' }} />
      <Tabs.Screen name="parametres/index" options={{ title: 'Réglages' }} />
      </Tabs>
  );
}

function KotlinTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const themeMode = useAppStore((store) => store.themeMode);
  const systemScheme = useColorScheme();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  const currentRoute = normalizeTabRoute(state.routes[state.index]?.name ?? '');
  const routes = state.routes.filter((route: any) =>
    TAB_ROUTES.includes(normalizeTabRoute(route.name))
  );
  const showTabBar = TAB_BAR_ROUTES.includes(currentRoute);
  const iconNames: Record<string, string> = {
    home: 'home-outline',
    chants: 'music-note-eighth',
    messe: 'church',
    favoris: 'heart-outline',
    parametres: 'dots-horizontal',
  };

  return (
    <View style={[styles.barShell, { paddingBottom: insets.bottom, backgroundColor: isDark ? '#0A1F44' : '#FFFFFF' }]}>
      <MiniPlayer isDark={isDark} />
      {showTabBar && routes.length > 0 && (
        <View style={[styles.navBar, { backgroundColor: isDark ? '#0A1F44' : '#FFFFFF', borderTopColor: isDark ? '#FFFFFF' : '#0A1F44' }]}>
          {routes.map((route: any) => {
            const routeIndex = state.routes.findIndex((item: any) => item.key === route.key);
            const selected = state.index === routeIndex;
            const tabName = normalizeTabRoute(route.name);
            const color = selected ? '#7A1F3D' : isDark ? '#FFFFFF' : '#0A1F44';
            const label = descriptors[route.key]?.options?.title ?? tabName;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!selected && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                style={styles.tabItem}
              >
                <MaterialCommunityIcons name={iconNames[tabName] as any} size={21} color={color} />
                <Text style={[styles.tabLabel, { color }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function normalizeTabRoute(routeName: string) {
  return routeName.endsWith('/index')
    ? routeName.slice(0, -'/index'.length)
    : routeName;
}

function MiniPlayer({ isDark }: { isDark: boolean }) {
  const chants = useAppStore((state) => state.chants);
  const currentChantId = useAppStore((state) => state.currentChantId);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const stopPlayer = useAppStore((state) => state.stopPlayer);
  const chant = chants.find((item) => item.id === currentChantId);

  if (!chant) return null;

  return (
    <View style={[styles.player, { backgroundColor: isDark ? '#0A1F44' : '#FFFFFF', borderColor: isDark ? '#FFFFFF' : '#0A1F44' }]}>
      <View style={styles.playerProgress} />
      <View style={styles.playerContent}>
        <View style={styles.playerArtwork}>
          <Text style={styles.playerArtworkLetter}>{chant.titre.slice(0, 1).toLocaleUpperCase()}</Text>
        </View>
        <View style={styles.playerCopy}>
          <Text numberOfLines={1} style={[styles.playerTitle, { color: isDark ? '#FFFFFF' : '#0A1F44' }]}>{chant.titre}</Text>
          <Text numberOfLines={1} style={[styles.playerCategory, { color: isDark ? '#FFFFFF' : '#0A1F44' }]}>{chant.categorie.replaceAll('_', ' ')}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Lecture'} onPress={togglePlay} style={styles.playerAction}>
          <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={22} color={ActionColors.playback} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le lecteur" onPress={stopPlayer} style={styles.playerAction}>
          <MaterialCommunityIcons name="close" size={20} color={isDark ? '#FFFFFF' : '#0A1F44'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = createThemedStyles({
  barShell: { backgroundColor: '#FFFFFF' },
  navBar: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 4, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#0A1F44', backgroundColor: '#FFFFFF' },
  tabItem: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  player: { height: 64, marginHorizontal: 8, marginTop: 4, marginBottom: 4, overflow: 'hidden', borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FFFFFF' },
  playerProgress: { height: 2, backgroundColor: ActionColors.playback },
  playerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  playerArtwork: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: ActionColors.playbackSoft },
  playerArtworkLetter: { color: ActionColors.playback, fontSize: 16, fontWeight: '700' },
  playerCopy: { flex: 1, marginLeft: 12, gap: 2 },
  playerTitle: { color: '#0A1F44', fontSize: 14, fontWeight: '700' },
  playerCategory: { color: '#0A1F44', fontSize: 12, textTransform: 'capitalize' },
  playerAction: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
});
