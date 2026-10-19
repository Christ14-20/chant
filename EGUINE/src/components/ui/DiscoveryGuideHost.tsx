import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocalizedText as Text } from '@/i18n/localized-components';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/i18n/use-translation';
import { getDiscoveryGuide, getDiscoveryGuideById, WELCOME_STEPS } from '@/utils/discovery-guides';

type DiscoveryGuideHostProps = {
  ready: boolean;
};

export function DiscoveryGuideHost({ ready }: DiscoveryGuideHostProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation();
  const hasSeenWelcome = useAppStore((state) => state.hasSeenWelcome);
  const discoveredScreens = useAppStore((state) => state.discoveredScreens);
  const currentChantId = useAppStore((state) => state.currentChantId);
  const completeWelcome = useAppStore((state) => state.completeWelcome);
  const markDiscoveryScreenSeen = useAppStore((state) => state.markDiscoveryScreenSeen);
  const [welcomeStep, setWelcomeStep] = useState<number | null>(null);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const suppressRouteGuide = useRef<string | null>(null);
  const getCurrentGuide = () => {
    if (currentChantId && !discoveredScreens.includes('miniPlayer')) {
      return getDiscoveryGuideById('miniPlayer');
    }
    return getDiscoveryGuide(pathname);
  };

  useLayoutEffect(() => {
    if (!ready) return;
    if (!hasSeenWelcome) {
      setWelcomeStep(0);
      setActiveGuideId(null);
      return;
    }
    setWelcomeStep(null);
    const guide = getCurrentGuide();
    if (guide && suppressRouteGuide.current === guide.id) {
      suppressRouteGuide.current = null;
      setActiveGuideId(null);
      return;
    }
    setActiveGuideId(guide && !discoveredScreens.includes(guide.id) ? guide.id : null);
  }, [currentChantId, discoveredScreens, hasSeenWelcome, pathname, ready]);

  const finishWelcome = () => {
    const currentGuide = getCurrentGuide();
    suppressRouteGuide.current = currentGuide?.id ?? null;
    completeWelcome();
    markDiscoveryScreenSeen('home');
    setWelcomeStep(null);
  };

  const finishGuide = () => {
    if (activeGuideId) markDiscoveryScreenSeen(activeGuideId);
    setActiveGuideId(null);
  };

  if (!ready || (welcomeStep === null && activeGuideId === null)) return null;

  const isWelcome = welcomeStep !== null;
  const welcome = isWelcome ? WELCOME_STEPS[welcomeStep] : undefined;
  const guide = isWelcome || !activeGuideId ? undefined : getDiscoveryGuideById(activeGuideId);
  const content = welcome ?? guide;
  if (!content) return null;

  const stepNumber = isWelcome ? welcomeStep + 1 : 1;
  const stepTotal = isWelcome ? WELCOME_STEPS.length : 1;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[styles.scrim, { backgroundColor: theme.background === '#FFFFFF' ? '#0000001F' : '#0000004D' }]} />
      <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View
          accessibilityRole="summary"
          style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <View style={styles.heading}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}18` }]}>
              <MaterialCommunityIcons name={content.icon} size={25} color={theme.primary} />
            </View>
            <View style={styles.headingCopy}>
              <Text style={[styles.step, { color: theme.textSecondary }]}>
                {t('Étape {{current}} sur {{total}}', { current: stepNumber, total: stepTotal })}
              </Text>
              <Text style={[styles.title, { color: theme.text }]}>{t(content.title)}</Text>
            </View>
          </View>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{t(content.description)}</Text>
          {isWelcome && (
            <View accessibilityLabel={t('Progression de la présentation')} style={styles.progress}>
              {WELCOME_STEPS.map((step, index) => (
                <View
                  key={step.id}
                  style={[
                    styles.progressDot,
                    { backgroundColor: index === welcomeStep ? theme.primary : theme.border },
                  ]}
                />
              ))}
            </View>
          )}
          <View style={styles.actions}>
            {isWelcome ? (
              <>
                <Pressable accessibilityRole="button" onPress={finishWelcome} style={styles.secondaryAction}>
                  <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]}>{t('Passer')}</Text>
                </Pressable>
                <View style={styles.actionGroup}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: welcomeStep === 0 }}
                    disabled={welcomeStep === 0}
                    onPress={() => setWelcomeStep((step) => Math.max(0, (step ?? 0) - 1))}
                    style={[styles.secondaryAction, welcomeStep === 0 && styles.disabledAction]}
                  >
                    <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]}>{t('Précédent')}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => welcomeStep === WELCOME_STEPS.length - 1
                      ? finishWelcome()
                      : setWelcomeStep((step) => Math.min(WELCOME_STEPS.length - 1, (step ?? 0) + 1))}
                    style={[styles.primaryAction, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.primaryLabel}>
                      {t(welcomeStep === WELCOME_STEPS.length - 1 ? 'Commencer' : 'Suivant')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Pressable accessibilityRole="button" onPress={finishGuide} style={styles.secondaryAction}>
                  <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]}>{t('Passer')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={finishGuide} style={[styles.primaryAction, { backgroundColor: theme.primary }]}>
                  <Text style={styles.primaryLabel}>{t('Terminé')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill },
  dock: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', paddingHorizontal: 16 },
  card: { alignSelf: 'center', width: '100%', maxWidth: 520, padding: 18, borderWidth: 1, borderRadius: 20, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  headingCopy: { flex: 1, gap: 3 },
  step: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  description: { marginTop: 14, fontSize: 14, lineHeight: 21 },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  progressDot: { width: 7, height: 7, borderRadius: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 16 },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryAction: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 10 },
  secondaryLabel: { fontSize: 13, fontWeight: '600' },
  disabledAction: { opacity: 0.4 },
  primaryAction: { minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, borderRadius: 12 },
  primaryLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
