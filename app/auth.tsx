import { useAuth } from '@/context/auth-context';
import { validatePassword } from '@/lib/account-validation';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Entre ton courriel et ton mot de passe.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert(
        'Mot de passe trop court',
        passwordError
      );
      return;
    }

    if (mode === 'signup' && (!username.trim() || !displayName.trim())) {
      Alert.alert(
        'Profil incomplet',
        'Ajoute ton nom et ton nom d’utilisateur.'
      );
      return;
    }

    if (mode === 'signup' && !ageConfirmed) {
      Alert.alert('Âge requis', 'Tu dois confirmer avoir au moins 18 ans pour créer un compte.');
      return;
    }

    if (mode === 'signup' && !legalAccepted) {
      Alert.alert('Acceptation requise', 'Lis et accepte les conditions d’utilisation pour continuer.');
      return;
    }

    setSubmitting(true);

    const error =
      mode === 'signup'
        ? await signUp(email, password, username, displayName)
        : await signIn(email, password);

    setSubmitting(false);

    if (error) {
      Alert.alert('Erreur', error);
      return;
    }

    if (mode === 'signup') {
      Alert.alert(
        'Compte créé',
        'Vérifie ton courriel si Supabase demande une confirmation.'
      );
    }

    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>FRAGMENTA</Text>

          <Text style={styles.title}>
            {mode === 'signup'
              ? 'Commence ton aventure'
              : 'Bon retour'}
          </Text>

          <Text style={styles.subtitle}>
            {mode === 'signup'
              ? 'Crée ton profil et publie tes aventures.'
              : 'Reconnecte-toi à ton compte.'}
          </Text>

          {mode === 'signup' ? <Text style={styles.visitorNote}>Moins de 18 ans? Tu peux quand même explorer les cartes, lieux et voyages publics sans créer de compte.</Text> : null}

          {mode === 'signup' && (
            <>
              <Text style={styles.label}>Nom affiché</Text>

              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Jean-Michel"
                placeholderTextColor="#A8B3A4"
                style={styles.input}
              />

              <Text style={styles.label}>Nom d’utilisateur</Text>

              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="fragmentaqc"
                placeholderTextColor="#A8B3A4"
                style={styles.input}
                autoCapitalize="none"
              />
            </>
          )}

          <Text style={styles.label}>Courriel</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="toi@exemple.com"
            placeholderTextColor="#A8B3A4"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Mot de passe</Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Au moins 8 caractères"
            placeholderTextColor="#A8B3A4"
            style={styles.input}
            secureTextEntry
          />

          {mode === 'signup' ? <View style={styles.consentBox}>
            <Pressable style={styles.consentRow} onPress={() => setAgeConfirmed((current) => !current)}><View style={[styles.checkbox, ageConfirmed && styles.checkboxActive]}><Text style={styles.checkmark}>{ageConfirmed ? '✓' : ''}</Text></View><Text style={styles.consentText}>Je confirme avoir au moins 18 ans.</Text></Pressable>
            <Pressable style={styles.consentRow} onPress={() => setLegalAccepted((current) => !current)}><View style={[styles.checkbox, legalAccepted && styles.checkboxActive]}><Text style={styles.checkmark}>{legalAccepted ? '✓' : ''}</Text></View><Text style={styles.consentText}>J’accepte les conditions d’utilisation et reconnais avoir lu la politique de confidentialité.</Text></Pressable>
            <View style={styles.legalLinks}><Pressable onPress={() => router.push({ pathname: '/legal/[document]', params: { document: 'terms' } })}><Text style={styles.legalLink}>Conditions</Text></Pressable><Pressable onPress={() => router.push({ pathname: '/legal/[document]', params: { document: 'privacy' } })}><Text style={styles.legalLink}>Confidentialité</Text></Pressable></View>
          </View> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[
              styles.primaryButton,
              submitting && styles.disabledButton,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#0B1710" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'signup'
                  ? 'Créer mon compte'
                  : 'Me connecter'}
              </Text>
            )}
          </Pressable>

          {mode === 'login' ? <Pressable style={styles.forgotButton} onPress={() => router.push('/forgot-password')}><Text style={styles.forgotText}>Mot de passe oublié?</Text></Pressable> : null}

          <Pressable
            onPress={() =>
              setMode((current) =>
                current === 'signup' ? 'login' : 'signup'
              )
            }
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {mode === 'signup'
                ? 'J’ai déjà un compte'
                : 'Créer un nouveau compte'}
            </Text>
          </Pressable>

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Ton compte permettra de publier, suivre, commenter et
              sauvegarder tes aventures.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1710',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 40,
  },
  brand: {
    color: '#B86F4B',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 3,
  },
  title: {
    color: '#F4E9D6',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 16,
  },
  subtitle: {
    color: '#CBD5C8',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 28,
  },
  label: {
    color: '#FBF1DF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    minHeight: 56,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#3D6648',
    backgroundColor: '#173523',
    color: '#F4E9D6',
    fontSize: 15,
    paddingHorizontal: 16,
  },
  primaryButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#B86F4B',
    marginTop: 26,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#0B1710',
    fontSize: 16,
    fontWeight: '900',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  switchText: {
    color: '#A4B8AF',
    fontSize: 14,
    fontWeight: '800',
  },
  note: {
    backgroundColor: '#173523',
    borderWidth: 1,
    borderColor: '#35563E',
    borderRadius: 0,
    padding: 16,
    marginTop: 12,
  },
  noteText: {
    color: '#7F968B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  forgotButton: { alignItems: 'center', paddingTop: 15 },
  forgotText: { color: '#B86F4B', fontSize: 12, fontWeight: '800' },
  visitorNote: { color: '#C58A62', fontSize: 12, lineHeight: 18, marginTop: -16, marginBottom: 16 },
  consentBox: { borderRadius: 0, borderWidth: 1, borderColor: '#35563E', backgroundColor: '#173523', padding: 14, marginTop: 18, gap: 13 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 0, borderWidth: 1, borderColor: '#748D73', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#B86F4B', borderColor: '#B86F4B' },
  checkmark: { color: '#0B1710', fontSize: 13, fontWeight: '900' },
  consentText: { flex: 1, color: '#A4B8AF', fontSize: 12, lineHeight: 18 },
  legalLinks: { flexDirection: 'row', gap: 18, marginLeft: 32 },
  legalLink: { color: '#B86F4B', fontSize: 11, fontWeight: '900', textDecorationLine: 'underline' },
});
