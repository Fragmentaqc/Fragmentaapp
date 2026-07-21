import { useAdventures } from '@/context/adventures-context';
import { useCuriosities } from '@/context/curiosities-context';
import { useAuth } from '@/context/auth-context';
import { normalizeSocialUrl, parseSocialLinks, type SocialLink } from '@/lib/social-links';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PublicProfile = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  country: string | null;
  avatar_url: string | null;
  social_links: SocialLink[] | null;
};

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Array.isArray(id) ? id[0] : id;
  const { adventures } = useAdventures();
  const { curiosities } = useCuriosities();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username, bio, country, avatar_url, social_links')
        .eq('id', userId)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    }
    void load();
  }, [userId]);

  const userAdventures = useMemo(
    () => adventures.filter((item) => item.ownerId === userId && item.publicationStatus === 'published'),
    [adventures, userId]
  );
  const userCuriosities = useMemo(
    () => curiosities.filter((item) => item.ownerId === userId && item.status === 'published'),
    [curiosities, userId]
  );
  const socialLinks = parseSocialLinks(profile?.social_links);
  const name = profile?.display_name || profile?.username || 'Aventurier';

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.center}><ActivityIndicator color="#62E6B1" size="large" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹ Retour</Text></Pressable>
        <View style={styles.avatar}>
          {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>}
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.handle}>{profile?.username ? `@${profile.username}` : 'Profil Fragmenta'}</Text>
        {profile?.country ? <Text style={styles.country}>⌖ {profile.country}</Text> : null}
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        {user?.id !== userId ? <Pressable style={styles.reportButton} onPress={() => user ? router.push({ pathname: '/report', params: { type: 'user', id: userId, label: name } }) : router.push('/auth')}><Text style={styles.reportText}>⚑ Signaler cet utilisateur</Text></Pressable> : null}

        {socialLinks.length > 0 ? (
          <View style={styles.socials}>
            {socialLinks.map((link, index) => (
              <Pressable key={`${link.platform}-${index}`} style={styles.social} onPress={() => void Linking.openURL(normalizeSocialUrl(link.url))}>
                <Text style={styles.socialText}>{link.platform}</Text><Text style={styles.socialArrow}>↗</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.stats}>
          <Text style={styles.stat}>{userAdventures.length} aventures</Text>
          <Text style={styles.stat}>{userCuriosities.length} curiosités</Text>
        </View>

        <Text style={styles.sectionTitle}>Aventures</Text>
        {userAdventures.map((item) => (
          <Pressable key={item.id} style={styles.card} onPress={() => router.push({ pathname: '/adventure/[id]', params: { id: item.id } })}>
            {item.images[0] ? <Image source={{ uri: item.images[0] }} style={styles.cardImage} /> : <View style={styles.cardImage} />}
            <View style={styles.cardContent}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardSubtitle}>{item.location}</Text></View><Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
        <Text style={styles.sectionTitle}>Curiosités</Text>
        {userCuriosities.map((item) => (
          <Pressable key={item.id} style={styles.card} onPress={() => router.push({ pathname: '/curiosity/[id]', params: { id: item.id } })}>
            {item.images[0] ? <Image source={{ uri: item.images[0] }} style={styles.cardImage} /> : <View style={styles.cardImage} />}
            <View style={styles.cardContent}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardSubtitle}>{item.locationName}</Text></View><Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071310' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 80 }, back: { alignSelf: 'flex-start', paddingVertical: 8 }, backText: { color: '#62E6B1', fontSize: 15, fontWeight: '800' },
  avatar: { width: 104, height: 104, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 52, overflow: 'hidden', backgroundColor: '#174B3B', borderWidth: 2, borderColor: '#62E6B1', marginTop: 12 },
  avatarImage: { width: '100%', height: '100%' }, avatarText: { color: '#F3FFF9', fontSize: 40, fontWeight: '900' },
  name: { color: '#F3FFF9', fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 16 }, handle: { color: '#62E6B1', textAlign: 'center', marginTop: 5 }, country: { color: '#8FA69B', textAlign: 'center', marginTop: 8 }, bio: { color: '#B7C9C1', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 16 },
  socials: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 }, social: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, borderColor: '#28634F', backgroundColor: '#10251E', paddingHorizontal: 13, paddingVertical: 9 }, socialText: { color: '#DFFFF2', fontSize: 12, fontWeight: '800' }, socialArrow: { color: '#62E6B1', marginLeft: 6 },
  stats: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 24 }, stat: { color: '#B7C9C1', borderRadius: 13, backgroundColor: '#0C1C17', padding: 12 },
  reportButton: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 }, reportText: { color: '#81958C', fontSize: 11, fontWeight: '800' },
  sectionTitle: { color: '#F3FFF9', fontSize: 20, fontWeight: '900', marginTop: 28, marginBottom: 10 }, card: { minHeight: 78, flexDirection: 'row', alignItems: 'center', borderRadius: 17, backgroundColor: '#0C1C17', borderWidth: 1, borderColor: '#19392E', padding: 9, marginBottom: 9 }, cardImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#173D31' }, cardContent: { flex: 1, paddingHorizontal: 12 }, cardTitle: { color: '#F3FFF9', fontSize: 14, fontWeight: '900' }, cardSubtitle: { color: '#81958C', fontSize: 11, marginTop: 5 }, arrow: { color: '#62E6B1', fontSize: 27, paddingRight: 5 },
});
