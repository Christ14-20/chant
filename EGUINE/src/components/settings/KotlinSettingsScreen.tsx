import { createThemedStyles } from '@/utils/themed-styles';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/use-theme';
import { useFontSize } from '@/hooks/use-font-size';
import { goBackSafely } from '@/utils/navigation';
import type { Langue } from '@/types';

const ACCENT = '#7A1F3D';
const NAVY = '#0A1F44';

const GROUPS = [
  {
    title: 'PRÉFÉRENCES',
    rows: [
      { icon: 'theme-light-dark', color: NAVY, title: 'Apparence', subtitle: 'Thème, taille du texte' },
      { icon: 'bell-outline', color: NAVY, title: 'Notifications', subtitle: 'Alertes dans l’application' },
      { icon: 'translate', color: ACCENT, title: 'Langue des chants', subtitle: 'Mettre une langue en avant dans le catalogue' },
    ],
  },
  {
    title: 'DONNÉES ET SÉCURITÉ',
    rows: [
      { icon: 'cloud-off-outline', color: NAVY, title: 'Données et stockage', subtitle: 'Catalogue local et disponibilité hors ligne' },
      { icon: 'lock-outline', color: ACCENT, title: 'Confidentialité', subtitle: 'Stockage local et protections disponibles' },
    ],
  },
  {
    title: 'SUPPORT',
    rows: [
      { icon: 'help-circle-outline', color: NAVY, title: "Centre d'aide", subtitle: 'FAQ et tutoriels', route: '/aide' as const },
      { icon: 'information-outline', color: ACCENT, title: 'À propos', subtitle: 'Version et informations sur eGuine' },
    ],
  },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Clair', description: 'Fond blanc et contraste standard' },
  { value: 'dark', label: 'Sombre', description: 'Fond bleu nuit et texte clair' },
  { value: 'system', label: 'Système', description: 'Suit le réglage de votre appareil' },
] as const;

const FONT_OPTIONS = [
  { value: 'small', label: 'Petit' },
  { value: 'medium', label: 'Standard' },
  { value: 'large', label: 'Grand' },
  { value: 'xlarge', label: 'Très grand' },
] as const;

const LANGUAGE_OPTIONS: { value: Langue; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'soussou', label: 'Soussou' },
  { value: 'poular', label: 'Poular' },
  { value: 'malinke', label: 'Malinké' },
  { value: 'kissi', label: 'Kissi' },
  { value: 'guerze', label: 'Guerzé' },
  { value: 'toma', label: 'Toma' },
  { value: 'kpele', label: 'Kpelé' },
  { value: 'baga', label: 'Baga' },
  { value: 'loma', label: 'Loma' },
  { value: 'mano', label: 'Mano' },
  { value: 'kono', label: 'Kono' },
  { value: 'en', label: 'Anglais' },
];

type SettingsPanel = 'appearance' | 'notifications' | 'language' | 'storage' | 'privacy' | 'about' | 'account' | null;

