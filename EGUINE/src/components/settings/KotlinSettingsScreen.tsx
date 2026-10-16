import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';

const COLORS = { background: '#FFFFFF', card: '#FFFFFF', gold: '#D4AF37', text: '#111827', muted: '#6B7280', border: '#E5E7EB', rose: '#D96A8E', green: '#2EAF6F', blue: '#3486D5', purple: '#8B5CF6', red: '#EF4444' };

const GROUPS = [
  {
    title: 'PRÉFÉRENCES',
    rows: [
      { icon: 'theme-light-dark', color: COLORS.purple, title: 'Apparence', subtitle: 'Thème, taille du texte' },
      { icon: 'bell-outline', color: COLORS.blue, title: 'Notifications', subtitle: 'Alertes, rappels' },
      { icon: 'translate', color: COLORS.green, title: 'Langue et région', subtitle: 'Préférences linguistiques' },
    ],
  },
  {
    title: 'DONNÉES ET SÉCURITÉ',
    rows: [
      { icon: 'cloud-off-outline', color: COLORS.blue, title: 'Données et stockage', subtitle: 'Mode hors-ligne, cache' },
      { icon: 'lock-outline', color: COLORS.rose, title: 'Confidentialité', subtitle: 'Verrouillage, données' },
    ],
  },
  {
    title: 'SUPPORT',
    rows: [
      { icon: 'help-circle-outline', color: COLORS.blue, title: "Centre d'aide", subtitle: 'FAQ et tutoriels', route: '/aide' as const },
      { icon: 'information-outline', color: COLORS.purple, title: 'À propos', subtitle: 'Version, mentions légales' },
    ],
  },
];

export default function KotlinSettingsScreen() {
  const router = useRouter();
  const [deleteVisible, setDeleteVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.topTitle}>Réglages</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.rows.map((row) => (
              <SettingsRow key={row.title} {...row} onPress={'route' in row && row.route ? () => router.push(row.route) : () => {}} />
            ))}
          </View>
        ))}

        <View style={styles.group}>
          <Text style={styles.groupTitle}>ZONE SENSIBLE</Text>
          <SettingsRow icon="delete-forever-outline" color={COLORS.red} title="Supprimer mon compte" subtitle="Action irréversible" danger onPress={() => setDeleteVisible(true)} />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerIcon}><MaterialCommunityIcons name="music-note" size={20} color={COLORS.gold} /></View>
          <Text style={styles.footerTitle}>eGuine</Text>
          <Text style={styles.footerMeta}>Chants liturgiques de Guinée · Version 1.2.0</Text>
        </View>
      </ScrollView>

      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <View style={styles.dialogRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setDeleteVisible(false)} style={styles.scrim} />
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}><MaterialCommunityIcons name="delete-forever-outline" size={27} color={COLORS.red} /></View>
            <Text style={styles.dialogTitle}>Supprimer mon compte ?</Text>
            <Text style={styles.dialogMessage}>Cette action est irréversible. Toutes vos données seront définitivement supprimées.</Text>
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setDeleteVisible(false)} style={styles.cancelButton}><Text style={styles.cancelLabel}>Annuler</Text></Pressable>
              <Pressable onPress={() => setDeleteVisible(false)} style={styles.deleteButton}><Text style={styles.deleteLabel}>Supprimer définitivement</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SettingsRow({ icon, color, title, subtitle, danger, onPress }: { icon: string; color: string; title: string; subtitle: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.itemRow}>
      <View style={[styles.itemIcon, { backgroundColor: `${color}20` }]}><MaterialCommunityIcons name={icon as any} size={21} color={color} /></View>
      <View style={styles.itemCopy}>
        <Text style={[styles.itemTitle, danger && { color }]}>{title}</Text>
        <Text numberOfLines={1} style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: COLORS.text, fontSize: 18, fontWeight: '700' },
  content: { paddingBottom: 30 },
  group: { marginTop: 8 },
  groupTitle: { marginLeft: 16, marginTop: 14, marginBottom: 3, color: COLORS.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  itemRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#33415580' },
  itemIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  itemCopy: { flex: 1, gap: 3 },
  itemTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  itemSubtitle: { color: COLORS.muted, fontSize: 12 },
  footer: { alignItems: 'center', gap: 5, marginTop: 28, paddingVertical: 18 },
  footerIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#D4AF371A' },
  footerTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  footerMeta: { color: COLORS.muted, fontSize: 11 },
  dialogRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#00000099' },
  dialog: { width: '100%', maxWidth: 380, alignItems: 'center', padding: 22, borderRadius: 16, backgroundColor: COLORS.card },
  dialogIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: '#EF444426' },
  dialogTitle: { marginTop: 14, color: COLORS.text, fontSize: 18, fontWeight: '700' },
  dialogMessage: { marginTop: 8, color: COLORS.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  dialogActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, alignSelf: 'stretch', marginTop: 18 },
  cancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12 },
  cancelLabel: { color: COLORS.muted, fontSize: 13 },
  deleteButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: COLORS.red },
  deleteLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
});
