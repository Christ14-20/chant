import '../shims/shims';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';

const originalRouterBack = router.back.bind(router);
(router as any).back = () => {
  if (typeof router.canGoBack === 'function' && router.canGoBack()) {
    return originalRouterBack();
  }

  return router.replace('/home');
};

import { hp } from "@/hooks/use-responsive";
import { useAppStore } from '@/store/useAppStore';

const TAB_ROUTES = ['home', 'chants', 'messe', 'favoris', 'parametres'];
const TAB_BAR_ROUTES = [...TAB_ROUTES, 'profile'];

export default function TabLayout() {
  return (
      <Tabs
        tabBar={(props) => <KotlinTabBar {...props} />}
        screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'house';
          if (route.name === 'home') iconName = focused ? 'house.fill' : 'house';
          else if (route.name === 'chants') iconName = focused ? 'music.note.list.fill' : 'music.note.list';
          else if (route.name === 'messe') iconName = focused ? 'cross.fill' : 'cross';
          else if (route.name === 'favoris') iconName = focused ? 'heart.fill' : 'heart';
          else if (route.name === 'parametres') iconName = focused ? 'ellipsis' : 'ellipsis';

          return <SymbolView name={iconName as any} size={size} tintColor={color} />;
        },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: StyleSheet.hairlineWidth,
          height: hp(8),
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
        })}>
      <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="chants" options={{ title: 'Chants' }} />
      <Tabs.Screen name="messe" options={{ title: 'Messe' }} />
      <Tabs.Screen name="favoris" options={{ title: 'Favoris' }} />
      <Tabs.Screen name="parametres" options={{ title: 'Réglages' }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="prieres" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="agenda" options={{ href: null }} />
      <Tabs.Screen name="saint/[id]" options={{ href: null }} />
      <Tabs.Screen name="aide" options={{ href: null }} />
      <Tabs.Screen name="chant/search" options={{ href: null }} />
      <Tabs.Screen name="chant/category/[type]/[id]" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="lecture" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="connexion" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="chant/[id]" options={{ href: null }} />
      <Tabs.Screen name="chant/nouveau" options={{ href: null }} />
      <Tabs.Screen name="priere/[id]" options={{ href: null }} />
      <Tabs.Screen name="priere/nouvelle" options={{ href: null }} />
      </Tabs>
  );
}

function KotlinTabBar({ state, descriptors, navigation }: any) {
  const currentRoute = state.routes[state.index]?.name;
  const routes = state.routes.filter((route: any) => TAB_ROUTES.includes(route.name));
  const showTabBar = TAB_BAR_ROUTES.includes(currentRoute);
  const iconNames: Record<string, string> = {
    home: 'home-outline',
    chants: 'music-note-eighth',
    messe: 'church',
    favoris: 'heart-outline',
    parametres: 'dots-horizontal',
  };

  return (
    <View style={styles.barShell}>
      <MiniPlayer />
      {showTabBar && routes.length > 0 && (
        <View style={styles.navBar}>
          {routes.map((route: any) => {
            const routeIndex = state.routes.findIndex((item: any) => item.key === route.key);
            const selected = state.index === routeIndex;
            const color = selected ? '#D4AF37' : '#94A3B8';
            const label = descriptors[route.key]?.options?.title ?? route.name;
            return (
              <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={label} onPress={() => navigation.navigate(route.name)} style={styles.tabItem}>
                <MaterialCommunityIcons name={iconNames[route.name] as any} size={21} color={color} />
                <Text style={[styles.tabLabel, { color }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function MiniPlayer() {
  const chants = useAppStore((state) => state.chants);
  const currentChantId = useAppStore((state) => state.currentChantId);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const stopPlayer = useAppStore((state) => state.stopPlayer);
  const chant = chants.find((item) => item.id === currentChantId);

  if (!chant) return null;

  return (
    <View style={styles.player}>
      <View style={styles.playerProgress} />
      <View style={styles.playerContent}>
        <View style={styles.playerArtwork}>
          <Text style={styles.playerArtworkLetter}>{chant.titre.slice(0, 1).toLocaleUpperCase()}</Text>
        </View>
        <View style={styles.playerCopy}>
          <Text numberOfLines={1} style={styles.playerTitle}>{chant.titre}</Text>
          <Text numberOfLines={1} style={styles.playerCategory}>{chant.categorie.replaceAll('_', ' ')}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Lecture'} onPress={togglePlay} style={styles.playerAction}>
          <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={22} color="#D4AF37" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le lecteur" onPress={stopPlayer} style={styles.playerAction}>
          <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barShell: { backgroundColor: '#FFFFFF' },
  navBar: { height: hp(8), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 7, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  tabItem: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  player: { height: 64, marginHorizontal: 8, marginTop: 4, marginBottom: 4, overflow: 'hidden', borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  playerProgress: { height: 2, backgroundColor: '#D4AF37' },
  playerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  playerArtwork: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#D4AF3726' },
  playerArtworkLetter: { color: '#D4AF37', fontSize: 16, fontWeight: '700' },
  playerCopy: { flex: 1, marginLeft: 12, gap: 2 },
  playerTitle: { color: '#111827', fontSize: 14, fontWeight: '700' },
  playerCategory: { color: '#6B7280', fontSize: 12, textTransform: 'capitalize' },
  playerAction: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
});
