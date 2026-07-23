import { useAuth } from '@/context/auth-context';
import { useBlocks } from '@/context/blocks-context';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = { id: string; sender_id: string; body: string; created_at: string; read_at: string | null; deleted_at: string | null };

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string; otherId?: string; name?: string; avatar?: string }>();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const { blockUser } = useBlocks();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const name = Array.isArray(params.name) ? params.name[0] : params.name || 'Aventurier';
  const avatar = Array.isArray(params.avatar) ? params.avatar[0] : params.avatar;

  const markRead = useCallback(async () => {
    if (!user || !conversationId) return;
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversationId).neq('sender_id', user.id).is('read_at', null);
  }, [conversationId, user]);

  const loadMessages = useCallback(async () => {
    if (!user || !conversationId) return;
    const { data, error } = await supabase.from('messages').select('id, sender_id, body, created_at, read_at, deleted_at').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    if (error) Alert.alert('Conversation indisponible', error.message);
    else { setMessages((data ?? []) as Message[]); await markRead(); }
    setLoading(false);
  }, [conversationId, markRead, user]);

  useEffect(() => { void loadMessages(); }, [loadMessages]);
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`chat-${conversationId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      const message = payload.new as Message;
      setMessages((current) => current.some((item) => item.id === message.id) ? current.map((item) => item.id === message.id ? message : item) : [...current, message]);
      if (message.sender_id !== user?.id) void markRead();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }).on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== user?.id) setOtherTyping(Boolean(payload.typing));
    }).subscribe();
    realtimeChannel.current = channel;
    return () => { if (typingTimer.current) clearTimeout(typingTimer.current); realtimeChannel.current = null; void supabase.removeChannel(channel); };
  }, [conversationId, markRead, user?.id]);

  function changeBody(value: string) {
    setBody(value);
    void realtimeChannel.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id, typing: Boolean(value.trim()) } });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => void realtimeChannel.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id, typing: false } }), 1200);
  }

  async function send() {
    const cleanBody = body.trim();
    if (!user || !conversationId || !cleanBody || sending) return;
    setSending(true); setBody('');
    const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, body: cleanBody });
    setSending(false);
    if (error) { setBody(cleanBody); Alert.alert('Message non envoyé', error.message.includes('row-level security') ? 'Cette conversation n’est pas disponible. Le compte est peut-être bloqué.' : error.message); }
  }

  async function deleteMessage(message: Message) {
    const { data, error } = await supabase.rpc('delete_own_message', { target_message_id: message.id });
    if (error || data !== true) Alert.alert('Suppression impossible', error?.message || 'Ce message ne peut pas être supprimé.');
  }

  async function reportMessage(message: Message) {
    if (!user) return;
    const { error } = await supabase.from('reports').insert({ reporter_id: user.id, message_id: message.id, reason: 'harassment', details: `Message de ${name} : ${message.body.slice(0, 700)}` });
    Alert.alert(error ? 'Signalement impossible' : 'Message signalé', error?.message || 'Merci. L’équipe de modération pourra examiner ce message.');
  }

  function showMessageActions(message: Message) {
    if (message.deleted_at) return;
    const mine = message.sender_id === user?.id;
    Alert.alert(mine ? 'Ton message' : `Message de ${name}`, undefined, mine ? [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void deleteMessage(message) },
    ] : [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Signaler ce message', style: 'destructive', onPress: () => void reportMessage(message) },
    ]);
  }

  function showConversationActions() {
    const otherId = Array.isArray(params.otherId) ? params.otherId[0] : params.otherId;
    Alert.alert(name, 'Actions de la conversation', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Masquer la conversation', onPress: async () => { if (!user) return; await supabase.from('hidden_conversations').upsert({ user_id: user.id, conversation_id: conversationId }); router.back(); } },
      { text: 'Bloquer ce membre', style: 'destructive', onPress: async () => { if (otherId && await blockUser(otherId)) router.replace('/messages'); } },
    ]);
  }

  if (!user) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.emptyTitle}>Connexion requise</Text><Pressable style={styles.sendButton} onPress={() => router.replace('/auth')}><Text style={styles.sendText}>Me connecter</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><Pressable style={styles.identity} onPress={() => params.otherId && router.push({ pathname: '/user/[id]', params: { id: params.otherId } })}>{avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>}<View><Text style={styles.name} numberOfLines={1}>{name}</Text><Text style={[styles.status, otherTyping && styles.typing]}>{otherTyping ? 'écrit…' : 'Conversation privée'}</Text></View></Pressable><Pressable style={styles.more} onPress={showConversationActions}><Text style={styles.moreText}>•••</Text></Pressable></View>
    {loading ? <ActivityIndicator color="#B86F4B" size="large" style={styles.loader} /> : <FlatList ref={listRef} data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyMark}>✦</Text><Text style={styles.emptyTitle}>Commencez l’histoire</Text><Text style={styles.emptyText}>Écris le premier message à {name}.</Text></View>} renderItem={({ item, index }) => {
      const mine = item.sender_id === user.id;
      const previous = messages[index - 1];
      const showDate = !previous || new Date(item.created_at).toDateString() !== new Date(previous.created_at).toDateString();
      return <>{showDate ? <Text style={styles.day}>{new Date(item.created_at).toLocaleDateString('fr-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</Text> : null}<Pressable onLongPress={() => showMessageActions(item)} style={[styles.bubble, mine ? styles.mine : styles.theirs, item.deleted_at && styles.deleted]}><Text style={[styles.messageText, mine && styles.mineText, item.deleted_at && styles.deletedText]}>{item.deleted_at ? 'Message supprimé' : item.body}</Text><Text style={[styles.time, mine && styles.mineTime]}>{new Date(item.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}{mine && item.read_at ? '  ✓' : ''}</Text></Pressable></>;
    }} />}
    <View style={styles.composer}><TextInput value={body} onChangeText={changeBody} style={styles.input} placeholder="Écrire un message…" placeholderTextColor="#829080" multiline maxLength={2000} /><Pressable style={[styles.sendButton, (!body.trim() || sending) && styles.disabled]} onPress={() => void send()} disabled={!body.trim() || sending}>{sending ? <ActivityIndicator color="#0B1710" /> : <Text style={styles.sendText}>↑</Text>}</Pressable></View>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#0B1710' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 }, header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#35563E', paddingHorizontal: 12 }, back: { width: 42, height: 48, justifyContent: 'center' }, backText: { color: '#B86F4B', fontSize: 37, lineHeight: 40 }, identity: { flex: 1, flexDirection: 'row', alignItems: 'center' }, more: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center' }, moreText: { color: '#B86F4B', fontSize: 15, fontWeight: '900', letterSpacing: 1 }, avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#21472F', marginRight: 11 }, avatarText: { color: '#F4E9D6', fontWeight: '900' }, name: { maxWidth: 220, color: '#F4E9D6', fontSize: 15, fontWeight: '900' }, status: { color: '#829080', fontSize: 9, marginTop: 3 }, typing: { color: '#B86F4B', fontWeight: '900' }, loader: { marginTop: 50 }, list: { flexGrow: 1, justifyContent: 'flex-end', padding: 15, paddingBottom: 18 }, day: { alignSelf: 'center', color: '#829080', fontSize: 9, marginVertical: 16, textTransform: 'capitalize' }, bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingTop: 10, paddingBottom: 7, marginTop: 5 }, mine: { alignSelf: 'flex-end', backgroundColor: '#B86F4B' }, theirs: { alignSelf: 'flex-start', backgroundColor: '#21472F' }, deleted: { opacity: 0.62 }, messageText: { color: '#F4E9D6', fontSize: 14, lineHeight: 20 }, mineText: { color: '#0B1710' }, deletedText: { fontStyle: 'italic' }, time: { color: '#AEBBAA', fontSize: 8, textAlign: 'right', marginTop: 5 }, mineTime: { color: '#26382A' }, composer: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#35563E', backgroundColor: '#102218', paddingHorizontal: 11, paddingVertical: 10 }, input: { flex: 1, maxHeight: 115, minHeight: 46, color: '#F4E9D6', backgroundColor: '#173523', paddingHorizontal: 14, paddingVertical: 12 }, sendButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B86F4B', marginLeft: 8 }, sendText: { color: '#0B1710', fontSize: 22, fontWeight: '900' }, disabled: { opacity: 0.4 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }, emptyMark: { color: '#B86F4B', fontSize: 38 }, emptyTitle: { color: '#F4E9D6', fontSize: 22, fontWeight: '900', marginTop: 10 }, emptyText: { color: '#BCC8B8', textAlign: 'center', marginTop: 7 },
});
