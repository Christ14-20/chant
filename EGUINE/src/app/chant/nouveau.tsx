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

const CATEGORIES = ['entree','kyrie','gloria','psaume','acclamation','offertoire','sanctus','agnus_dei','communion','action_grace','chant_final','louange','adoration','penitence','marial','funerailles','autre'] as const;
const LANGUES = ['fr','soussou','poular','malinke','kissi','guerze','toma','en'] as const;
const TONALITES = ['Do','Ré','Mi','Fa','Sol','La','Si','Do mineur','Ré mineur','Mi mineur','Fa mineur','Sol mineur','La mineur','Si mineur'] as const;

export default function NouveauChantScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { pad, fs } = useResponsive();

  const [titre, setTitre] = useState('');
  const [paroles, setParoles] = useState('');
  const [langue, setLangue] = useState<string>('fr');
  const [categorie, setCategorie] = useState<string>('louange');
  const [tonalite, setTonalite] = useState('');
  const [auteur, setAuteur] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!titre.trim()) { Alert.alert('Titre requis', 'Veuillez saisir un titre pour le chant'); return; }
    if (!paroles.trim()) { Alert.alert('Paroles requises', 'Veuillez saisir les paroles du chant'); return; }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅ Chant ajouté', `"${titre}" a été ajouté avec succès`, [
      { text: 'OK', onPress: goBackSafely },
    ]);
    setIsSaving(false);
  }, [titre, paroles, router]);

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <ThemedView style={styles.field}>
      <ThemedText style={[styles.fieldLabel, { fontSize: fs.sm }]}>{label}</ThemedText>
      {children}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <ThemedView style={[styles.header, { paddingHorizontal: pad.h, paddingTop: pad.top }]}>
          <ThemedView style={styles.headerRow}>
            <Pressable onPress={goBackSafely} style={styles.backBtn}>
              <SymbolView name="xmark" size={18} tintColor="#8E8E93" />
            </Pressable>
            <ThemedText style={[styles.title, { fontSize: fs.xl }]}>Nouveau chant</ThemedText>
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
          <Field label="Titre *">
            <TextInput
              style={[styles.input, { fontSize: fs.md, backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
              value={titre}
              onChangeText={setTitre}
              placeholder="Titre du chant"
              placeholderTextColor={theme.textSecondary}
              maxLength={100}
            />
          </Field>

          <Field label="Paroles *">
            <TextInput
              style={[styles.input, styles.inputMultiline, { fontSize: fs.md, backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
              value={paroles}
              onChangeText={setParoles}
              placeholder="Saisissez les paroles..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </Field>

          <Field label="Langue">
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
          </Field>

          <Field label="Catégorie">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <ThemedView style={styles.chips}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, categorie === c && styles.chipActive]}
                    onPress={() => { setCategorie(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <ThemedText style={[styles.chipText, categorie === c && styles.chipTextActive, { fontSize: fs.sm }]}>
                      {c.replace('_', ' ')}
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            </ScrollView>
          </Field>

          <Field label="Tonalité">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <ThemedView style={styles.chips}>
                {TONALITES.map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, tonalite === t && styles.chipActive]}
                    onPress={() => { setTonalite(tonalite === t ? '' : t); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <ThemedText style={[styles.chipText, tonalite === t && styles.chipTextActive, { fontSize: fs.sm }]}>{t}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            </ScrollView>
          </Field>

          <Field label="Auteur / Compositeur">
            <TextInput
              style={[styles.input, { fontSize: fs.md, backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
              value={auteur}
              onChangeText={setAuteur}
              placeholder="Nom de l'auteur (optionnel)"
              placeholderTextColor={theme.textSecondary}
              maxLength={80}
            />
          </Field>
        </ThemedView>

        <ThemedView style={styles.bottomPad} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  header: { paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 8, borderRadius: 20 },
  title: { fontWeight: '700' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#208AEF' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFF', fontWeight: '600' },
  form: { gap: 20 },
  field: { gap: 8 },
  fieldLabel: { fontWeight: '600', opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputMultiline: { minHeight: 160, paddingTop: 14 },
  chips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: 'rgba(32,138,239,0.15)', borderColor: '#208AEF' },
  chipText: { opacity: 0.7, fontWeight: '500', textTransform: 'capitalize' },
  chipTextActive: { color: '#208AEF', opacity: 1, fontWeight: '600' },
  bottomPad: { height: 80 },
});
