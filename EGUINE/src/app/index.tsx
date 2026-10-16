import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import type { Langue } from '@/types';

const LANGUAGES: { code: Langue; name: string; flag: string; welcome: string }[] = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', welcome: "Bienvenue dans l'application de chant" },
  { code: 'en', name: 'English', flag: '🇬🇧', welcome: 'Welcome to the chant application' },
];

const COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  gold: '#D4AF37',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
};

export default function Index() {
  const router = useRouter();
  const languagePref = useAppStore((s) => s.languagePref);
  const setLanguagePref = useAppStore((s) => s.setLanguagePref);
  const [selectedCode, setSelectedCode] = useState<Langue>(languagePref);

  const selectLanguage = (code: Langue) => {
    setSelectedCode(code);
    setLanguagePref(code);
  };

  const continueToApp = () => {
    setLanguagePref(selectedCode);
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <SymbolView name="music.note" size={34} tintColor={COLORS.gold} />
            </View>
          </View>
          <View style={styles.brandCopy}>
            <View style={styles.brandEyebrow}>
              <Text style={styles.brandName}>Chorale eGuine</Text>
            </View>
            <Text style={styles.title}>Choisissez votre langue</Text>
            <Text style={styles.subtitle}>Choose your language</Text>
          </View>
        </View>

        <View style={styles.languageList}>
          {LANGUAGES.map((language) => {
            const selected = selectedCode === language.code;
            return (
              <Pressable
                key={language.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => selectLanguage(language.code)}
                style={({ pressed }) => [
                  styles.languageRow,
                  selected && styles.languageRowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.flag}>{language.flag}</Text>
                <Text style={styles.languageName}>{language.name}</Text>
                <View style={styles.languageSpacer} />
                {selected ? (
                  <View style={styles.selectedMark}>
                    <SymbolView name="checkmark" size={16} tintColor={COLORS.background} />
                  </View>
                ) : (
                  <View style={styles.unselectedMark} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={continueToApp}
          style={({ pressed }) => [styles.continueButton, pressed && styles.continuePressed]}
        >
          <Text style={styles.continueLabel}>
            {selectedCode === 'en' ? 'Continue' : 'Continuer'}
          </Text>
          <SymbolView name="arrow.right" size={18} tintColor={COLORS.background} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  brand: {
    alignItems: 'center',
    gap: 22,
  },
  logoOuter: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  logoInner: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.card,
  },
  brandCopy: {
    alignItems: 'center',
    gap: 6,
  },
  brandEyebrow: {
    marginBottom: 4,
  },
  brandName: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  languageList: {
    gap: 10,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  languageRowSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.18)',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  languageSpacer: {
    flex: 1,
  },
  selectedMark: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.gold,
  },
  unselectedMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  continueButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
  },
  continuePressed: {
    opacity: 0.8,
  },
  continueLabel: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
});
