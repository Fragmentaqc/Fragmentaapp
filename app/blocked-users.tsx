import { useBlocks } from '@/context/blocks-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BlockedProfile = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

export default function BlockedUsersScreen() {
  const { blockedUserIds, loading, unblockUser } = useBlocks();
  const [profiles, setProfiles] = useState<BlockedProfile[]>([]);

  const loadProfiles = useCallback(async () => {
    if (!blockedUserIds.length) { setProfiles([]); return; }
    const { data, error } = await supabase.from('profiles').select('id, display_name, username, avatar_url').in('id', blockedUserIds);
    if (!error) setProfiles((data ?? []) as BlockedProfile[]);
  }, [blockedUserIds]);

  useEffect(() => { void loadProfiles(); }, [loadProfiles]);

  function confirmUnblock(profile: BlockedProfile) {
    const name = profile.display_name || profile.username || 'cet utilisateur';
    Alert.alert('Débloquer', `Permettre de nouveau les interactions avec ${name}?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Débloquer', onPress: () => void unblockUser(profile.id) },
    ]);
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={router.back}><Text style={styles.back}>‹ Retour</Text></Pressable>
    <Text style={styles.eyebrow}>CONFIDENTIALITÉ</Text><Text style={styles.title}>Comptes bloqués</Text>
    <Text style={styles.description}>Vous ne voyez plus vos profils et publications respectifs. Débloque un compte pour rétablir la visibilité.</Text>
    {loading ? <ActivityIndicator color="#62E6B1" style={styles.loader} /> : profiles.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Aucun compte bloqué</Text><Text style={styles.emptyText}>Les comptes que tu bloques apparaîtront ici.</Text></View> : profiles.map((profile) => {
      const name = profile.display_name || profile.username || 'Aventurier';
      return <View key={profile.id} style={styles.row}>{profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text></View>}<View style={styles.identity}><Text style={styles.name}>{name}</Text>{profile.username ? <Text style={styles.handle}>@{profile.username}</Text> : null}</View><Pressable style={styles.unblock} onPress={() => confirmUnblock(profile)}><Text style={styles.unblockText}>Débloquer</Text></Pressable></View>;
    })}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#071310' }, container: { padding: 20, paddingBottom: 70 }, back: { color: '#62E6B1', fontSize: 15, fontWeight: '800', marginBottom: 24 }, eyebrow: { color: '#62E6B1', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#F3FFF9', fontSize: 28, fontWeight: '900', marginTop: 6 }, description: { color: '#8FA69B', fontSize: 13, lineHeight: 20, marginTop: 10 }, loader: { marginTop: 40 }, empty: { borderRadius: 0, backgroundColor: '#0C1C17', padding: 22, marginTop: 24 }, emptyTitle: { color: '#DFFFF2', fontSize: 15, fontWeight: '900' }, emptyText: { color: '#81958C', fontSize: 12, marginTop: 6 }, row: { flexDirection: 'row', alignItems: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#19392E', backgroundColor: '#0C1C17', padding: 11, marginTop: 10 }, avatar: { width: 46, height: 46, borderRadius: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#174B3B' }, initial: { color: '#F3FFF9', fontSize: 18, fontWeight: '900' }, identity: { flex: 1, marginLeft: 11 }, name: { color: '#F3FFF9', fontSize: 14, fontWeight: '900' }, handle: { color: '#81958C', fontSize: 11, marginTop: 3 }, unblock: { borderRadius: 0, borderWidth: 1, borderColor: '#28634F', paddingHorizontal: 11, paddingVertical: 8 }, unblockText: { color: '#62E6B1', fontSize: 11, fontWeight: '900' } });
