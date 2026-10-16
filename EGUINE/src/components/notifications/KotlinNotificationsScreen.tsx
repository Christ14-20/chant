import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';

const COLORS = { background: '#F9FAFB', surface: '#FFFFFF', navy: '#0A1F44', gold: '#D4AF37', text: '#111827', muted: '#6B7280', border: '#E5E7EB', blue: '#1877F2', rose: '#D96A8E', orange: '#E67E22', system: '#6B7689' };

type NotificationType = 'CHANT' | 'MESSE' | 'ANNONCE' | 'PRIERE' | 'SYSTEME';
type NotificationItem = { id: string; title: string; message: string; date: string; isRead: boolean; type: NotificationType };

type Tab = 'Toutes' | 'Chants' | 'Messes' | 'Annonces';
const TABS: Tab[] = ['Toutes', 'Chants', 'Messes', 'Annonces'];
const TYPE_STYLE: Record<NotificationType, { label: string; icon: string; color: string }> = {
  CHANT: { label: 'Chant', icon: 'music-note', color: COLORS.blue },
  MESSE: { label: 'Messe', icon: 'church', color: '#D4A24C' },
  ANNONCE: { label: 'Annonce', icon: 'bullhorn-outline', color: COLORS.orange },
  PRIERE: { label: 'Prière', icon: 'hands-pray', color: COLORS.rose },
  SYSTEME: { label: 'Système', icon: 'cog-outline', color: COLORS.system },
};
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', title: 'Nouveau chant disponible', message: '« Reine de la Paix » est prêt à être écouté.', date: 'Il y a 2h', isRead: false, type: 'CHANT' },
  { id: '2', title: 'Messe de dimanche', message: 'La préparation de la messe est en ligne. 8 chants, 3 lectures.', date: 'Il y a 5h', isRead: false, type: 'MESSE' },
  { id: '3', title: 'Intention de prière', message: 'Marie Louise a partagé une intention pour sa grand-mère.', date: 'Il y a 8h', isRead: false, type: 'PRIERE' },
  { id: '4', title: 'Rappel : Répétition', message: 'Répétition générale samedi 16h30 à Sainte Marie.', date: 'Hier', isRead: true, type: 'ANNONCE' },
  { id: '5', title: 'Ton chant a été publié', message: '« Ave Maria » est maintenant visible par la communauté.', date: 'Il y a 2 jours', isRead: true, type: 'CHANT' },
  { id: '6', title: 'Mise à jour disponible', message: 'Version 1.2 : nouvelles fonctionnalités et corrections.', date: 'Il y a 5 jours', isRead: true, type: 'SYSTEME' },
];

function groupForDate(date: string): string {
  if (date.toLocaleLowerCase().includes('il y a') && !date.toLocaleLowerCase().includes('jour')) return "Aujourd'hui";
  if (date.toLocaleLowerCase().includes('hier') || date.toLocaleLowerCase().includes('jour')) return 'Cette semaine';
  return 'Plus tôt';
}