export default function KotlinSettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { fs, scale } = useFontSize();
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const fontSize = useAppStore((state) => state.fontSize);
  const setFontSize = useAppStore((state) => state.setFontSize);
  const languagePref = useAppStore((state) => state.languagePref);
  const setLanguagePref = useAppStore((state) => state.setLanguagePref);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);
  const chants = useAppStore((state) => state.chants);
  const prieres = useAppStore((state) => state.prieres);
  const [panel, setPanel] = useState<SettingsPanel>(null);
  const openRow = (title: string) => {
    switch (title) {
      case 'Apparence': setPanel('appearance'); break;
      case 'Notifications': setPanel('notifications'); break;
      case 'Langue des chants': setPanel('language'); break;
      case 'Données et stockage': setPanel('storage'); break;
      case 'Confidentialité': setPanel('privacy'); break;
      case 'À propos': setPanel('about'); break;
      default: break;
    }
  };

  const panelTitle = {
    appearance: 'Apparence',
    notifications: 'Notifications',
    language: 'Langue des chants',
    storage: 'Données et stockage',
    privacy: 'Confidentialité',
    about: 'À propos',
    account: 'Suppression du compte',
  }[panel ?? 'appearance'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: theme.text, fontSize: fs(18) }]}>Réglages</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.textSecondary, fontSize: fs(11) }]}>{group.title}</Text>
            {group.rows.map((row) => (
              <SettingsRow
                key={row.title}
                {...row}
                theme={theme}
                fontScale={scale}
                onPress={'route' in row && row.route ? () => router.push(row.route) : () => openRow(row.title)}
              />
            ))}
          </View>
        ))}

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: theme.textSecondary, fontSize: fs(11) }]}>ZONE SENSIBLE</Text>
          <SettingsRow
            icon="delete-forever-outline"
            color={ACCENT}
            title="Supprimer mon compte"
            subtitle="Service de compte non configuré"
            danger
            theme={theme}
            fontScale={scale}
            onPress={() => setPanel('account')}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerIcon}><MaterialCommunityIcons name="music-note" size={20} color={ACCENT} /></View>
          <Text style={[styles.footerTitle, { color: theme.text, fontSize: fs(15) }]}>eGuine</Text>
          <Text style={[styles.footerMeta, { color: theme.textSecondary, fontSize: fs(11) }]}>Chants liturgiques de Guinée · Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </ScrollView>

      <Modal visible={panel !== null} transparent animationType="fade" onRequestClose={() => setPanel(null)}>
        <View style={styles.dialogRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setPanel(null)} style={styles.scrim} />
          <View style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text, fontSize: fs(18) }]}>{panelTitle}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setPanel(null)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={21} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              {panel === 'appearance' && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>THÈME</Text>
                  {THEME_OPTIONS.map((option) => (
                    <ChoiceRow
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      selected={themeMode === option.value}
                      theme={theme}
                      onPress={() => setThemeMode(option.value)}
                    />
                  ))}
                  <Text style={[styles.sectionLabel, styles.spacedLabel, { color: theme.textSecondary }]}>TAILLE DES PAROLES</Text>
                  <Text style={[styles.helper, { color: theme.textSecondary }]}>Cette taille s’applique aux paroles des chants et reste synchronisée avec les boutons A− / A+.</Text>
                  <View style={styles.optionGrid}>
                    {FONT_OPTIONS.map((option) => (
                      <ChoiceRow
                        key={option.value}
                        label={option.label}
                        selected={fontSize === option.value}
                        theme={theme}
                        onPress={() => setFontSize(option.value)}
                      />
                    ))}
                  </View>
                  <Text style={[styles.preview, { color: theme.text, fontSize: fs(18) }]}>Exemple de texte des paroles</Text>
                </>
              )}

              {panel === 'notifications' && (
                <View style={styles.toggleRow}>
                  <View style={styles.toggleCopy}>
                    <Text style={[styles.optionLabel, { color: theme.text }]}>Alertes dans l’application</Text>
                    <Text style={[styles.helper, { color: theme.textSecondary }]}>Masque ou affiche les alertes de démonstration dans l’écran Notifications et l’indicateur de l’accueil. Les notifications système/push ne sont pas configurées.</Text>
                  </View>
                  <Switch
                    accessibilityLabel="Activer les notifications dans l’application"
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: theme.border, true: ACCENT }}
                  />
                </View>
              )}

              {panel === 'language' && (
                <>
                  <Text style={[styles.helper, { color: theme.textSecondary }]}>La langue choisie est enregistrée sur cet appareil et ses chants sont présentés en premier dans le catalogue. La langue de l’interface reste le français.</Text>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <ChoiceRow
                      key={option.value}
                      label={option.label}
                      selected={languagePref === option.value}
                      theme={theme}
                      onPress={() => setLanguagePref(option.value)}
                    />
                  ))}
                </>
              )}

              {panel === 'storage' && (
                <InfoPanel
                  theme={theme}
                  icon="cloud-check-outline"
                  title="Catalogue disponible hors ligne"
                  message={`Le catalogue fourni avec l’application contient ${chants.length} chants et ${prieres.length} prières. Ces données sont embarquées localement. Aucun téléchargement audio distant ni cache réseau n’est configuré dans cette version.`}
                />
              )}

              {panel === 'privacy' && (
                <InfoPanel
                  theme={theme}
                  icon="shield-lock-outline"
                  title="Données de cette installation"
                  message="Les préférences de cette page sont conservées localement sur cet appareil. Aucun service de compte, de synchronisation ou de verrouillage biométrique n’est configuré dans le projet. La gestion des données côté serveur n’a pas été modifiée."
                />
              )}

              {panel === 'about' && (
                <InfoPanel
                  theme={theme}
                  icon="music-note"
                  title="eGuine"
                  message={`Chants liturgiques de Guinée\nVersion ${Constants.expoConfig?.version ?? '1.0.0'}\n\nLe catalogue et les préférences locales sont accessibles sans connexion.`}
                />
              )}

              {panel === 'account' && (
                <InfoPanel
                  theme={theme}
                  icon="cloud-alert-outline"
                  title="Action non disponible"
                  message="La suppression d’un compte doit être réalisée par le service de compte côté serveur. Aucun backend de compte n’est configuré ; aucune suppression ni modification serveur ne sera tentée."
                />
              )}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setPanel(null)} style={styles.doneButton}>
              <Text style={styles.doneLabel}>Terminé</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon, color, title, subtitle, danger, onPress, theme, fontScale,
}: {
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  fontScale: number;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.itemRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.itemIcon, { backgroundColor: `${color}20` }]}><MaterialCommunityIcons name={icon as any} size={21} color={color} /></View>
      <View style={styles.itemCopy}>
        <Text style={[styles.itemTitle, { color: danger ? ACCENT : theme.text, fontSize: Math.round(14 * fontScale) }]}>{title}</Text>
        <Text numberOfLines={2} style={[styles.itemSubtitle, { color: theme.textSecondary, fontSize: Math.round(12 * fontScale) }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

function ChoiceRow({
  label, description, selected, theme, onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choiceRow, { borderColor: selected ? ACCENT : theme.border, backgroundColor: selected ? `${ACCENT}12` : 'transparent' }]}
    >
      <View style={styles.choiceCopy}>
        <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
        {description && <Text style={[styles.helper, { color: theme.textSecondary }]}>{description}</Text>}
      </View>
      <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={21} color={selected ? ACCENT : theme.textSecondary} />
    </Pressable>
  );
}

