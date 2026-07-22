import { useAuth } from '@/context/auth-context';
import { clearOfflineCache } from '@/lib/offline-cache';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

async function removeFiles(bucket: string, paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  for (let index = 0; index < uniquePaths.length; index += 100) {
    const { error } = await supabase.storage.from(bucket).remove(uniquePaths.slice(index, index + 100));
    if (error) throw error;
  }
}

export default function DeleteAccountScreen() {
  const { user } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (!user || confirmation !== 'SUPPRIMER' || deleting) return;
    setDeleting(true);
    try {
      const [adventureImages, curiosityImages, fragmentImages, avatarFiles] = await Promise.all([
        supabase.from('adventure_images').select('storage_path').eq('owner_id', user.id),
        supabase.from('curiosity_images').select('storage_path').eq('owner_id', user.id),
        supabase.from('fragment_images').select('storage_path').eq('owner_id', user.id),
        supabase.storage.from('avatars').list(user.id, { limit: 1000 }),
      ]);
      if (adventureImages.error || curiosityImages.error || fragmentImages.error || avatarFiles.error) throw new Error('Lecture des fichiers impossible.');
      await removeFiles('adventure-images', (adventureImages.data ?? []).map((row) => row.storage_path as string));
      await removeFiles('curiosity-images', (curiosityImages.data ?? []).map((row) => row.storage_path as string));
      await removeFiles('fragment-images', (fragmentImages.data ?? []).map((row) => row.storage_path as string));
      await removeFiles('avatars', (avatarFiles.data ?? []).map((file) => `${user.id}/${file.name}`));

      const { error } = await supabase.rpc('delete_own_account', { confirmation: 'SUPPRIMER' });
      if (error) throw error;
      await clearOfflineCache();
      await supabase.auth.signOut({ scope: 'local' });
      router.replace('/');
    } catch (error) {
      console.error('Suppression du compte impossible :', error);
      Alert.alert('Suppression impossible', "Le compte n'a pas été supprimé. Vérifie ta connexion et réessaie.");
      setDeleting(false);
    }
  }

  if (!user) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>Connexion requise</Text></View></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Pressable onPress={router.back} disabled={deleting}><Text style={styles.back}>‹ Retour</Text></Pressable>
    <Text style={styles.eyebrow}>ZONE DANGEREUSE</Text><Text style={styles.title}>Supprimer mon compte</Text>
    <View style={styles.warning}><Text style={styles.warningTitle}>Cette action est définitive</Text><Text style={styles.warningText}>Ton profil, tes aventures, fragments, curiosités, favoris et photos seront supprimés. Cette action ne peut pas être annulée.</Text></View>
    <Text style={styles.label}>Écris SUPPRIMER pour confirmer</Text><TextInput value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} editable={!deleting} style={styles.input} placeholder="SUPPRIMER" placeholderTextColor="#9FB2AD" />
    <Pressable style={[styles.deleteButton, confirmation !== 'SUPPRIMER' && styles.disabled]} disabled={confirmation !== 'SUPPRIMER' || deleting} onPress={() => void deleteAccount()}>{deleting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.deleteText}>Supprimer définitivement mon compte</Text>}</Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#071A1C' }, flex: { flex: 1 }, container: { padding: 20, paddingBottom: 70 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, back: { color: '#C99A2E', fontSize: 15, fontWeight: '800', marginBottom: 24 }, eyebrow: { color: '#FF8C8C', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#F4EBD8', fontSize: 28, fontWeight: '900', marginTop: 6 }, warning: { borderRadius: 0, borderWidth: 1, borderColor: '#7B3535', backgroundColor: '#261414', padding: 17, marginTop: 22 }, warningTitle: { color: '#FFB8B8', fontSize: 15, fontWeight: '900' }, warningText: { color: '#D29A9A', fontSize: 12, lineHeight: 19, marginTop: 7 }, label: { color: '#FFF6E5', fontSize: 13, fontWeight: '900', marginTop: 24, marginBottom: 9 }, input: { minHeight: 54, borderRadius: 0, borderWidth: 1, borderColor: '#7B3535', backgroundColor: '#10363A', color: '#F4EBD8', padding: 15 }, deleteButton: { minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#B33A3A', marginTop: 22 }, disabled: { opacity: 0.35 }, deleteText: { color: '#FFF', fontSize: 14, fontWeight: '900' } });
