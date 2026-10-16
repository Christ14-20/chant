import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';

const FAQ = [
  {
    question: 'Comment ajouter un chant en favori ?',
    answer: 'Appuyez sur l’icône en forme de cœur sur la fiche ou la carte du chant.',
  },
  {
    question: 'Comment proposer un nouveau chant ?',
    answer: 'Ouvrez votre profil et accédez à vos contributions pour proposer un chant.',
  },
  {
    question: 'L’application fonctionne-t-elle hors ligne ?',
    answer: 'Oui. Les chants téléchargés restent disponibles même sans connexion.',
  },
];

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  navy: '#0A1F44',
  gold: '#D4AF37',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
};

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <SymbolView name="chevron.left" size={18} tintColor={COLORS.navy} />
        </Pressable>
        <Text style={styles.topTitle}>Aide & FAQ</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {FAQ.map((item) => (
          <View key={item.question} style={styles.faqItem}>
            <Text style={styles.question}>{item.question}</Text>
            <Text style={styles.answer}>{item.answer}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  content: { gap: 14, padding: 16 },
  faqItem: { gap: 8, padding: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface },
  question: { color: COLORS.gold, fontSize: 14, fontWeight: '700' },
  answer: { color: COLORS.text, fontSize: 13, lineHeight: 20 },
});