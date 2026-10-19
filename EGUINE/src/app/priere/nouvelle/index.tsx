import { createThemedStyles } from '@/utils/themed-styles';
import { useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { goBackSafely } from '@/utils/navigation';

const CATEGORIES = [
  { key: 'matin', label: 'Matin', icon: 'sun.max.fill', color: '#7A1F3D' },
  { key: 'midi', label: 'Midi', icon: 'sun.min.fill', color: '#7A1F3D' },
  { key: 'soir', label: 'Soir', icon: 'moon.fill', color: '#0A1F44' },
  { key: 'mariale', label: 'Mariale', icon: 'star.fill', color: '#7A1F3D' },
  { key: 'intention', label: 'Intention', icon: 'heart.fill', color: '#7A1F3D' },
  { key: 'oraison', label: 'Oraison', icon: 'hands.sparkles', color: '#7A1F3D' },
  { key: 'autre', label: 'Autre', icon: 'ellipsis.circle', color: '#0A1F44' },
] as const;

const LANGUES = ['fr', 'la', 'es', 'soussou', 'poular', 'malinke', 'kissi', 'guerze', 'toma', 'en'] as const;

export default function NouvellePriereScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { pad, fs } = useResponsive();

  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [langue, setLangue] = useState('fr');
  const [categorie, setCategorie] = useState('matin');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!titre.trim()) { Alert.alert('Titre requis', 'Veuillez saisir un titre pour la prière'); return; }
    if (!contenu.trim()) { Alert.alert('Contenu requis', 'Veuillez saisir le contenu de la prière'); return; }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅ Prière ajoutée', `"${titre}" a été ajoutée avec succès`, [
      { text: 'OK', onPress: goBackSafely },
    ]);
    setIsSaving(false);
  }, [titre, contenu, router]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <ThemedView style={[styles.header, { paddingHorizontal: pad.h, paddingTop: pad.top }]}>
          <ThemedView style={styles.headerRow}>
            <Pressable onPress={goBackSafely} style={styles.backBtn}>
              <SymbolView name="xmark" size={18} tintColor="#0A1F44" />
            </Pressable>
            <ThemedText style={[styles.title, { fontSize: fs.xl }]}>Nouvelle prière</ThemedText>
            <Pressable
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <ThemedText style={[styles.saveBtnText, { fontSize: fs.md }]}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>

        <ThemedView style={[styles.form, { paddingHorizontal: pad.h }]}>
          {/* Titre */}
          <ThemedView style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontSize: fs.sm }]}>Titre *</ThemedText>
            <TextInput
              style={[styles.input, { fontSize: fs.md, backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
              value={titre}
              onChangeText={setTitre}
              placeholder="Titre de la prière"
              placeholderTextColor={theme.textSecondary}
              maxLength={100}
            />
          </ThemedView>

          {/* Catégorie */}
          <ThemedView style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontSize: fs.sm }]}>Catégorie</ThemedText>
            <ThemedView style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  style={[styles.catCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, categorie === cat.key && styles.catCardActive, categorie === cat.key && { borderColor: cat.color }]}
                  onPress={() => { setCategorie(cat.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <SymbolView name={cat.icon as any} size={20} tintColor={categorie === cat.key ? cat.color : '#0A1F44'} />
                  <ThemedText style={[styles.catLabel, { fontSize: fs.sm }, categorie === cat.key && { color: cat.color }]}>
                    {cat.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>

          {/* Langue */}
          <ThemedView style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontSize: fs.sm }]}>Langue</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <ThemedView style={styles.chips}>
                {LANGUES.map((l) => (
                  <Pressable
                    key={l}
                    style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, langue === l && styles.chipActive]}
                    onPress={() => { setLangue(l); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <ThemedText style={[styles.chipText, langue === l && styles.chipTextActive, { fontSize: fs.sm }]}>{l}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            </ScrollView>
          </ThemedView>

          {/* Contenu */}
          <ThemedView style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontSize: fs.sm }]}>Contenu *</ThemedText>
            <TextInput
              style={[styles.input, styles.inputMultiline, { fontSize: fs.md, backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
              value={contenu}
              onChangeText={setContenu}
              placeholder="Saisissez le texte de la prière..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.bottomPad} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = createThemedStyles({
  container: { flex: 1 },
  scroll: { flex: 1 },
  header: { paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 8, borderRadius: 20 },
  title: { fontWeight: '700' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0A1F44' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600' },
  form: { gap: 24 },
  field: { gap: 10 },
  fieldLabel: { fontWeight: '600', opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputMultiline: { minHeight: 200, paddingTop: 14 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  catCardActive: { backgroundColor: 'rgba(10,31,68,0.08)' },
  catLabel: { fontWeight: '500', opacity: 0.8 },
  chips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: 'rgba(10,31,68,0.15)', borderColor: '#0A1F44' },
  chipText: { opacity: 0.7, fontWeight: '500' },
  chipTextActive: { color: '#0A1F44', opacity: 1, fontWeight: '600' },
  bottomPad: { height: 80 },
});
