import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Notification = { id: string; actor_id: string | null; type: 'follow' | 'message' | 'verification' | 'adventure' | 'curiosity'; title: string; body: string; adventure_id: string | null; curiosity_id: string | null; conversation_id: string | null; read_at: string | null; created_at: string };
type Profile = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); setRefreshing(false); return; }
    const { data, error } = await supabase.from('notifications').select('id, actor_id, type, title, body, adventure_id, curiosity_id, conversation_id, read_at, created_at').order('created_at', { ascending: false }).limit(100);
    if (!error) {
      const notifications = (data ?? []) as Notification[];
      setItems(notifications);
      const actorIds = [...new Set(notifications.map((item) => item.actor_id).filter(Boolean))] as string[];
      if (actorIds.length) {
        const profileResult = await supabase.from('profiles').select('id, display_name, username, avatar_url').in('id', actorIds);
        setProfiles(Object.fromEntries(((profileResult.data ?? []) as Profile[]).map((profile) => [profile.id, profile])));
      }
    }
    setLoading(false); setRefreshing(false);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`notifications-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, user]);

  async function open(item: Notification) {
    if (!item.read_at) { setItems((current) => current.map((value) => value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value)); await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id); }
    const actor = item.actor_id ? profiles[item.actor_id] : null;
    if (item.type === 'follow' && item.actor_id) router.push({ pathname: '/user/[id]', params: { id: item.actor_id } });
    else if (item.type === 'message' && item.conversation_id) router.push({ pathname: '/chat/[id]', params: { id: item.conversation_id, otherId: item.actor_id || '', name: actor?.display_name || actor?.username || 'Aventurier', avatar: actor?.avatar_url || '' } });
    else if (item.adventure_id) router.push({ pathname: '/adventure/[id]', params: { id: item.adventure_id } });
    else if (item.curiosity_id) router.push({ pathname: '/curiosity/[id]', params: { id: item.curiosity_id } });
  }
  async function markAllRead() {
    if (!user) return;
    const now = new Date().toISOString(); setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
    await supabase.from('notifications').update({ read_at: now }).is('read_at', null);
  }

  return <SafeAreaView style={styles.safe}><View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable><View style={styles.headingRow}><View><Text style={styles.eyebrow}>TON FIL</Text><Text style={styles.title}>Notifications</Text></View>{items.some((item) => !item.read_at) ? <Pressable onPress={() => void markAllRead()}><Text style={styles.markAll}>Tout lire</Text></Pressable> : null}</View></View>
    {loading ? <ActivityIndicator color="#B86F4B" size="large" style={styles.loader} /> : <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={items.length ? styles.list : styles.emptyList} refreshControl={<RefreshControl refreshing={refreshing} tintColor="#B86F4B" onRefresh={() => { setRefreshing(true); void load(); }} />} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>♢</Text><Text style={styles.emptyTitle}>Tout est calme</Text><Text style={styles.emptyText}>Les messages, abonnements et nouvelles découvertes apparaîtront ici.</Text></View>} renderItem={({ item }) => {
      const actor = item.actor_id ? profiles[item.actor_id] : null; const name = actor?.display_name || actor?.username || 'F';
      return <Pressable style={[styles.row, !item.read_at && styles.unread]} onPress={() => void open(item)}>{actor?.avatar_url ? <Image source={{ uri: actor.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{item.type === 'verification' ? '✓' : name.charAt(0).toUpperCase()}</Text></View>}<View style={styles.content}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.body} numberOfLines={2}>{item.body}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text></View>{!item.read_at ? <View style={styles.dot} /> : <Text style={styles.arrow}>›</Text>}</Pressable>;
    }} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0B1710' }, header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 17 }, back: { color: '#B86F4B', fontSize: 14, fontWeight: '900' }, headingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18 }, eyebrow: { color: '#B86F4B', fontSize: 9, fontWeight: '900', letterSpacing: 2 }, title: { color: '#F4E9D6', fontSize: 32, fontWeight: '900', marginTop: 5 }, markAll: { color: '#B86F4B', fontSize: 11, fontWeight: '900', padding: 8 }, loader: { marginTop: 50 }, list: { paddingHorizontal: 14, paddingBottom: 50 }, emptyList: { flexGrow: 1 }, row: { minHeight: 91, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#35563E', paddingHorizontal: 8, paddingVertical: 12 }, unread: { backgroundColor: '#142B1D' }, avatar: { width: 51, height: 51, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#21472F' }, avatarText: { color: '#F4E9D6', fontSize: 18, fontWeight: '900' }, content: { flex: 1, marginLeft: 13 }, itemTitle: { color: '#F4E9D6', fontSize: 13, fontWeight: '900' }, body: { color: '#AEBBAA', fontSize: 11, lineHeight: 16, marginTop: 4 }, date: { color: '#718075', fontSize: 8, marginTop: 5 }, dot: { width: 9, height: 9, backgroundColor: '#B86F4B', marginLeft: 9 }, arrow: { color: '#B86F4B', fontSize: 27, marginLeft: 9 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 35 }, emptyIcon: { color: '#B86F4B', fontSize: 42, transform: [{ rotate: '180deg' }] }, emptyTitle: { color: '#F4E9D6', fontSize: 23, fontWeight: '900', marginTop: 12 }, emptyText: { color: '#BCC8B8', textAlign: 'center', lineHeight: 19, marginTop: 8 } });
