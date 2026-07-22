import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ReportType = 'adventure' | 'curiosity' | 'user';
type Reason = 'spam' | 'harassment' | 'dangerous' | 'false_information' | 'inappropriate' | 'other';
const reasons: { value: Reason; label: string }[] = [
  { value: 'spam', label: 'Contenu indésirable' }, { value: 'harassment', label: 'Harcèlement' },
  { value: 'dangerous', label: 'Contenu dangereux' }, { value: 'false_information', label: 'Information fausse' },
  { value: 'inappropriate', label: 'Contenu inapproprié' }, { value: 'other', label: 'Autre raison' },
];

export default function ReportScreen() {
  const params = useLocalSearchParams<{ type?: string; id?: string; label?: string }>();
  const { user } = useAuth();
  const type = ['adventure', 'curiosity', 'user'].includes(params.type ?? '') ? params.type as ReportType : null;
  const targetId = params.id;
  const [reason, setReason] = useState<Reason>('false_information');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!user || !type || !targetId || sending) return;
    setSending(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      adventure_id: type === 'adventure' ? targetId : null,
      curiosity_id: type === 'curiosity' ? targetId : null,
      reported_user_id: type === 'user' ? targetId : null,
      reason,
      details: details.trim(),
    });
    setSending(false);
    if (error?.code === '23505') {
      Alert.alert('Déjà signalé', 'Un signalement concernant cet élément est déjà en cours de traitement.');
      return;
    }
    if (error) {
      Alert.alert('Erreur', "Impossible d'envoyer le signalement.");
      return;
    }
    Alert.alert('Signalement envoyé', 'Merci. Notre équipe pourra examiner la situation.', [{ text: 'Terminer', onPress: router.back }]);
  }

  if (!user || !type || !targetId) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>Connexion requise</Text><Pressable style={styles.submit} onPress={() => router.replace('/auth')}><Text style={styles.submitText}>Me connecter</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Pressable onPress={router.back}><Text style={styles.back}>‹ Retour</Text></Pressable>
    <Text style={styles.eyebrow}>SÉCURITÉ</Text><Text style={styles.title}>Faire un signalement</Text>
    <Text style={styles.subtitle}>{params.label ? `À propos de « ${params.label} »` : 'Choisis le motif qui décrit le mieux la situation.'}</Text>
    <Text style={styles.label}>Motif</Text>
    <View style={styles.reasons}>{reasons.map((item) => <Pressable key={item.value} style={[styles.reason, reason === item.value && styles.reasonActive]} onPress={() => setReason(item.value)}><View style={[styles.dot, reason === item.value && styles.dotActive]} /><Text style={styles.reasonText}>{item.label}</Text></Pressable>)}</View>
    <Text style={styles.label}>Précisions facultatives</Text><TextInput value={details} onChangeText={setDetails} style={styles.area} multiline textAlignVertical="top" maxLength={1000} placeholder="Décris brièvement le problème…" placeholderTextColor="#9FB2AD" />
    <Text style={styles.count}>{details.length}/1000</Text>
    <View style={styles.notice}><Text style={styles.noticeText}>Le signalement est confidentiel. La personne signalée ne verra pas ton identité.</Text></View>
    <Pressable style={styles.submit} onPress={() => void submit()} disabled={sending}>{sending ? <ActivityIndicator color="#071A1C" /> : <Text style={styles.submitText}>Envoyer le signalement</Text>}</Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#071A1C' }, flex: { flex: 1 }, container: { padding: 20, paddingBottom: 70 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  back: { color: '#C99A2E', fontSize: 15, fontWeight: '800', marginBottom: 22 }, eyebrow: { color: '#D8B65A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#F4EBD8', fontSize: 28, fontWeight: '900', marginTop: 6 }, subtitle: { color: '#C9D6D1', fontSize: 13, lineHeight: 20, marginTop: 8 }, label: { color: '#FFF6E5', fontSize: 13, fontWeight: '900', marginTop: 22, marginBottom: 9 },
  reasons: { gap: 8 }, reason: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#265F63', backgroundColor: '#10363A', paddingHorizontal: 14 }, reasonActive: { borderColor: '#C99A2E', backgroundColor: '#1D5A5E' }, dot: { width: 12, height: 12, borderRadius: 0, borderWidth: 2, borderColor: '#A9BBB5', marginRight: 11 }, dotActive: { borderColor: '#C99A2E', backgroundColor: '#C99A2E' }, reasonText: { color: '#FFF6E5', fontSize: 13, fontWeight: '800' },
  area: { minHeight: 140, borderRadius: 0, borderWidth: 1, borderColor: '#265F63', backgroundColor: '#10363A', color: '#F4EBD8', padding: 15 }, count: { color: '#9FB2AD', fontSize: 10, textAlign: 'right', marginTop: 5 }, notice: { borderRadius: 0, backgroundColor: '#16484C', padding: 14, marginTop: 18 }, noticeText: { color: '#B8C8C2', fontSize: 11, lineHeight: 17 }, submit: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#D8B65A', paddingHorizontal: 22, marginTop: 22 }, submitText: { color: '#071A1C', fontSize: 14, fontWeight: '900' },
});
