import { supabase } from '@/lib/supabase';
import { passwordsMatch, validatePassword } from '@/lib/account-validation';
import { useLinkingURL } from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const url = useLinkingURL();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function prepareSession() {
      if (!url) { const { data } = await supabase.auth.getSession(); setReady(Boolean(data.session)); return; }
      const parsed = new URL(url);
      const code = parsed.searchParams.get('code');
      const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const result = code ? await supabase.auth.exchangeCodeForSession(code) : accessToken && refreshToken ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }) : await supabase.auth.getSession();
      setReady(!result.error && Boolean(result.data.session));
    }
    void prepareSession();
  }, [url]);

  async function savePassword() {
    if (!ready || saving) return;
    const passwordError = validatePassword(password);
    if (passwordError) { Alert.alert('Mot de passe trop court', passwordError); return; }
    if (!passwordsMatch(password, confirmation)) { Alert.alert('Vérification', 'Les deux mots de passe ne correspondent pas.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) Alert.alert('Modification impossible', error.message);
    else Alert.alert('Mot de passe modifié', 'Tu peux maintenant utiliser ton nouveau mot de passe.', [{ text: 'Continuer', onPress: () => router.replace('/') }]);
  }

  if (!ready) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>Lien invalide ou expiré</Text><Text style={styles.description}>Demande un nouveau lien de réinitialisation.</Text><Pressable style={styles.secondary} onPress={() => router.replace('/forgot-password')}><Text style={styles.secondaryText}>Demander un nouveau lien</Text></Pressable></View></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Text style={styles.eyebrow}>SÉCURITÉ</Text><Text style={styles.title}>Nouveau mot de passe</Text><Text style={styles.label}>Mot de passe</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="Au moins 8 caractères" placeholderTextColor="#A8B3A4" /><Text style={styles.label}>Confirmer</Text><TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry style={styles.input} placeholder="Répète le mot de passe" placeholderTextColor="#A8B3A4" /><Pressable style={[styles.button, saving && styles.disabled]} disabled={saving} onPress={() => void savePassword()}>{saving ? <ActivityIndicator color="#0B1710" /> : <Text style={styles.buttonText}>Enregistrer</Text>}</Pressable></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0B1710' }, container: { flex: 1, padding: 22, justifyContent: 'center' }, center: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }, eyebrow: { color: '#B86F4B', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#F4E9D6', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 20 }, description: { color: '#CBD5C8', textAlign: 'center', lineHeight: 20 }, label: { color: '#FBF1DF', fontSize: 13, fontWeight: '900', marginTop: 14, marginBottom: 8 }, input: { minHeight: 56, borderRadius: 0, borderWidth: 1, borderColor: '#3D6648', backgroundColor: '#173523', color: '#F4E9D6', paddingHorizontal: 16 }, button: { minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#B86F4B', marginTop: 24 }, buttonText: { color: '#0B1710', fontSize: 14, fontWeight: '900' }, secondary: { borderRadius: 0, borderWidth: 1, borderColor: '#6F8D6C', padding: 14, marginTop: 20 }, secondaryText: { color: '#B86F4B', fontWeight: '900' }, disabled: { opacity: 0.5 } });
