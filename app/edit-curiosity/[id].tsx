import { useAdventures } from '@/context/adventures-context';
import { useAuth } from '@/context/auth-context';
import { useCuriosities } from '@/context/curiosities-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categories = ['Lieu insolite', 'Nature', 'Histoire', 'Art', 'Gastronomie', 'Point de vue', 'Autre'];

export default function EditCuriosityScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const { curiosities, loading, updateCuriosity } = useCuriosities();
  const { adventures } = useAdventures();
  const curiosity = curiosities.find((item) => item.id === id);
  const [form, setForm] = useState({ title: '', description: '', category: 'Autre', locationName: '', address: '', accessibility: '', bestTimeToVisit: '', recommendedDuration: '', adventureId: null as string | null, status: 'published' as 'draft' | 'published' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!curiosity) return;
    setForm({
      title: curiosity.title, description: curiosity.description, category: curiosity.category,
      locationName: curiosity.locationName, address: curiosity.address,
      accessibility: curiosity.accessibility, bestTimeToVisit: curiosity.bestTimeToVisit,
      recommendedDuration: curiosity.recommendedDuration, adventureId: curiosity.adventureId,
      status: curiosity.status === 'draft' ? 'draft' : 'published',
    });
  }, [curiosity]);

  const ownAdventures = adventures.filter((item) => item.ownerId === user?.id);
  function setValue<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!curiosity || saving) return;
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Informations manquantes', 'Le titre et la description sont obligatoires.');
      return;
    }
    setSaving(true);
    const success = await updateCuriosity(curiosity.id, { ...form });
    setSaving(false);
    if (success) Alert.alert('Curiosité modifiée', 'Tes changements sont enregistrés.', [{ text: 'Voir la fiche', onPress: () => router.back() }]);
    else Alert.alert('Erreur', 'Impossible de modifier la curiosité.');
  }

  if (loading) return <SafeAreaView style={styles.safeArea}><View style={styles.center}><ActivityIndicator color="#62E6B1" size="large" /></View></SafeAreaView>;
  if (!curiosity || curiosity.ownerId !== user?.id) return <SafeAreaView style={styles.safeArea}><View style={styles.center}><Text style={styles.errorTitle}>Modification non autorisée</Text><Pressable style={styles.saveButton} onPress={() => router.back()}><Text style={styles.saveText}>Revenir</Text></Pressable></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable><Text style={styles.title}>Modifier</Text></View>
        <Field label="Titre" value={form.title} onChangeText={(value) => setValue('title', value)} />
        <Field label="Description" value={form.description} onChangeText={(value) => setValue('description', value)} multiline />
        <Text style={styles.label}>Catégorie</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map((item) => <Pressable key={item} style={[styles.chip, form.category === item && styles.active]} onPress={() => setValue('category', item)}><Text style={styles.chipText}>{item}</Text></Pressable>)}</ScrollView>
        <Field label="Nom du lieu" value={form.locationName} onChangeText={(value) => setValue('locationName', value)} />
        <Field label="Adresse" value={form.address} onChangeText={(value) => setValue('address', value)} />
        <Field label="Accessibilité" value={form.accessibility} onChangeText={(value) => setValue('accessibility', value)} />
        <Field label="Meilleur moment" value={form.bestTimeToVisit} onChangeText={(value) => setValue('bestTimeToVisit', value)} />
        <Field label="Durée recommandée" value={form.recommendedDuration} onChangeText={(value) => setValue('recommendedDuration', value)} />
        <Text style={styles.label}>Aventure associée</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><Pressable style={[styles.chip, !form.adventureId && styles.active]} onPress={() => setValue('adventureId', null)}><Text style={styles.chipText}>Aucune</Text></Pressable>{ownAdventures.map((item) => <Pressable key={item.id} style={[styles.chip, form.adventureId === item.id && styles.active]} onPress={() => setValue('adventureId', item.id)}><Text style={styles.chipText}>{item.title}</Text></Pressable>)}</ScrollView>
        <Text style={styles.label}>Publication</Text><View style={styles.row}><Pressable style={[styles.option, form.status === 'draft' && styles.active]} onPress={() => setValue('status', 'draft')}><Text style={styles.chipText}>Brouillon</Text></Pressable><Pressable style={[styles.option, form.status === 'published' && styles.active]} onPress={() => setValue('status', 'published')}><Text style={styles.chipText}>Publié</Text></Pressable></View>
        <Text style={styles.note}>Les photos et la position enregistrée seront conservées.</Text>
        <Pressable style={styles.saveButton} onPress={() => void save()} disabled={saving}>{saving ? <ActivityIndicator color="#071310" /> : <Text style={styles.saveText}>Enregistrer les changements</Text>}</Pressable>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  );
}

function Field({ label, value, onChangeText, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean }) {
  return <><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} style={[styles.input, multiline && styles.textarea]} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} /></>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: '#071310' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, container: { padding: 20, paddingBottom: 70 }, header: { minHeight: 48, justifyContent: 'center', marginBottom: 18 }, back: { color: '#62E6B1', fontSize: 15, fontWeight: '800' }, title: { position: 'absolute', alignSelf: 'center', color: '#F3FFF9', fontSize: 19, fontWeight: '900' }, errorTitle: { color: '#F3FFF9', fontSize: 19, fontWeight: '900' },
  label: { color: '#DFFFF2', fontSize: 13, fontWeight: '800', marginTop: 16, marginBottom: 8 }, input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: '#1D4538', backgroundColor: '#0C1C17', color: '#F3FFF9', paddingHorizontal: 15, paddingVertical: 13 }, textarea: { minHeight: 140 }, chip: { borderRadius: 14, backgroundColor: '#10251E', paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 }, active: { backgroundColor: '#28634F' }, chipText: { color: '#DFFFF2', fontSize: 12, fontWeight: '800' }, row: { flexDirection: 'row', gap: 9 }, option: { flex: 1, alignItems: 'center', borderRadius: 15, borderWidth: 1, borderColor: '#285345', padding: 14 }, note: { color: '#81958C', fontSize: 12, marginTop: 20 }, saveButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#62E6B1', paddingHorizontal: 20, marginTop: 24 }, saveText: { color: '#071310', fontSize: 14, fontWeight: '900' },
});