export default function KotlinNotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [selectedTab, setSelectedTab] = useState<Tab>('Toutes');
  const [menuId, setMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => notifications.filter((item) => {
    switch (selectedTab) {
      case 'Chants': return item.type === 'CHANT';
      case 'Messes': return item.type === 'MESSE';
      case 'Annonces': return item.type === 'ANNONCE' || item.type === 'PRIERE';
      default: return true;
    }
  }), [notifications, selectedTab]);
  const grouped = useMemo(() => {
    const groups: { title: string; items: NotificationItem[] }[] = [];
    filtered.forEach((item) => {
      const title = groupForDate(item.date);
      let group = groups.find((current) => current.title === title);
      if (!group) { group = { title, items: [] }; groups.push(group); }
      group.items.push(item);
    });
    return groups;
  }, [filtered]);

  const markAllRead = () => setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  const markRead = (id: string) => setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
  const removeNotification = (id: string) => setNotifications((current) => current.filter((item) => item.id !== id));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={21} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.topTitle}>Notifications</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Tout marquer comme lu" onPress={markAllRead} style={styles.markAllButton}>
          <MaterialCommunityIcons name="check-all" size={22} color={COLORS.navy} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable key={tab} onPress={() => setSelectedTab(tab)} style={[styles.tab, selectedTab === tab && styles.tabActive]}>
            <Text style={[styles.tabLabel, selectedTab === tab && styles.tabLabelActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {grouped.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-outline" size={46} color={`${COLORS.muted}80`} />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptySubtitle}>Tu es à jour ! Les nouvelles notifications apparaîtront ici.</Text>
          </View>
        ) : grouped.map((group) => (
          <View key={group.title} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.groupCount}><Text style={styles.groupCountLabel}>{group.items.length}</Text></View>
            </View>
            {group.items.map((item) => <NotificationCard key={item.id} item={item} onRead={() => markRead(item.id)} onMenu={() => setMenuId(item.id)} />)}
          </View>
        ))}
      </ScrollView>

      <Modal visible={menuId !== null} transparent animationType="fade" onRequestClose={() => setMenuId(null)}>
        <View style={styles.menuRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer le menu" onPress={() => setMenuId(null)} style={styles.scrim} />
          <View style={styles.menuSheet}>
            <Pressable onPress={() => { if (menuId) markRead(menuId); setMenuId(null); }} style={styles.menuOption}>
              <MaterialCommunityIcons name="check" size={20} color={COLORS.text} />
              <Text style={styles.menuLabel}>Marquer comme lu</Text>
            </Pressable>
            <Pressable onPress={() => { if (menuId) removeNotification(menuId); setMenuId(null); }} style={styles.menuOption}>
              <MaterialCommunityIcons name="delete-outline" size={20} color="#E53935" />
              <Text style={[styles.menuLabel, styles.deleteLabel]}>Supprimer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NotificationCard({ item, onRead, onMenu }: { item: NotificationItem; onRead: () => void; onMenu: () => void }) {
  const style = TYPE_STYLE[item.type];
  return (
    <View style={[styles.notificationCard, item.isRead && styles.notificationRead]}>
      {!item.isRead && <View style={[styles.unreadStripe, { backgroundColor: style.color }]} />}
      <Pressable onPress={onRead} style={styles.notificationMain}>
        <View style={[styles.notificationIcon, { backgroundColor: `${style.color}1F` }]}>
          <MaterialCommunityIcons name={style.icon as any} size={22} color={style.color} />
        </View>
        <View style={styles.notificationCopy}>
          <View style={styles.notificationHeading}>
            <Text numberOfLines={1} style={[styles.notificationTitle, item.isRead && styles.notificationTitleRead]}>{item.title}</Text>
            {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: style.color }]} />}
          </View>
          <Text numberOfLines={2} style={styles.notificationMessage}>{item.message}</Text>
          <View style={styles.notificationMeta}>
            <View style={[styles.typeBadge, { backgroundColor: `${style.color}1F` }]}><Text style={[styles.typeLabel, { color: style.color }]}>{style.label}</Text></View>
            <Text style={styles.dateLabel}>{item.date}</Text>
          </View>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Options ${item.title}`} onPress={onMenu} style={styles.menuButton}>
        <MaterialCommunityIcons name="dots-vertical" size={17} color={COLORS.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: COLORS.navy, fontSize: 18, fontWeight: '700' },
  markAllButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  tabs: { minHeight: 46, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#0000000D', backgroundColor: COLORS.surface },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.gold },
  tabLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '500' },
  tabLabelActive: { color: COLORS.navy, fontWeight: '700' },
  content: { gap: 9, paddingTop: 8, paddingBottom: 30 },
  group: { gap: 7 },
  groupHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16 },
  groupTitle: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  groupCount: { minWidth: 21, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 9, backgroundColor: '#0A1F4414' },
  groupCountLabel: { color: COLORS.navy, fontSize: 10, fontWeight: '700' },
  notificationCard: { minHeight: 86, flexDirection: 'row', alignItems: 'stretch', marginHorizontal: 12, paddingHorizontal: 11, paddingVertical: 11, borderRadius: 13, backgroundColor: COLORS.surface },
  notificationRead: { opacity: 0.76 },
  unreadStripe: { width: 3, alignSelf: 'center', marginRight: 9, borderRadius: 2 },
  notificationMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  notificationIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  notificationCopy: { flex: 1, gap: 4 },
  notificationHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notificationTitle: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '700' },
  notificationTitleRead: { fontWeight: '500' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notificationMessage: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  notificationMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  typeLabel: { fontSize: 9, fontWeight: '700' },
  dateLabel: { color: COLORS.muted, fontSize: 10 },
  menuButton: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 72, paddingHorizontal: 28 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptySubtitle: { color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  menuRoot: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#00000055' },
  menuSheet: { padding: 10, borderRadius: 14, backgroundColor: COLORS.surface },
  menuOption: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  menuLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  deleteLabel: { color: '#E53935' },
});
