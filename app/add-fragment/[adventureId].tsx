import { LocationPicker } from '@/components/location-picker';
import { useAdventures } from '@/context/adventures-context';
import { useFragments } from '@/context/fragments-context';
import { parseLocalDate } from '@/lib/date-validation';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddFragmentScreen() {
  const params = useLocalSearchParams<{ adventureId?: string | string[] }>();
  const adventureId = Array.isArray(params.adventureId) ? params.adventureId[0] : params.adventureId;
  const { adventures } = useAdventures();
  const { addFragment } = useFragments();
  const adventure = adventures.find((item) => item.id === adventureId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [images, setImages] = useState<string[]>([]);
  const [coordinate, setCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorise Fragmenta à accéder à tes photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 10 - images.length, quality: 0.8 });
    if (!result.canceled) setImages((current) => [...new Set([...current, ...result.assets.map((asset) => asset.uri)])].slice(0, 10));
  }

  async function save(status: 'draft' | 'published') {
    if (!adventureId || saving) return;
    if (!title.trim() || !body.trim()) {
      Alert.alert('Informations manquantes', 'Ajoute un titre et raconte ce moment.');
      return;
    }
    const parsedDate = parseLocalDate(date);
    if (parsedDate === undefined) {
      Alert.alert('Date invalide', 'Utilise une date réelle au format AAAA-MM-JJ.');
      return;
    }
    setSaving(true);
    const success = await addFragment({ adventureId, title, body, occurredAt: parsedDate, latitude: coordinate?.latitude, longitude: coordinate?.longitude, status, images });
    setSaving(false);
    if (!success) {
      Alert.alert('Erreur', "Impossible d'enregistrer le fragment.");
      return;
    }
    Alert.alert(status === 'draft' ? 'Brouillon enregistré' : 'Fragment publié', 'Ce moment a été ajouté à ton aventure.', [{ text: 'Voir l’aventure', onPress: () => router.replace({ pathname: '/adventure/[id]', params: { id: adventureId } }) }]);
  }

  if (!adventure) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>Aventure introuvable</Text><Pressable onPress={router.back}><Text style={styles.link}>Revenir</Text></Pressable></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={router.back}><Text style={styles.back}>‹ Retour</Text></Pressable>
          <Text style={styles.eyebrow}>NOUVEAU FRAGMENT</Text>
          <Text style={styles.title}>Ajoute un moment</Text>
          <Text style={styles.subtitle}>{adventure.title}</Text>

          <Pressable style={styles.photoButton} onPress={() => void pickImages()} disabled={saving || images.length >= 10}>
            <Text style={styles.photoIcon}>＋</Text><Text style={styles.photoTitle}>Ajouter des photos</Text><Text style={styles.helper}>{images.length}/10</Text>
          </Pressable>
          {images.length ? <ScrollView horizontal contentContainerStyle={styles.images}>{images.map((uri) => <View key={uri}><Image source={{ uri }} style={styles.image} /><Pressable style={styles.remove} onPress={() => setImages((current) => current.filter((item) => item !== uri))}><Text style={styles.removeText}>×</Text></Pressable></View>)}</ScrollView> : null}

          <Text style={styles.label}>Titre du moment</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={80} placeholder="Ex. Premier sommet atteint" placeholderTextColor="#B8B59E" editable={!saving} />
          <Text style={styles.label}>Récit</Text>
          <TextInput style={[styles.input, styles.area]} value={body} onChangeText={setBody} maxLength={1000} multiline textAlignVertical="top" placeholder="Raconte ce qui s’est passé…" placeholderTextColor="#B8B59E" editable={!saving} />
          <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} maxLength={10} keyboardType="numbers-and-punctuation" placeholder="2026-07-20" placeholderTextColor="#B8B59E" editable={!saving} />
          <Text style={styles.label}>Position du moment</Text>
          <LocationPicker coordinate={coordinate} onSelect={setCoordinate} />

          <Pressable style={styles.publish} onPress={() => void save('published')} disabled={saving}>{saving ? <ActivityIndicator color="#173E28" /> : <Text style={styles.publishText}>Publier le fragment</Text>}</Pressable>
          <Pressable style={styles.draft} onPress={() => void save('draft')} disabled={saving}><Text style={styles.draftText}>Enregistrer comme brouillon</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#173E28' }, flex: { flex: 1 }, container: { padding: 18, paddingBottom: 70 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { color: '#E9576F', fontSize: 15, fontWeight: '800', marginBottom: 22 }, eyebrow: { color: '#E9576F', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#F5E6C8', fontSize: 30, fontWeight: '900', marginTop: 6 }, subtitle: { color: '#D8CFBA', fontSize: 14, marginTop: 7, marginBottom: 20 }, link: { color: '#E9576F', marginTop: 18 },
  photoButton: { height: 150, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 1, borderStyle: 'dashed', borderColor: '#7BA578', backgroundColor: '#245A35' },
  photoIcon: { color: '#E9576F', fontSize: 35 }, photoTitle: { color: '#F5E6C8', fontWeight: '800' }, helper: { color: '#7F968B', fontSize: 11, marginTop: 5 }, images: { gap: 10, paddingVertical: 14 },
  image: { width: 120, height: 140, borderRadius: 0}, remove: { position: 'absolute', right: 6, top: 6, width: 28, height: 28, borderRadius: 0, backgroundColor: 'rgba(0,0,0,.7)', alignItems: 'center', justifyContent: 'center' }, removeText: { color: '#FFF', fontSize: 20 },
  label: { color: '#FFF1D6', fontSize: 14, fontWeight: '800', marginTop: 18, marginBottom: 8 }, input: { minHeight: 54, borderRadius: 0, borderWidth: 1, borderColor: '#356F43', backgroundColor: '#245A35', color: '#F5E6C8', padding: 15 }, area: { minHeight: 150 },
  publish: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#E9576F', marginTop: 26 }, publishText: { color: '#173E28', fontWeight: '900', fontSize: 15 },
  draft: { minHeight: 52, alignItems: 'center', justifyContent: 'center' }, draftText: { color: '#A4B8AF', fontWeight: '800' },
});