function InfoPanel({
  icon, title, message, theme,
}: {
  icon: string;
  title: string;
  message: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.infoPanel}>
      <View style={styles.infoIcon}><MaterialCommunityIcons name={icon as any} size={28} color={ACCENT} /></View>
      <Text style={[styles.infoTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.infoMessage, { color: theme.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: NAVY, fontSize: 18, fontWeight: '700' },
  content: { paddingBottom: 30 },
  group: { marginTop: 8 },
  groupTitle: { marginLeft: 16, marginTop: 14, marginBottom: 3, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  itemRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  itemIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  itemCopy: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemSubtitle: { fontSize: 12 },
  footer: { alignItems: 'center', gap: 5, marginTop: 28, paddingVertical: 18 },
  footerIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: `${ACCENT}1A` },
  footerTitle: { fontSize: 15, fontWeight: '700' },
  footerMeta: { fontSize: 11, textAlign: 'center' },
  dialogRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#00000099' },
  sheet: { width: '100%', maxWidth: 440, maxHeight: '88%', borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, overflow: 'hidden' },
  sheetHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0A1F4430' },
  sheetTitle: { fontWeight: '700' },
  closeButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  sheetContent: { gap: 8, padding: 16, paddingBottom: 20 },
  sectionLabel: { marginTop: 4, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  spacedLabel: { marginTop: 14 },
  helper: { fontSize: 12, lineHeight: 18 },
  choiceRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderRadius: 10 },
  choiceCopy: { flex: 1, gap: 3 },
  optionGrid: { gap: 7 },
  optionLabel: { fontSize: 14, fontWeight: '600' },
  preview: { marginTop: 6, textAlign: 'center', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  toggleCopy: { flex: 1, gap: 8 },
  infoPanel: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  infoIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: `${ACCENT}1A` },
  infoTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  infoMessage: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  doneButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', margin: 14, borderRadius: 10, backgroundColor: ACCENT },
  doneLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
