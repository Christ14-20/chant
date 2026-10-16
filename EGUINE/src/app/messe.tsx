import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';
import { useAppStore } from '@/store/useAppStore';
import type { Categorie, MomentMesse } from '@/types';

const COLORS = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  panel: '#FFFFFF',
  card: '#FFFFFF',
  gold: '#D4AF37',
  goldSoft: '#F5E7B0',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  danger: '#F87171',
  success: '#34D399',
  purple: '#A78BFA',
};

const MASS_PARTS: {
  id: string;
  moment: MomentMesse;
  category: Categorie;
  title: string;
  subtitle: string;
}[] = [
  { id: 'entree', moment: 'entree', category: 'entree', title: "1. Chant d'Entrée", subtitle: 'Ouverture & procession' },
  { id: 'kyrie', moment: 'liturgie_parole', category: 'kyrie', title: '2. Kyrie', subtitle: 'Prière pénitentielle' },
  { id: 'gloria', moment: 'liturgie_parole', category: 'gloria', title: '3. Gloria', subtitle: 'Louange et gloire' },
  { id: 'psaume', moment: 'liturgie_parole', category: 'psaume', title: '4. Psaume', subtitle: 'Parole de Dieu' },
  { id: 'acclamation', moment: 'liturgie_parole', category: 'acclamation', title: '5. Alléluia', subtitle: 'Accueil de l’Évangile' },
  { id: 'offertoire', moment: 'liturgie_eucharistique', category: 'offertoire', title: '6. Offertoire', subtitle: 'Présentation des dons' },
  { id: 'sanctus', moment: 'liturgie_eucharistique', category: 'sanctus', title: '7. Sanctus', subtitle: 'Adoration eucharistique' },
  { id: 'agnus_dei', moment: 'liturgie_eucharistique', category: 'agnus_dei', title: '8. Agnus Dei', subtitle: 'Fraction du pain' },
  { id: 'communion', moment: 'communion', category: 'communion', title: '9. Communion', subtitle: 'Partage eucharistique' },
  { id: 'action_grace', moment: 'communion', category: 'action_grace', title: '10. Action de grâce', subtitle: 'Remerciement' },
  { id: 'chant_final', moment: 'envoi', category: 'chant_final', title: '11. Envoi', subtitle: 'Mission et sortie' },
];

