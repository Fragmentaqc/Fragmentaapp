import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  async function sendReset() {
    if (!email.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: Linking.createURL('reset-password') });
    setSending(false);
    if (error) Alert.alert('Envoi impossible', error.message);
    else Alert.alert('Vérifie ton courriel', 'Si un compte correspond à cette adresse, tu recevras un lien pour choisir un nouveau mot de passe.', [{ text: 'OK', onPress: router.back }]);
  }

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Pressable onPress={router.back}><Text style={styles.back}>‹ Retour</Text></Pressable><Text style={styles.eyebrow}>SÉCURITÉ</Text><Text style={styles.title}>Mot de passe oublié</Text><Text style={styles.description}>Entre l’adresse associée à ton compte. Nous t’enverrons un lien sécurisé.</Text>
    <Text style={styles.label}>Courriel</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={styles.input} placeholder="toi@exemple.com" placeholderTextColor="#A8B3A4" />
    <Pressable style={[styles.button, (!email.trim() || sending) && styles.disabled]} disabled={!email.trim() || sending} onPress={() => void sendReset()}>{sending ? <ActivityIndicator color="#0B1710" /> : <Text style={styles.buttonText}>Envoyer le lien</Text>}</Pressable>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0B1710' }, container: { flex: 1, padding: 22, justifyContent: 'center' }, back: { color: '#B86F4B', fontSize: 15, fontWeight: '800', marginBottom: 30 }, eyebrow: { color: '#B86F4B', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#F4E9D6', fontSize: 29, fontWeight: '900', marginTop: 6 }, description: { color: '#CBD5C8', fontSize: 13, lineHeight: 20, marginTop: 10, marginBottom: 20 }, label: { color: '#FBF1DF', fontSize: 13, fontWeight: '900', marginBottom: 8 }, input: { minHeight: 56, borderRadius: 0, borderWidth: 1, borderColor: '#3D6648', backgroundColor: '#173523', color: '#F4E9D6', paddingHorizontal: 16 }, button: { minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#B86F4B', marginTop: 22 }, buttonText: { color: '#0B1710', fontSize: 14, fontWeight: '900' }, disabled: { opacity: 0.45 } });
