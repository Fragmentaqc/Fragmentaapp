import { useAdventures } from '@/context/adventures-context';
import { useAuth } from '@/context/auth-context';
import { useBlocks } from '@/context/blocks-context';
import { useFollows } from '@/context/follows-context';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAGE_SIZE = 20;
type Member = { id: string; display_name: string | null; username: string | null; bio: string | null; country: string | null; avatar_url: string | null };

export default function MembersScreen() {
  const params = useLocalSearchParams<{ mode?: string; userId?: string }>();
  const { user } = useAuth();
  const { adventures } = useAdventures();
  const { hiddenUserIds } = useBlocks();
  const { followingIds, toggleFollow } = useFollows();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [adventureType, setAdventureType] = useState('Tous');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const categories = useMemo(() => ['Tous', ...Array.from(new Set(adventures.map((item) => item.category).filter(Boolean))).sort()], [adventures]);
  const permittedIds = useMemo(() => adventureType === 'Tous' ? null : Array.from(new Set(adventures.filter((item) => item.category === adventureType).map((item) => item.ownerId).filter(Boolean))) as string[], [adventureType, adventures]);

  const load = useCallback(async (nextPage: number, replace: boolean) => {
    if (nextPage > 0) setLoadingMore(true); else setLoading(true);
    let relationshipIds: string[] | null = null;
    const targetId = params.userId || user?.id;
    if ((params.mode === 'followers' || params.mode === 'following') && targetId) {
      const column = params.mode === 'followers' ? 'followed_id' : 'follower_id';
      const selected = params.mode === 'followers' ? 'follower_id' : 'followed_id';
      const { data } = await supabase.from('profile_follows').select(selected).eq(column, targetId);
      relationshipIds = (data ?? []).map((row) => String(row[selected as keyof typeof row]));
    }
    const allowed = relationshipIds ?? permittedIds;
    if (allowed && allowed.length === 0) {
      setMembers([]); setHasMore(false); setLoading(false); setRefreshing(false); setLoadingMore(false); return;
    }
    let query = supabase.from('profiles').select('id, display_name, username, bio, country, avatar_url').order('display_name', { ascending: true }).range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);
    const cleanSearch = search.trim().replace(/[,%()]/g, ' ');
    if (cleanSearch) query = query.or(`display_name.ilike.%${cleanSearch}%,username.ilike.%${cleanSearch}%,bio.ilike.%${cleanSearch}%`);
    if (country.trim()) query = query.ilike('country', `%${country.trim().replace(/[%]/g, '')}%`);
    if (allowed) query = query.in('id', allowed);
    const { data, error } = await query;
    if (!error) {
      const visible = (data ?? []).filter((item) => item.id !== user?.id && !hiddenUserIds.includes(item.id));
      setMembers((current) => replace ? visible : [...current, ...visible.filter((item) => !current.some((old) => old.id === item.id))]);
      setHasMore((data ?? []).length === PAGE_SIZE);
      setPage(nextPage);
    }
    setLoading(false); setRefreshing(false); setLoadingMore(false);
  }, [country, hiddenUserIds, params.mode, params.userId, permittedIds, search, user?.id]);

  useEffect(() => { const timer = setTimeout(() => void load(0, true), 250); return () => clearTimeout(timer); }, [adventureType, country, search, params.mode, load]);
  const title = params.mode === 'followers' ? 'Abonnés' : params.mode === 'following' ? 'Abonnements' : 'Trouver des membres';

  return <SafeAreaView style={styles.safeArea}>
    <FlatList
      data={members}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor="#C99A2E" onRefresh={() => { setRefreshing(true); void load(0, true); }} />}
      onEndReached={() => { if (hasMore && !loadingMore && !loading) void load(page + 1, false); }}
      onEndReachedThreshold={0.35}
      ListHeaderComponent={<>
        <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable><Text style={styles.eyebrow}>COMMUNAUTÉ</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>Découvre des aventuriers, consulte leur profil et abonne-toi sans quitter la recherche.</Text></View>
        <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Nom, pseudo ou mot-clé" placeholderTextColor="#6E857B" /></View>
        <TextInput style={styles.countryInput} value={country} onChangeText={setCountry} placeholder="Filtrer par pays" placeholderTextColor="#6E857B" />
        <FlatList horizontal data={categories} keyExtractor={(item) => item} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} renderItem={({ item }) => <Pressable style={[styles.chip, item === adventureType && styles.chipActive]} onPress={() => setAdventureType(item)}><Text style={[styles.chipText, item === adventureType && styles.chipTextActive]}>{item}</Text></Pressable>} />
        <Text style={styles.resultLabel}>{members.length} membre{members.length === 1 ? '' : 's'}</Text>
      </>}
      renderItem={({ item }) => {
        const name = item.display_name || item.username || 'Aventurier';
        const isFollowing = followingIds.includes(item.id);
        return <Pressable style={styles.card} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })}>
          <View style={styles.avatar}>{item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>}</View>
          <View style={styles.memberInfo}><Text style={styles.name}>{name}</Text><Text style={styles.handle}>{item.username ? `@${item.username}` : 'Profil Fragmenta'}{item.country ? ` · ${item.country}` : ''}</Text>{item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}</View>
          <Pressable style={[styles.followButton, isFollowing && styles.followingButton]} onPress={(event) => { event.stopPropagation(); if (!user) router.push('/auth'); else void toggleFollow(item.id); }}><Text style={[styles.followText, isFollowing && styles.followingText]}>{isFollowing ? 'Suivi' : 'Suivre'}</Text></Pressable>
        </Pressable>;
      }}
      ListEmptyComponent={loading ? <ActivityIndicator style={styles.loader} color="#C99A2E" /> : <View style={styles.empty}><Text style={styles.emptyTitle}>Aucun membre trouvé</Text><Text style={styles.emptyText}>Essaie un autre nom, pays ou type d’aventure.</Text></View>}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} color="#C99A2E" /> : <View style={styles.footerSpace} />}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071A1C' }, container: { padding: 18, paddingBottom: 70 },
  header: { marginBottom: 18 }, back: { color: '#C99A2E', fontWeight: '800', paddingVertical: 8 }, eyebrow: { color: '#C99A2E', fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginTop: 12 }, title: { color: '#F4EBD8', fontSize: 30, fontWeight: '900', marginTop: 7 }, subtitle: { color: '#C9D6D1', lineHeight: 20, marginTop: 8 },
  searchBox: { height: 56, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#4B8180', borderRadius: 0, backgroundColor: '#10363A', paddingHorizontal: 14 }, searchIcon: { color: '#C99A2E', fontSize: 26, marginRight: 9 }, input: { flex: 1, color: '#F4EBD8', fontSize: 15 }, countryInput: { height: 48, color: '#F4EBD8', borderWidth: 1, borderColor: '#275456', borderRadius: 0, backgroundColor: '#10363A', paddingHorizontal: 15, marginTop: 10 },
  chips: { gap: 8, paddingVertical: 14 }, chip: { borderWidth: 1, borderColor: '#265F63', borderRadius: 0, paddingHorizontal: 14, paddingVertical: 9 }, chipActive: { backgroundColor: '#C99A2E', borderColor: '#C99A2E' }, chipText: { color: '#9EB0A8', fontSize: 12, fontWeight: '800' }, chipTextActive: { color: '#071A1C' }, resultLabel: { color: '#B8C8C2', fontSize: 12, fontWeight: '800', marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#275456', borderRadius: 0, backgroundColor: '#10363A', padding: 12, marginBottom: 10 }, avatar: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 0, overflow: 'hidden', backgroundColor: '#174B3B' }, avatarImage: { width: '100%', height: '100%' }, avatarText: { color: '#C99A2E', fontSize: 21, fontWeight: '900' }, memberInfo: { flex: 1, marginHorizontal: 11 }, name: { color: '#F4EBD8', fontSize: 15, fontWeight: '900' }, handle: { color: '#C99A2E', fontSize: 10, marginTop: 3 }, bio: { color: '#C9D6D1', fontSize: 11, lineHeight: 15, marginTop: 5 }, followButton: { backgroundColor: '#C99A2E', borderRadius: 0, paddingHorizontal: 13, paddingVertical: 10 }, followingButton: { backgroundColor: '#1D5A5E' }, followText: { color: '#071A1C', fontSize: 11, fontWeight: '900' }, followingText: { color: '#C99A2E' },
  loader: { marginTop: 45 }, empty: { alignItems: 'center', padding: 35 }, emptyTitle: { color: '#F4EBD8', fontSize: 18, fontWeight: '900' }, emptyText: { color: '#B8C8C2', textAlign: 'center', marginTop: 8 }, footerLoader: { margin: 20 }, footerSpace: { height: 25 },
});
