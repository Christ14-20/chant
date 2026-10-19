import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';
import { useAppStore } from '@/store/useAppStore';

const COLORS = { background: '#0A1F44', card: '#0A1F44', divider: '#0A1F44', gold: '#7A1F3D', text: '#FFFFFF', secondary: '#0A1F44', tertiary: '#0A1F44', red: '#7A1F3D' };

const CONTENT_ITEMS = [
  { icon: 'heart-outline', color: '#7A1F3D', title: 'Mes favoris', subtitle: 'Vos chants et prières sauvegardés', route: '/favoris' as const },
  { icon: 'history', color: '#0A1F44', title: 'Mon historique', subtitle: 'Chants et préparations de Messe', route: '/historique' as const },
];
const ROLE_LABELS = { fidelle: 'Fidèle', choriste: 'Choriste', paroisse: 'Paroisse', admin: 'Administrateur' } as const;

export default function ProfileScreen() {
  useTheme();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const chants = useAppStore((state) => state.chants);
  const downloadedChants = useAppStore((state) => state.downloadedChants);
  const favorites = useAppStore((state) => state.favorites);
  const favoritePrieres = useAppStore((state) => state.favoritePrieres);
  const logout = useAppStore((state) => state.logout);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const totalFavorites = favorites.length + favoritePrieres.length;
  const displayName = user?.name || 'Mon profil';
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase();
  const accountLabel = user ? ROLE_LABELS[user.role] : 'Visiteur';

  const sections = [
    { title: 'MON CONTENU', items: CONTENT_ITEMS },
    { title: 'PRÉFÉRENCES', items: [
      { icon: 'lock-outline', color: COLORS.gold, title: 'Se connecter / Authentification', subtitle: 'Accéder à votre compte choriste', route: '/connexion' as const },
      { icon: 'bell-outline', color: COLORS.gold, title: 'Notifications', subtitle: 'Rappels, nouveautés', route: '/notifications' as const },
      { icon: 'cog-outline', color: '#0A1F44', title: 'Paramètres', subtitle: 'Compte, confidentialité', route: '/parametres' as const },
    ] },
    { title: 'SUPPORT', items: [
      { icon: 'help-circle-outline', color: '#0A1F44', title: 'Aide & FAQ', subtitle: 'Questions fréquentes', route: '/aide' as const },
      { icon: 'information-outline', color: '#0A1F44', title: 'À propos', subtitle: 'eGuine v1.2.0' },
    ] },
  ];

  const confirmLogout = () => {
    logout();
    setLogoutVisible(false);
    goBackSafely();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.topAction}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.topTitle}>Mon profil</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} style={styles.topAction}>
          <MaterialCommunityIcons name="bell-outline" size={21} color={COLORS.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Paramètres" onPress={() => router.push('/parametres')} style={styles.topAction}>
          <MaterialCommunityIcons name="cog-outline" size={21} color={COLORS.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <LinearGradient colors={['#0A1F44', '#0A1F44', '#0A1F44']} style={styles.cover}>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name="music-note" size={13} color={COLORS.background} />
              <Text style={styles.roleBadgeLabel}>{accountLabel.toLocaleUpperCase()}</Text>
            </View>
          </LinearGradient>
          <View style={styles.profileDetails}>
            <View style={styles.profileActionsRow}>
              <View style={styles.avatarWrap}>
                {user?.profileImage ? <Image source={{ uri: user.profileImage }} style={styles.avatarImage} /> : <LinearGradient colors={['#0A1F44', '#0A1F44']} style={styles.avatar}><Text style={styles.avatarInitials}>{initials}</Text></LinearGradient>}
              </View>
              <Pressable accessibilityRole="button" onPress={() => {}} style={styles.editButton}>
                <MaterialCommunityIcons name="pencil-outline" size={15} color={COLORS.text} />
                <Text style={styles.editLabel}>Modifier</Text>
              </Pressable>
            </View>
            <Text numberOfLines={1} style={styles.profileName}>{displayName}</Text>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="star" size={14} color={COLORS.gold} />
              <Text style={styles.profileMeta}>{accountLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat value={String(chants.length)} label="Chants" />
          <View style={styles.statDivider} />
          <Stat value={String(downloadedChants.length)} label="Téléchargés" />
          <View style={styles.statDivider} />
          <Stat value={String(totalFavorites)} label="Favoris" />
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <MenuItem
                key={item.title}
                icon={item.icon}
                color={item.color}
                title={item.title}
                subtitle={item.subtitle}
                badge={'badge' in item && typeof item.badge === 'string' ? item.badge : undefined}
                onPress={'route' in item && item.route ? () => router.push(item.route) : undefined}
              />
            ))}
          </View>
        ))}

        {user && (
          <Pressable accessibilityRole="button" onPress={() => setLogoutVisible(true)} style={styles.logoutButton}>
            <MaterialCommunityIcons name="logout" size={20} color={COLORS.red} />
            <Text style={styles.logoutLabel}>Se déconnecter</Text>
          </Pressable>
        )}
        <Text style={styles.footer}>eGuine</Text>
      </ScrollView>

      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={styles.dialogRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Annuler" onPress={() => setLogoutVisible(false)} style={styles.dialogScrim} />
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}><MaterialCommunityIcons name="logout" size={26} color={COLORS.red} /></View>
            <Text style={styles.dialogTitle}>Se déconnecter ?</Text>
            <Text style={styles.dialogMessage}>Tu devras te reconnecter pour accéder à tes favoris et à ta bibliothèque.</Text>
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setLogoutVisible(false)} style={styles.cancelButton}><Text style={styles.cancelLabel}>Annuler</Text></Pressable>
              <Pressable onPress={confirmLogout} style={styles.confirmButton}><Text style={styles.confirmLabel}>Déconnexion</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function MenuItem({ icon, color, title, subtitle, badge, onPress }: { icon: string; color: string; title: string; subtitle: string; badge?: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.menuRow}>
      <View style={[styles.menuIcon, { backgroundColor: `${color}26` }]}><MaterialCommunityIcons name={icon as any} size={21} color={color} /></View>
      <View style={styles.menuCopy}><Text numberOfLines={1} style={styles.menuTitle}>{title}</Text><Text numberOfLines={1} style={styles.menuSubtitle}>{subtitle}</Text></View>
      {badge && <View style={[styles.menuBadge, { backgroundColor: `${color}30` }]}><Text style={[styles.menuBadgeText, { color }]}>{badge}</Text></View>}
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.tertiary} />
    </Pressable>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  topAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: COLORS.text, fontSize: 20, fontWeight: '700' },
  content: { paddingTop: 12, paddingBottom: 28 },
  profileCard: { marginHorizontal: 12, overflow: 'hidden', borderRadius: 16, backgroundColor: COLORS.card },
  cover: { height: 110, alignItems: 'flex-end', padding: 12 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: COLORS.gold },
  roleBadgeLabel: { color: COLORS.background, fontSize: 10, fontWeight: '800' },
  profileDetails: { paddingHorizontal: 20, paddingBottom: 18 },
  profileActionsRow: { minHeight: 50, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -40 },
  avatarWrap: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 45, backgroundColor: COLORS.card },
  avatar: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderRadius: 42 },
  avatarImage: { width: 82, height: 82, borderRadius: 41 },
  avatarInitials: { color: COLORS.text, fontSize: 30, fontWeight: '700' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 1, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FFFFFF26', borderRadius: 10, backgroundColor: '#FFFFFF1A' },
  editLabel: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  profileName: { marginTop: 8, color: COLORS.text, fontSize: 20, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  profileMeta: { color: COLORS.secondary, fontSize: 12 },
  parishMeta: { flex: 1, color: COLORS.tertiary, fontSize: 12 },
  statsRow: { minHeight: 80, flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 12, borderWidth: 1, borderColor: COLORS.divider, borderRadius: 14, backgroundColor: COLORS.card },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  statLabel: { color: COLORS.secondary, fontSize: 11 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.divider },
  section: { marginTop: 8 },
  sectionTitle: { marginLeft: 20, marginTop: 14, marginBottom: 4, color: COLORS.tertiary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  menuRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${COLORS.divider}80` },
  menuIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  menuCopy: { flex: 1, gap: 3 },
  menuTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  menuSubtitle: { color: COLORS.secondary, fontSize: 11 },
  menuBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  menuBadgeText: { fontSize: 11, fontWeight: '700' },
  logoutButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginHorizontal: 12, marginTop: 15, padding: 13, borderWidth: 1, borderColor: '#7A1F3D4D', borderRadius: 12, backgroundColor: COLORS.card },
  logoutLabel: { color: COLORS.red, fontSize: 14, fontWeight: '600' },
  footer: { marginTop: 20, paddingVertical: 12, color: COLORS.tertiary, fontSize: 11, textAlign: 'center' },
  dialogRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialogScrim: { ...StyleSheet.absoluteFill, backgroundColor: '#00000099' },
  dialog: { width: '100%', maxWidth: 380, alignItems: 'center', padding: 22, borderRadius: 16, backgroundColor: COLORS.card },
  dialogIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: '#7A1F3D26' },
  dialogTitle: { marginTop: 14, color: COLORS.text, fontSize: 18, fontWeight: '700' },
  dialogMessage: { marginTop: 8, color: COLORS.secondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, alignSelf: 'stretch', marginTop: 20 },
  cancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14 },
  cancelLabel: { color: COLORS.secondary, fontSize: 13, fontWeight: '600' },
  confirmButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 11, backgroundColor: COLORS.red },
  confirmLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
});
