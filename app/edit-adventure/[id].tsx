import { useAdventures } from '@/context/adventures-context';
import { useAuth } from '@/context/auth-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categories = ['Vélo', 'Road trip', 'À pied', 'Camping', 'Urbain', 'Défi', 'Autre'];

export default function EditAdventureScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const { adventures, loading, updateAdventure } = useAdventures();
  const adventure = adventures.find((item) => item.id === id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [category, setCategory] = useState('Autre');
  const [publicationStatus, setPublicationStatus] = useState<'draft' | 'published'>('published');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adventure) return;
    setTitle(adventure.title);
    setDescription(adventure.description);
    setStartLocation(adventure.startLocation);
    setDestination(adventure.destination);
    setCategory(adventure.category);
    setPublicationStatus(adventure.publicationStatus);
  }, [adventure]);

  async function save() {
    if (!adventure || saving) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert('Informations manquantes', 'Le titre et la description sont obligatoires.');
      return;
    }
    setSaving(true);
    const success = await updateAdventure(adventure.id, { title, description, startLocation, destination, category, publicationStatus });
    setSaving(false);
    if (success) {
      Alert.alert('Aventure modifiée', 'Tes changements sont enregistrés.', [{ text: 'Voir la fiche', onPress: () => router.back() }]);
    } else {
      Alert.alert('Erreur', "Impossible de modifier l'aventure.");
    }
  }

  if (loading) return <SafeAreaView style={styles.safeArea}><View style={styles.center}><ActivityIndicator color="#62E6B1" size="large" /></View></SafeAreaView>;
  if (!adventure || adventure.ownerId !== user?.id) return <SafeAreaView style={styles.safeArea}><View style={styles.center}><Text style={styles.errorTitle}>Modification non autorisée</Text><Pressable style={styles.primaryButton} onPress={() => router.back()}><Text style={styles.primaryText}>Revenir</Text></Pressable></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable><Text style={styles.heading}>Modifier</Text></View>
          <Text style={styles.label}>Titre</Text><TextInput value={title} onChangeText={setTitle} style={styles.input} maxLength={100} />
          <Text style={styles.label}>Description</Text><TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.textarea]} multiline textAlignVertical="top" maxLength={2000} />
          <Text style={styles.label}>Départ</Text><TextInput value={startLocation} onChangeText={setStartLocation} style={styles.input} />
          <Text style={styles.label}>Destination</Text><TextInput value={destination} onChangeText={setDestination} style={styles.input} />
          <Text style={styles.label}>Catégorie</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map((item) => <Pressable key={item} style={[styles.chip, category === item && styles.chipActive]} onPress={() => setCategory(item)}><Text style={styles.chipText}>{item}</Text></Pressable>)}</ScrollView>
          <Text style={styles.label}>Publication</Text><View style={styles.statusRow}><Pressable style={[styles.statusButton, publicationStatus === 'draft' && styles.statusActive]} onPress={() => setPublicationStatus('draft')}><Text style={styles.statusText}>Brouillon</Text></Pressable><Pressable style={[styles.statusButton, publicationStatus === 'published' && styles.statusActive]} onPress={() => setPublicationStatus('published')}><Text style={styles.statusText}>Publié</Text></Pressable></View>
          <Text style={styles.photoNote}>Les photos actuelles seront conservées.</Text>
          <Pressable style={styles.primaryButton} onPress={() => void save()} disabled={saving}>{saving ? <ActivityIndicator color="#071310" /> : <Text style={styles.primaryText}>Enregistrer les changements</Text>}</Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: '#071310' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, container: { padding: 20, paddingBottom: 70 },
  header: { minHeight: 48, justifyContent: 'center', marginBottom: 18 }, back: { color: '#62E6B1', fontSize: 15, fontWeight: '800' }, heading: { position: 'absolute', alignSelf: 'center', color: '#F3FFF9', fontSize: 19, fontWeight: '900' },
  label: { color: '#DFFFF2', fontSize: 13, fontWeight: '800', marginTop: 16, marginBottom: 8 }, input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: '#1D4538', backgroundColor: '#0C1C17', color: '#F3FFF9', paddingHorizontal: 15, paddingVertical: 13 }, textarea: { minHeight: 145 },
  chip: { borderRadius: 14, backgroundColor: '#10251E', paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 }, chipActive: { backgroundColor: '#28634F' }, chipText: { color: '#DFFFF2', fontSize: 12, fontWeight: '800' },
  statusRow: { flexDirection: 'row', gap: 9 }, statusButton: { flex: 1, alignItems: 'center', borderRadius: 15, borderWidth: 1, borderColor: '#285345', padding: 14 }, statusActive: { backgroundColor: '#28634F' }, statusText: { color: '#F3FFF9', fontWeight: '800' }, photoNote: { color: '#81958C', fontSize: 12, marginTop: 20 },
  primaryButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#62E6B1', paddingHorizontal: 20, marginTop: 24 }, primaryText: { color: '#071310', fontSize: 14, fontWeight: '900' }, errorTitle: { color: '#F3FFF9', fontSize: 20, fontWeight: '900' },
});
