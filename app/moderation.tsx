import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
type Report = { id: string; reporter_id: string; adventure_id: string | null; curiosity_id: string | null; reported_user_id: string | null; reason: string; details: string; status: ReportStatus; moderation_note: string; created_at: string };
type ModerationLog = { id: string; report_id: string | null; old_status: ReportStatus; new_status: ReportStatus; note: string; created_at: string };
type VerificationRequest = { id: string; curiosity_id: string; requester_id: string; status: 'pending' | 'approved' | 'rejected'; decision_note: string; created_at: string; curiosities: { title: string; location_name: string | null } | null };
const reasonLabels: Record<string, string> = { spam: 'Contenu indésirable', harassment: 'Harcèlement', dangerous: 'Contenu dangereux', false_information: 'Information fausse', inappropriate: 'Contenu inapproprié', other: 'Autre raison' };

export default function ModerationScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const roleResult = await supabase.rpc('is_moderator');
    if (roleResult.error || roleResult.data !== true) {
      setAuthorized(false); setLoading(false); return;
    }
    setAuthorized(true);
    const { data, error } = await supabase.from('reports').select('id, reporter_id, adventure_id, curiosity_id, reported_user_id, reason, details, status, moderation_note, created_at').order('created_at', { ascending: true });
    if (error) Alert.alert('Erreur', 'Impossible de charger les signalements.');
    else setReports((data ?? []) as Report[]);
    const logResult = await supabase.from('moderation_logs').select('id, report_id, old_status, new_status, note, created_at').order('created_at', { ascending: false }).limit(25);
    if (!logResult.error) setLogs((logResult.data ?? []) as ModerationLog[]);
    const verificationResult = await supabase.from('curiosity_verification_requests').select('id, curiosity_id, requester_id, status, decision_note, created_at, curiosities(title, location_name)').eq('status', 'pending').order('created_at', { ascending: true });
    if (!verificationResult.error) setVerificationRequests((verificationResult.data ?? []) as unknown as VerificationRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: ReportStatus) {
    if (updatingId) return;
    setUpdatingId(id);
    const note = (notes[id] ?? '').trim();
    const { error } = await supabase.from('reports').update({ status, reviewed_at: new Date().toISOString(), moderation_note: note }).eq('id', id);
    setUpdatingId(null);
    if (error) Alert.alert('Erreur', 'Impossible de modifier ce signalement.');
    else {
      setReports((current) => current.map((report) => report.id === id ? { ...report, status, moderation_note: note } : report));
      setNotes((current) => ({ ...current, [id]: '' }));
      await load();
    }
  }

  async function reviewVerification(request: VerificationRequest, decision: 'approved' | 'rejected') {
    if (updatingId) return;
    const note = (verificationNotes[request.id] ?? '').trim();
    if (decision === 'rejected' && !note) { Alert.alert('Motif requis', 'Ajoute un motif avant de refuser la vérification.'); return; }
    setUpdatingId(request.id);
    const { error } = await supabase.rpc('review_curiosity_verification', { request_id: request.id, decision, note });
    setUpdatingId(null);
    if (error) Alert.alert('Erreur', 'Impossible d’enregistrer cette décision.');
    else await load();
  }

  function openTarget(report: Report) {
    if (report.adventure_id) router.push({ pathname: '/adventure/[id]', params: { id: report.adventure_id } });
    else if (report.curiosity_id) router.push({ pathname: '/curiosity/[id]', params: { id: report.curiosity_id } });
    else if (report.reported_user_id) router.push({ pathname: '/user/[id]', params: { id: report.reported_user_id } });
  }

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#E9576F" size="large" /></View></SafeAreaView>;
  if (!authorized) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>Accès réservé</Text><Text style={styles.empty}>Cette section est réservée à l’équipe de modération.</Text><Pressable style={styles.primary} onPress={router.back}><Text style={styles.primaryText}>Revenir</Text></Pressable></View></SafeAreaView>;

  const openReports = reports.filter((report) => report.status === 'pending' || report.status === 'reviewing');
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={router.back}><Text style={styles.back}>‹ Retour</Text></Pressable>
    <Text style={styles.eyebrow}>MODÉRATION</Text><Text style={styles.title}>Signalements</Text><Text style={styles.subtitle}>{openReports.length} dossier{openReports.length > 1 ? 's' : ''} à traiter</Text>
    {openReports.length ? openReports.map((report) => <View key={report.id} style={styles.card}>
      <View style={styles.cardTop}><Text style={styles.reason}>{reasonLabels[report.reason] ?? report.reason}</Text><Text style={styles.status}>{report.status === 'pending' ? 'NOUVEAU' : 'EN EXAMEN'}</Text></View>
      <Text style={styles.date}>{new Date(report.created_at).toLocaleString('fr-CA')}</Text>
      {report.details ? <Text style={styles.details}>{report.details}</Text> : <Text style={styles.noDetails}>Aucune précision fournie.</Text>}
      <Pressable style={styles.target} onPress={() => openTarget(report)}><Text style={styles.targetText}>Voir le contenu signalé →</Text></Pressable>
      <TextInput value={notes[report.id] ?? ''} onChangeText={(value) => setNotes((current) => ({ ...current, [report.id]: value }))} style={styles.noteInput} maxLength={1000} placeholder="Note interne facultative" placeholderTextColor="#B8B59E" />
      <View style={styles.actions}>
        {report.status === 'pending' ? <Pressable style={styles.review} onPress={() => void updateStatus(report.id, 'reviewing')}><Text style={styles.reviewText}>Examiner</Text></Pressable> : null}
        <Pressable style={styles.resolve} onPress={() => void updateStatus(report.id, 'resolved')}><Text style={styles.resolveText}>Résoudre</Text></Pressable>
        <Pressable style={styles.dismiss} onPress={() => void updateStatus(report.id, 'dismissed')}><Text style={styles.dismissText}>Rejeter</Text></Pressable>
      </View>
    </View>) : <Text style={styles.empty}>Aucun signalement à traiter.</Text>}
    <Text style={styles.historyTitle}>Curiosités à vérifier</Text>
    {verificationRequests.length ? verificationRequests.map((request) => <View key={request.id} style={styles.card}>
      <View style={styles.cardTop}><Text style={styles.reason}>{request.curiosities?.title ?? 'Curiosité'}</Text><Text style={styles.status}>À VÉRIFIER</Text></View>
      {request.curiosities?.location_name ? <Text style={styles.details}>{request.curiosities.location_name}</Text> : null}
      <Text style={styles.date}>Demandée le {new Date(request.created_at).toLocaleString('fr-CA')}</Text>
      <Pressable style={styles.target} onPress={() => router.push({ pathname: '/curiosity/[id]', params: { id: request.curiosity_id } })}><Text style={styles.targetText}>Examiner la curiosité →</Text></Pressable>
      <TextInput value={verificationNotes[request.id] ?? ''} onChangeText={(value) => setVerificationNotes((current) => ({ ...current, [request.id]: value }))} style={styles.noteInput} maxLength={1000} placeholder="Note de décision (obligatoire pour refuser)" placeholderTextColor="#B8B59E" />
      <View style={styles.actions}><Pressable style={styles.resolve} onPress={() => void reviewVerification(request, 'approved')}><Text style={styles.resolveText}>Vérifier</Text></Pressable><Pressable style={styles.dismiss} onPress={() => void reviewVerification(request, 'rejected')}><Text style={styles.dismissText}>Refuser</Text></Pressable></View>
    </View>) : <Text style={styles.empty}>Aucune demande de vérification.</Text>}
    <Text style={styles.historyTitle}>Historique récent</Text>
    {logs.length ? logs.map((log) => <View key={log.id} style={styles.logCard}><Text style={styles.logChange}>{log.old_status} → {log.new_status}</Text><Text style={styles.date}>{new Date(log.created_at).toLocaleString('fr-CA')}</Text>{log.note ? <Text style={styles.logNote}>{log.note}</Text> : null}</View>) : <Text style={styles.empty}>Aucune action enregistrée.</Text>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#173E28' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, container: { padding: 20, paddingBottom: 70 }, back: { color: '#E9576F', fontSize: 15, fontWeight: '800', marginBottom: 22 }, eyebrow: { color: '#F0A36B', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#F5E6C8', fontSize: 28, fontWeight: '900', marginTop: 6 }, subtitle: { color: '#D8CFBA', fontSize: 13, marginTop: 7, marginBottom: 14 }, empty: { color: '#D0C4A9', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 18 },
  card: { borderRadius: 0, borderWidth: 1, borderColor: '#5B8F5D', backgroundColor: '#245A35', padding: 16, marginTop: 12 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, reason: { flex: 1, color: '#F5E6C8', fontSize: 15, fontWeight: '900' }, status: { color: '#173E28', backgroundColor: '#F0A36B', borderRadius: 0, paddingHorizontal: 8, paddingVertical: 5, fontSize: 8, fontWeight: '900' }, date: { color: '#B8B59E', fontSize: 10, marginTop: 7 }, details: { color: '#EFE0C4', fontSize: 13, lineHeight: 20, marginTop: 12 }, noDetails: { color: '#B8B59E', fontSize: 11, fontStyle: 'italic', marginTop: 12 }, target: { borderRadius: 0, backgroundColor: '#3B7C49', padding: 12, marginTop: 13 }, targetText: { color: '#E9576F', fontSize: 11, fontWeight: '900' }, noteInput: { minHeight: 46, borderRadius: 0, borderWidth: 1, borderColor: '#5B8F5D', color: '#F5E6C8', padding: 12, marginTop: 10 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, review: { borderRadius: 0, backgroundColor: '#6D9F6B', padding: 10 }, reviewText: { color: '#FFF', fontSize: 10, fontWeight: '900' }, resolve: { borderRadius: 0, backgroundColor: '#E9576F', padding: 10 }, resolveText: { color: '#173E28', fontSize: 10, fontWeight: '900' }, dismiss: { borderRadius: 0, borderWidth: 1, borderColor: '#7B3535', padding: 10 }, dismissText: { color: '#FFB8B8', fontSize: 10, fontWeight: '900' }, historyTitle: { color: '#F5E6C8', fontSize: 20, fontWeight: '900', marginTop: 30 }, logCard: { borderLeftWidth: 2, borderLeftColor: '#E9576F', paddingLeft: 13, paddingVertical: 8, marginTop: 8 }, logChange: { color: '#FFF1D6', fontSize: 12, fontWeight: '900' }, logNote: { color: '#D0C4A9', fontSize: 11, lineHeight: 17, marginTop: 5 }, primary: { minHeight: 50, justifyContent: 'center', borderRadius: 0, backgroundColor: '#E9576F', paddingHorizontal: 20, marginTop: 20 }, primaryText: { color: '#173E28', fontWeight: '900' },
});
