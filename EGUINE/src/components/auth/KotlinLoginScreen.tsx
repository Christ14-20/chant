import { useTheme } from '@/hooks/use-theme';
import { createThemedStyles } from '@/utils/themed-styles';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { goBackSafely } from '@/utils/navigation';

const COLORS = { background: '#FFFFFF', card: '#FFFFFF', input: '#FFFFFF', gold: '#7A1F3D', goldDark: '#7A1F3D', text: '#0A1F44', muted: '#0A1F44', border: '#FFFFFF', red: '#7A1F3D' };
const EMAIL_REGEX = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function KotlinLoginScreen() {
  useTheme();
  const router = useRouter();
  const login = useAppStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submitLogin = () => {
    setEmailError(null);
    setPasswordError(null);
    let valid = true;
    if (!email.trim()) { setEmailError("L'adresse e-mail est requise."); valid = false; }
    else if (!EMAIL_REGEX.test(email.trim())) { setEmailError('Veuillez entrer une adresse e-mail valide.'); valid = false; }
    if (!password) { setPasswordError('Le mot de passe est requis.'); valid = false; }
    else if (password.length < 6) { setPasswordError('Le mot de passe doit contenir au moins 6 caractères.'); valid = false; }
    if (!valid) return;

    setIsLoading(true);
    login('Choriste', email.trim());
    setIsLoading(false);
    goBackSafely();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logoHalo}>
              <View style={styles.logoFrame}>
                <Image source={require('../../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
              </View>
            </View>
            <Text style={styles.brandName}>Chorale eGuine</Text>
            <Text style={styles.welcome}>Bon retour !</Text>
            <Text style={styles.subtitle}>Connectez-vous à votre espace choriste</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Adresse e-mail</Text>
              <View style={[styles.inputFrame, emailError && styles.inputError]}>
                <MaterialCommunityIcons name="email-outline" size={20} color={emailError ? COLORS.red : COLORS.muted} />
                <TextInput
                  accessibilityLabel="Adresse e-mail"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={(value) => { setEmail(value); if (emailError) setEmailError(null); }}
                  placeholder="choriste@eguine.org"
                  placeholderTextColor={`${COLORS.muted}80`}
                  returnKeyType="next"
                  style={styles.input}
                  value={email}
                />
              </View>
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mot de passe</Text>
              <View style={[styles.inputFrame, passwordError && styles.inputError]}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={passwordError ? COLORS.red : COLORS.muted} />
                <TextInput
                  accessibilityLabel="Mot de passe"
                  autoComplete="current-password"
                  onChangeText={(value) => { setPassword(value); if (passwordError) setPasswordError(null); }}
                  placeholder="••••••••••••"
                  placeholderTextColor={`${COLORS.muted}80`}
                  returnKeyType="done"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                  onSubmitEditing={submitLogin}
                />
                {password.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onPress={() => setShowPassword((value) => !value)} style={styles.passwordToggle}><MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.muted} /></Pressable>}
              </View>
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            </View>

            <View style={styles.optionsRow}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }} onPress={() => setRememberMe((value) => !value)} style={styles.rememberButton}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>{rememberMe && <MaterialCommunityIcons name="check" size={13} color={COLORS.background} />}</View>
                <Text style={styles.rememberLabel}>Se souvenir de moi</Text>
              </Pressable>
              <Pressable onPress={() => {}}><Text style={styles.forgotLabel}>Mot de passe oublié ?</Text></Pressable>
            </View>

            <Pressable accessibilityRole="button" onPress={submitLogin} disabled={isLoading} style={({ pressed }) => [styles.loginButton, pressed && styles.loginPressed]}>
              {isLoading ? <Text style={styles.loginLabel}>Connexion…</Text> : <Text style={styles.loginLabel}>Se connecter</Text>}
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou continuer avec</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <SocialButton name="google" label="Continuer avec Google" />
            <SocialButton name="facebook" label="Continuer avec Facebook" />
            <SocialButton name="apple" label="Continuer avec Apple" />
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Nouveau membre ? </Text>
            <Pressable onPress={goBackSafely}><Text style={styles.signupLink}>Créer un compte</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SocialButton({ name, label }: { name: string; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => {}} style={({ pressed }) => [styles.socialButton, pressed && styles.loginPressed]}>
      <MaterialCommunityIcons name={name as any} size={22} color={name === 'google' ? '#7A1F3D' : COLORS.text} />
    </Pressable>
  );
}

const styles = createThemedStyles({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  brand: { alignItems: 'center' },
  logoHalo: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', borderRadius: 55, backgroundColor: '#7A1F3D24' },
  logoFrame: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.gold, borderRadius: 40, backgroundColor: COLORS.card },
  logo: { width: 52, height: 52 },
  brandName: { marginTop: 16, color: COLORS.gold, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  welcome: { marginTop: 5, color: COLORS.text, fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 6, color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  formCard: { gap: 15, marginTop: 28, padding: 19, borderRadius: 20, backgroundColor: COLORS.card },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  inputFrame: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.input },
  inputError: { borderColor: COLORS.red },
  input: { flex: 1, minHeight: 48, color: COLORS.text, fontSize: 14 },
  passwordToggle: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.red, fontSize: 11 },
  optionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 1 },
  rememberButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 4 },
  checkboxActive: { borderColor: COLORS.gold, backgroundColor: COLORS.gold },
  rememberLabel: { color: COLORS.muted, fontSize: 11 },
  forgotLabel: { color: COLORS.gold, fontSize: 11, fontWeight: '700' },
  loginButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.gold },
  loginPressed: { opacity: 0.84 },
  loginLabel: { color: COLORS.background, fontSize: 15, fontWeight: '800' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 23 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.muted, fontSize: 11 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 17 },
  socialButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 26, backgroundColor: COLORS.card },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  signupPrompt: { color: COLORS.muted, fontSize: 13 },
  signupLink: { color: COLORS.gold, fontSize: 13, fontWeight: '700' },
});