export default function MesseScreen() {
  const router = useRouter();
  const chants = useAppStore((state) => state.chants);
  const celebration = useAppStore((state) => state.celebrations[0]);
  const addChantToCelebration = useAppStore((state) => state.addChantToCelebration);
  const removeChantFromCelebration = useAppStore((state) => state.removeChantFromCelebration);
  const resetCelebration = useAppStore((state) => state.resetCelebration);
  const playChant = useAppStore((state) => state.playChant);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const totalSelectedSongs = Object.values(celebration?.selectedChants ?? {}).reduce(
    (total, selectedIds) => total + (selectedIds?.length ?? 0),
    0
  );

  const activeSlot = MASS_PARTS.find((slot) => slot.id === activeSlotId);

  const pickerChants = useMemo(() => {
    if (!activeSlot) return [];
    const term = pickerQuery.trim().toLocaleLowerCase();
    return chants.filter((chant) => {
      if (term) {
        return [chant.titre, chant.paroles, chant.auteur, chant.compositeur, chant.id]
          .some((value) => value?.toLocaleLowerCase().includes(term));
      }
      return chant.categorie === activeSlot.category || chant.categorie === 'louange';
    });
  }, [activeSlot, chants, pickerQuery]);

  const openPicker = (slotId: string) => {
    setPickerQuery('');
    setActiveSlotId(slotId);
  };

  const shareProgram = async () => {
    if (!celebration) return;
    const lines = [`📜 Programme de Messe — ${celebration.title}`];
    MASS_PARTS.forEach((slot) => {
      const ids = celebration.selectedChants[slot.moment] ?? [];
      const selected = ids.map((id) => chants.find((chant) => chant.id === id)).filter((chant) => chant !== undefined);
      if (selected.length > 0) {
        lines.push(`\n${slot.title} :`, ...selected.map((chant) => ` • ${chant.titre} (${chant.langue.toUpperCase()})`));
      }
    });
    await Share.share({ message: lines.join('\n'), title: 'Partager le programme de messe' });
  };

  const playProgram = () => {
    const firstId = Object.values(celebration?.selectedChants ?? {}).flat()[0];
    if (firstId) playChant(firstId);
  };

  const selectChant = (slot: (typeof MASS_PARTS)[number], chantId: string) => {
    const selectedIds = celebration?.selectedChants[slot.moment] ?? [];
    if (!selectedIds.includes(chantId) && celebration) {
      addChantToCelebration(celebration.id, slot.moment, chantId);
    }
    setActiveSlotId(null);
  };

  const selectedSummary = totalSelectedSongs > 0 ? `${totalSelectedSongs} chants prêts` : 'Aucun chant choisi';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={21} color={COLORS.text} />
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={styles.topTitle}>Messe</Text>
          <Text style={styles.topSubtitle}>{selectedSummary}</Text>
        </View>
        {totalSelectedSongs > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Partager le programme" onPress={shareProgram} style={styles.shareButton}>
            <MaterialCommunityIcons name="share-variant-outline" size={18} color={COLORS.gold} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryBar}>
          <Text style={styles.summaryLabel}>Programme liturgique</Text>
          <Text style={styles.summaryTitle}>{celebration?.title ?? 'Messe du dimanche'}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryMeta}>{totalSelectedSongs} chants</Text>
            {totalSelectedSongs > 0 && (
              <Pressable accessibilityRole="button" onPress={playProgram} style={styles.inlinePlayButton}>
                <MaterialCommunityIcons name="play" size={14} color={COLORS.background} />
                <Text style={styles.inlinePlayLabel}>Écouter</Text>
              </Pressable>
            )}
          </View>
        </View>

        {MASS_PARTS.map((slot, index) => {
          const selectedIds = celebration?.selectedChants[slot.moment] ?? [];
          const selectedChants = selectedIds.map((id) => chants.find((chant) => chant.id === id)).filter((chant) => chant !== undefined);

          return (
            <View key={slot.id} style={styles.slotRow}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotNumber}>{index + 1}</Text>
                <View style={styles.slotMeta}>
                  <Text style={styles.slotTitle}>{slot.title}</Text>
                  <Text style={styles.slotSubtitle}>{slot.subtitle}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => openPicker(slot.id)} style={styles.slotButton}>
                  <Text style={styles.slotButtonText}>{selectedChants.length > 0 ? 'Modifier' : 'Ajouter'}</Text>
                </Pressable>
              </View>

              {selectedChants.length === 0 ? (
                <Pressable accessibilityRole="button" onPress={() => openPicker(slot.id)} style={styles.emptyLine}>
                  <MaterialCommunityIcons name="plus" size={16} color={COLORS.gold} />
                  <Text style={styles.emptyLineLabel}>Choisir un chant pour ce moment</Text>
                </Pressable>
              ) : (
                <View style={styles.songList}>
                  {selectedChants.map((chant) => (
                    <View key={`${slot.id}-${chant.id}`} style={styles.songItem}>
                      <Pressable accessibilityRole="button" onPress={() => router.push(`/chant/${chant.id}`)} style={styles.songInfo}>
                        <Text numberOfLines={1} style={styles.songTitle}>{chant.titre}</Text>
                        <Text numberOfLines={1} style={styles.songMeta}>{chant.langue.toUpperCase()} · {chant.auteur || 'Chorale'}</Text>
                      </Pressable>

                      <View style={styles.inlineActions}>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Écouter ${chant.titre}`} onPress={() => playChant(chant.id)} style={styles.smallIconButton}>
                          <MaterialCommunityIcons name="play" size={15} color={COLORS.gold} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Supprimer ${chant.titre}`}
                          onPress={() => celebration && removeChantFromCelebration(celebration.id, slot.moment, chant.id)}
                          style={styles.smallIconButton}
                        >
                          <MaterialCommunityIcons name="delete-outline" size={15} color={COLORS.danger} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {totalSelectedSongs > 0 && (
          <Pressable accessibilityRole="button" onPress={() => celebration && resetCelebration(celebration.id)} style={styles.resetButton}>
            <Text style={styles.resetButtonLabel}>Réinitialiser le programme</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={activeSlot !== undefined} transparent animationType="slide" onRequestClose={() => setActiveSlotId(null)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer la sélection" onPress={() => setActiveSlotId(null)} style={styles.modalScrim} />
          <View style={styles.pickerSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeadingCopy}>
                <Text style={styles.sheetTitle}>Choisir pour {activeSlot?.title}</Text>
                <Text style={styles.sheetSubtitle}>Suggestions du répertoire liturgique</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setActiveSlotId(null)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={22} color={COLORS.text} />
              </Pressable>
            </View>

            <View style={styles.pickerSearch}>
              <MaterialCommunityIcons name="magnify" size={18} color={COLORS.gold} />
              <TextInput
                accessibilityLabel="Rechercher dans les chants"
                onChangeText={setPickerQuery}
                placeholder="Titre, paroles, compositeur…"
                placeholderTextColor={COLORS.muted}
                style={styles.pickerInput}
                value={pickerQuery}
              />
            </View>

            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {pickerChants.length === 0 ? (
                <View style={styles.pickerEmpty}>
                  <Text style={styles.pickerEmptyText}>Aucun chant trouvé pour ce moment.</Text>
                </View>
              ) : (
                pickerChants.map((chant) => {
                  const selected = activeSlot !== undefined && (celebration?.selectedChants[activeSlot.moment] ?? []).includes(chant.id);
                  return (
                    <Pressable key={chant.id} onPress={() => activeSlot && selectChant(activeSlot, chant.id)} style={styles.pickerRow}>
                      <View style={styles.pickerChantCopy}>
                        <Text numberOfLines={1} style={styles.pickerChantTitle}>{chant.titre}</Text>
                        <Text numberOfLines={1} style={styles.pickerChantMeta}>{chant.auteur || 'Chorale'} · {chant.langue.toUpperCase()} · {chant.categorie.replace('_', ' ')}</Text>
                      </View>
                      {selected ? <Text style={styles.selectedLabel}>Choisi</Text> : <MaterialCommunityIcons name="plus" size={18} color={COLORS.gold} />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backButton: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  topCopy: { flex: 1 },
  topTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  topSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  shareButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F4C95D1A' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36 },
  summaryBar: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  summaryLabel: { color: COLORS.gold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 5 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  summaryMeta: { color: COLORS.muted, fontSize: 12 },
  inlinePlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.gold,
    borderRadius: 10,
  },
  inlinePlayLabel: { color: COLORS.background, fontSize: 12, fontWeight: '800' },
  slotRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotNumber: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#F4C95D20', color: COLORS.gold, fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 24 },
  slotMeta: { flex: 1 },
  slotTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  slotSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  slotButton: {
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F4C95D14',
    borderWidth: 1,
    borderColor: '#F4C95D44',
  },
  slotButtonText: { color: COLORS.gold, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  emptyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#F4C95D55',
    backgroundColor: '#F4C95D08',
  },
  emptyLineLabel: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },
  songList: { gap: 8, marginTop: 10 },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  songInfo: { flex: 1, gap: 2 },
  songTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  songMeta: { color: COLORS.muted, fontSize: 11 },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallIconButton: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4C95D14' },
  resetButton: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  resetButtonLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: '#00000075' },
  pickerSheet: {
    maxHeight: '85%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHandle: { width: 42, height: 4, borderRadius: 3, backgroundColor: '#FFFFFF55', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetHeadingCopy: { flex: 1, gap: 3 },
  sheetTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  sheetSubtitle: { color: COLORS.muted, fontSize: 11 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginTop: 14,
  },
  pickerInput: { flex: 1, minHeight: 42, color: COLORS.text, fontSize: 13 },
  pickerList: { marginTop: 10 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  pickerChantCopy: { flex: 1, gap: 3 },
  pickerChantTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  pickerChantMeta: { color: COLORS.muted, fontSize: 11 },
  selectedLabel: { color: COLORS.gold, fontSize: 11, fontWeight: '700' },
  pickerEmpty: { alignItems: 'center', paddingVertical: 28 },
  pickerEmptyText: { color: COLORS.muted, fontSize: 13 },
});