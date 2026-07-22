import { useAdventures } from '@/context/adventures-context';
import { useAuth } from '@/context/auth-context';
import { useCuriosities } from '@/context/curiosities-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PlaceAutocomplete } from '@/components/place-autocomplete';
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
  const [placeSelected, setPlaceSelected] = useState(false);
  const [placeCoordinate, setPlaceCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!curiosity) return;
    setForm({
      title: curiosity.title, description: curiosity.description, category: curiosity.category,
      locationName: curiosity.locationName, address: curiosity.address,
      accessibility: curiosity.accessibility, bestTimeToVisit: curiosity.bestTimeToVisit,
      recommendedDuration: curiosity.recommendedDuration, adventureId: curiosity.adventureId,
      status: curiosity.status === 'draft' ? 'draft' : 'published',
    });
    setPlaceSelected(Boolean(curiosity.address || curiosity.locationName));
    setPlaceCoordinate(curiosity.latitude !== null && curiosity.longitude !== null ? { latitude: curiosity.latitude, longitude: curiosity.longitude } : null);
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
    if (!placeSelected || !form.address.trim()) {
      Alert.alert('Emplacement à confirmer', 'Choisis une suggestion Mapbox avant d’enregistrer.');
      return;
    }
    setSaving(true);
    const success = await updateCuriosity(curiosity.id, { ...form, latitude: placeCoordinate?.latitude ?? null, longitude: placeCoordinate?.longitude ?? null });
    setSaving(false);
    if (success) Alert.alert('Curiosité modifiée', 'Tes changements sont enregistrés.', [{ text: 'Voir la fiche', onPress: () => router.back() }]);
    else Alert.alert('Erreur', 'Impossible de modifier la curiosité.');
  }

  if (loading) return <SafeAreaView style={styles.safeArea}><View style={styles.center}><ActivityIndicator color="#C99A2E" size="large" /></View></SafeAreaView>;
  if (!curiosity || curiosity.ownerId !== user?.id) return <SafeAreaView style={styles.safeArea}><View style={styles.center}><Text style={styles.errorTitle}>Modification non autorisée</Text><Pressable style={styles.saveButton} onPress={() => router.back()}><Text style={styles.saveText}>Revenir</Text></Pressable></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable><Text style={styles.title}>Modifier</Text></View>
        <Field label="Titre" value={form.title} onChangeText={(value) => setValue('title', value)} />
        <Field label="Description" value={form.description} onChangeText={(value) => setValue('description', value)} multiline />
        <Text style={styles.label}>Catégorie</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map((item) => <Pressable key={item} style={[styles.chip, form.category === item && styles.active]} onPress={() => setValue('category', item)}><Text style={styles.chipText}>{item}</Text></Pressable>)}</ScrollView>
        <Text style={styles.label}>Lieu, ville ou adresse</Text><PlaceAutocomplete value={form.address} onChangeText={(value) => { setValue('address', value); setValue('locationName', ''); setPlaceCoordinate(null); setPlaceSelected(false); }} onSelect={(place) => { setValue('address', place.label); setValue('locationName', place.city || place.label); setPlaceCoordinate({ latitude: place.latitude, longitude: place.longitude }); setPlaceSelected(true); }} selected={placeSelected} />
        <Field label="Accessibilité" value={form.accessibility} onChangeText={(value) => setValue('accessibility', value)} />
        <Field label="Meilleur moment" value={form.bestTimeToVisit} onChangeText={(value) => setValue('bestTimeToVisit', value)} />
        <Field label="Durée recommandée" value={form.recommendedDuration} onChangeText={(value) => setValue('recommendedDuration', value)} />
        <Text style={styles.label}>Aventure associée</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><Pressable style={[styles.chip, !form.adventureId && styles.active]} onPress={() => setValue('adventureId', null)}><Text style={styles.chipText}>Aucune</Text></Pressable>{ownAdventures.map((item) => <Pressable key={item.id} style={[styles.chip, form.adventureId === item.id && styles.active]} onPress={() => setValue('adventureId', item.id)}><Text style={styles.chipText}>{item.title}</Text></Pressable>)}</ScrollView>
        <Text style={styles.label}>Publication</Text><View style={styles.row}><Pressable style={[styles.option, form.status === 'draft' && styles.active]} onPress={() => setValue('status', 'draft')}><Text style={styles.chipText}>Brouillon</Text></Pressable><Pressable style={[styles.option, form.status === 'published' && styles.active]} onPress={() => setValue('status', 'published')}><Text style={styles.chipText}>Publié</Text></Pressable></View>
        <Text style={styles.note}>Les photos et la position enregistrée seront conservées.</Text>
        <Pressable style={styles.saveButton} onPress={() => void save()} disabled={saving}>{saving ? <ActivityIndicator color="#071A1C" /> : <Text style={styles.saveText}>Enregistrer les changements</Text>}</Pressable>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  );
}

function Field({ label, value, onChangeText, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean }) {
  return <><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} style={[styles.input, multiline && styles.textarea]} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} /></>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: '#071A1C' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, container: { padding: 20, paddingBottom: 70 }, header: { minHeight: 48, justifyContent: 'center', marginBottom: 18 }, back: { color: '#C99A2E', fontSize: 15, fontWeight: '800' }, title: { position: 'absolute', alignSelf: 'center', color: '#F4EBD8', fontSize: 19, fontWeight: '900' }, errorTitle: { color: '#F4EBD8', fontSize: 19, fontWeight: '900' },
  label: { color: '#FFF6E5', fontSize: 13, fontWeight: '800', marginTop: 16, marginBottom: 8 }, input: { minHeight: 54, borderRadius: 0, borderWidth: 1, borderColor: '#265F63', backgroundColor: '#10363A', color: '#F4EBD8', paddingHorizontal: 15, paddingVertical: 13 }, textarea: { minHeight: 140 }, chip: { borderRadius: 0, backgroundColor: '#16484C', paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 }, active: { backgroundColor: '#4B8180' }, chipText: { color: '#FFF6E5', fontSize: 12, fontWeight: '800' }, row: { flexDirection: 'row', gap: 9 }, option: { flex: 1, alignItems: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#3C7475', padding: 14 }, note: { color: '#B8C8C2', fontSize: 12, marginTop: 20 }, saveButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#C99A2E', paddingHorizontal: 20, marginTop: 24 }, saveText: { color: '#071A1C', fontSize: 14, fontWeight: '900' },
});
