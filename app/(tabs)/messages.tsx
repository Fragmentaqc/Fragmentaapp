import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ConversationRow = {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string;
};
type ProfileRow = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
type MessageRow = { conversation_id: string; body: string; created_at: string; sender_id: string; read_at: string | null };
type InboxItem = { id: string; other: ProfileRow; preview: string; createdAt: string; unread: number };

export default function MessagesScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInbox = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); setRefreshing(false); return; }
    const { data: conversations, error } = await supabase.from('conversations').select('id, participant_one, participant_two, last_message_at').order('last_message_at', { ascending: false });
    if (error) { console.error('Erreur de chargement des conversations :', error.message); setLoading(false); setRefreshing(false); return; }
    const rows = (conversations ?? []) as ConversationRow[];
    const otherIds = [...new Set(rows.map((row) => row.participant_one === user.id ? row.participant_two : row.participant_one))];
    const conversationIds = rows.map((row) => row.id);
    const [profilesResult, messagesResult] = await Promise.all([
      otherIds.length ? supabase.from('profiles').select('id, display_name, username, avatar_url').in('id', otherIds) : Promise.resolve({ data: [], error: null }),
      conversationIds.length ? supabase.from('messages').select('conversation_id, body, created_at, sender_id, read_at').in('conversation_id', conversationIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);
    const profiles = (profilesResult.data ?? []) as ProfileRow[];
    const messages = (messagesResult.data ?? []) as MessageRow[];
    setItems(rows.map((row) => {
      const otherId = row.participant_one === user.id ? row.participant_two : row.participant_one;
      const conversationMessages = messages.filter((message) => message.conversation_id === row.id);
      const last = conversationMessages[0];
      return {
        id: row.id,
        other: profiles.find((profile) => profile.id === otherId) ?? { id: otherId, display_name: 'Aventurier', username: null, avatar_url: null },
        preview: last?.body ?? 'Nouvelle conversation',
        createdAt: last?.created_at ?? row.last_message_at,
        unread: conversationMessages.filter((message) => message.sender_id !== user.id && !message.read_at).length,
      };
    }));
    setLoading(false); setRefreshing(false);
  }, [user]);

  useEffect(() => { void loadInbox(); }, [loadInbox]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`inbox-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void loadInbox()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadInbox, user]);

  if (!user) return <SafeAreaView style={styles.safe}><View style={styles.empty}><Text style={styles.eyebrow}>COMMUNAUTÉ</Text><Text style={styles.emptyTitle}>Tes conversations</Text><Text style={styles.emptyText}>Connecte-toi pour écrire aux aventuriers de la communauté.</Text><Pressable style={styles.primary} onPress={() => router.push('/auth')}><Text style={styles.primaryText}>Me connecter</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <View style={styles.header}><Text style={styles.eyebrow}>CONNECTER</Text><Text style={styles.title}>Messages</Text><Text style={styles.subtitle}>Les conversations qui font naître les prochaines aventures.</Text></View>
    {loading ? <ActivityIndicator color="#B86F4B" size="large" style={styles.loader} /> : <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={items.length ? styles.list : styles.emptyList}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor="#B86F4B" onRefresh={() => { setRefreshing(true); void loadInbox(); }} />}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyMark}>✦</Text><Text style={styles.emptyTitle}>Aucune conversation</Text><Text style={styles.emptyText}>Trouve un membre dans Explorer et touche « Écrire » sur son profil.</Text><Pressable style={styles.secondary} onPress={() => router.push('/members' as never)}><Text style={styles.secondaryText}>Découvrir des membres</Text></Pressable></View>}
      renderItem={({ item }) => {
        const name = item.other.display_name || item.other.username || 'Aventurier';
        return <Pressable style={styles.row} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id, otherId: item.other.id, name, avatar: item.other.avatar_url || '' } })}>
          <View style={styles.avatar}>{item.other.avatar_url ? <Image source={{ uri: item.other.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>}</View>
          <View style={styles.body}><View style={styles.nameRow}><Text style={styles.name} numberOfLines={1}>{name}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}</Text></View><Text style={[styles.preview, item.unread > 0 && styles.previewUnread]} numberOfLines={1}>{item.preview}</Text></View>
          {item.unread > 0 ? <Text style={styles.badge}>{item.unread > 99 ? '99+' : item.unread}</Text> : <Text style={styles.arrow}>›</Text>}
        </Pressable>;
      }}
    />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1710' }, header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 }, eyebrow: { color: '#B86F4B', fontSize: 9, fontWeight: '900', letterSpacing: 2 }, title: { color: '#F4E9D6', fontSize: 34, fontWeight: '900', marginTop: 6 }, subtitle: { color: '#BCC8B8', fontSize: 12, lineHeight: 18, marginTop: 7 }, loader: { marginTop: 50 }, list: { paddingHorizontal: 14, paddingBottom: 90 }, emptyList: { flexGrow: 1 },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#35563E', paddingHorizontal: 7, paddingVertical: 11 }, avatar: { width: 55, height: 55, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#21472F' }, avatarImage: { width: '100%', height: '100%' }, avatarText: { color: '#F4E9D6', fontSize: 20, fontWeight: '900' }, body: { flex: 1, marginLeft: 13 }, nameRow: { flexDirection: 'row', alignItems: 'center' }, name: { flex: 1, color: '#F4E9D6', fontSize: 15, fontWeight: '900' }, date: { color: '#829080', fontSize: 9, marginLeft: 8 }, preview: { color: '#AEBBAA', fontSize: 12, marginTop: 6 }, previewUnread: { color: '#FBF1DF', fontWeight: '800' }, badge: { minWidth: 25, height: 25, color: '#0B1710', backgroundColor: '#B86F4B', textAlign: 'center', lineHeight: 25, fontSize: 10, fontWeight: '900', marginLeft: 9, overflow: 'hidden' }, arrow: { color: '#B86F4B', fontSize: 28, marginLeft: 9 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }, emptyMark: { color: '#B86F4B', fontSize: 40 }, emptyTitle: { color: '#F4E9D6', fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 12 }, emptyText: { maxWidth: 320, color: '#BCC8B8', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 8 }, primary: { minHeight: 52, justifyContent: 'center', backgroundColor: '#B86F4B', paddingHorizontal: 24, marginTop: 22 }, primaryText: { color: '#0B1710', fontWeight: '900' }, secondary: { borderWidth: 1, borderColor: '#6F8D6C', paddingHorizontal: 18, paddingVertical: 12, marginTop: 21 }, secondaryText: { color: '#F4E9D6', fontWeight: '900' },
});
