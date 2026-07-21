import { LocationPicker } from '@/components/location-picker';
import { useFragments } from '@/context/fragments-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditFragmentScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { fragmentsByAdventure, updateFragment } = useFragments();
  const fragment = useMemo(() => Object.values(fragmentsByAdventure).flat().find((item) => item.id === id), [fragmentsByAdventure, id]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [coordinate, setCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fragment) return;
    setTitle(fragment.title);
    setBody(fragment.body);
    setDate(fragment.occurredAt ? fragment.occurredAt.slice(0, 10) : '');
    setStatus(fragment.status);
    setCoordinate(typeof fragment.latitude === 'number' && typeof fragment.longitude === 'number' ? { latitude: fragment.latitude, longitude: fragment.longitude } : null);
  }, [fragment]);

  async function save() {
    if (!fragment || saving || !title.trim() || !body.trim()) {
      if (!title.trim() || !body.trim()) Alert.alert('Informations manquantes', 'Le titre et le récit sont obligatoires.');
      return;
    }
    setSaving(true);
    const success = await updateFragment(fragment.id, fragment.adventureId, {
      title, body, status,
      occurredAt: date.trim() ? new Date(`${date.trim()}T12:00:00`).toISOString() : null,
      latitude: coordinate?.latitude,
      longitude: coordinate?.longitude,
    });
    setSaving(false);
    if (success) router.back();
    else Alert.alert('Erreur', "Impossible de modifier le fragment.");
  }

  if (!fragment) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.heading}>Fragment introuvable</Text><Pressable onPress={router.back}><Text style={styles.back}>Revenir</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Pressable onPress={router.back}><Text style={styles.back}>‹ Retour</Text></Pressable>
    <Text style={styles.eyebrow}>FRAGMENT</Text><Text style={styles.heading}>Modifier ce moment</Text>
    <Text style={styles.label}>Titre</Text><TextInput value={title} onChangeText={setTitle} style={styles.input} maxLength={80} />
    <Text style={styles.label}>Récit</Text><TextInput value={body} onChangeText={setBody} style={[styles.input, styles.area]} multiline textAlignVertical="top" maxLength={1000} />
    <Text style={styles.label}>Date (AAAA-MM-JJ)</Text><TextInput value={date} onChangeText={setDate} style={styles.input} maxLength={10} keyboardType="numbers-and-punctuation" />
    <Text style={styles.label}>Publication</Text><View style={styles.row}><Pressable style={[styles.choice, status === 'draft' && styles.active]} onPress={() => setStatus('draft')}><Text style={styles.choiceText}>Brouillon</Text></Pressable><Pressable style={[styles.choice, status === 'published' && styles.active]} onPress={() => setStatus('published')}><Text style={styles.choiceText}>Publié</Text></Pressable></View>
    <Text style={styles.label}>Position</Text><LocationPicker coordinate={coordinate} onSelect={setCoordinate} />
    <Text style={styles.note}>Les photos actuelles sont conservées.</Text>
    <Pressable style={styles.save} onPress={() => void save()} disabled={saving}>{saving ? <ActivityIndicator color="#071310" /> : <Text style={styles.saveText}>Enregistrer</Text>}</Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#071310' }, flex: { flex: 1 }, container: { padding: 18, paddingBottom: 70 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { color: '#62E6B1', fontSize: 15, fontWeight: '800', marginBottom: 20 }, eyebrow: { color: '#62E6B1', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, heading: { color: '#F3FFF9', fontSize: 28, fontWeight: '900', marginTop: 6 },
  label: { color: '#DFFFF2', fontSize: 13, fontWeight: '800', marginTop: 18, marginBottom: 8 }, input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: '#1D4538', backgroundColor: '#0C1C17', color: '#F3FFF9', padding: 15 }, area: { minHeight: 150 },
  row: { flexDirection: 'row', gap: 9 }, choice: { flex: 1, alignItems: 'center', borderRadius: 15, borderWidth: 1, borderColor: '#285345', padding: 14 }, active: { backgroundColor: '#28634F' }, choiceText: { color: '#F3FFF9', fontWeight: '800' },
  note: { color: '#81958C', fontSize: 11, marginTop: 15 }, save: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#62E6B1', marginTop: 24 }, saveText: { color: '#071310', fontSize: 15, fontWeight: '900' },
});
