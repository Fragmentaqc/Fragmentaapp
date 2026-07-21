import { useAdventures } from '@/context/adventures-context';
import { useCuriosities } from '@/context/curiosities-context';
import { useAuth } from '@/context/auth-context';
import { useBlocks } from '@/context/blocks-context';
import { useFollows } from '@/context/follows-context';
import { normalizeSocialUrl, parseSocialLinks, type SocialLink } from '@/lib/social-links';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const { blockedUserIds, hiddenUserIds, blockUser, unblockUser } = useBlocks();
  const { followingIds, toggleFollow, getCounts } = useFollows();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    async function load() {
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username, bio, country, avatar_url, social_links')
        .eq('id', userId)
        .maybeSingle();
      setProfile(data);
      setCounts(await getCounts(userId));
      setLoading(false);
    }
    void load();
  }, [getCounts, userId]);

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
  const isBlocked = Boolean(userId && blockedUserIds.includes(userId));
  const isHidden = Boolean(userId && hiddenUserIds.includes(userId));
  const isFollowing = followingIds.includes(userId);
  const coverImage = userAdventures.find((item) => item.images[0])?.images[0];

  function confirmBlock() {
    if (!user) { router.push('/auth'); return; }
    Alert.alert('Bloquer cet utilisateur?', 'Vous ne verrez plus vos profils, publications et interactions respectifs.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Bloquer', style: 'destructive', onPress: () => void blockUser(userId).then((success) => { if (success) router.back(); }) },
    ]);
  }

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.center}><ActivityIndicator color="#62E6B1" size="large" /></View></SafeAreaView>;
  }

  if (isHidden) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.hiddenContainer}><Text style={styles.hiddenTitle}>Profil indisponible</Text><Text style={styles.hiddenText}>Ce profil et ses publications ne sont pas visibles.</Text>{isBlocked ? <Pressable style={styles.unblockButton} onPress={() => void unblockUser(userId)}><Text style={styles.unblockText}>Débloquer</Text></Pressable> : null}<Pressable onPress={() => router.back()}><Text style={styles.backText}>Retour</Text></Pressable></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹ Retour</Text></Pressable>
        <View style={styles.publicHero}>
          {coverImage ? <Image source={{ uri: coverImage }} style={styles.publicCover} /> : <View style={styles.publicCoverFallback}><Text style={styles.coverLetter}>F</Text></View>}
          <View style={styles.publicShade} />
          <Text style={styles.passportLabel}>PASSEPORT D’AVENTURIER</Text>
          <View style={styles.avatar}>
            {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>}
          </View>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.handle}>{profile?.username ? `@${profile.username}` : 'Profil Fragmenta'}</Text>
        {profile?.country ? <Text style={styles.country}>⌖ {profile.country}</Text> : null}
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        {user?.id !== userId ? <Pressable style={[styles.followButton, isFollowing && styles.followingButton]} onPress={() => user ? void toggleFollow(userId).then((success) => { if (success) setCounts((current) => ({ ...current, followers: Math.max(0, current.followers + (isFollowing ? -1 : 1)) })); }) : router.push('/auth')}><Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>{isFollowing ? 'Abonné' : 'Suivre'}</Text></Pressable> : null}
        {user?.id !== userId ? <View style={styles.safetyActions}><Pressable style={styles.reportButton} onPress={() => user ? router.push({ pathname: '/report', params: { type: 'user', id: userId, label: name } }) : router.push('/auth')}><Text style={styles.reportText}>⚑ Signaler</Text></Pressable><Pressable style={styles.reportButton} onPress={confirmBlock}><Text style={styles.blockText}>Bloquer</Text></Pressable></View> : null}

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

        <View style={styles.socialStats}>
          <Pressable onPress={() => router.push({ pathname: '/members', params: { mode: 'followers', userId } } as never)}><Text style={styles.socialStatValue}>{counts.followers}</Text><Text style={styles.socialStatLabel}>Abonnés</Text></Pressable>
          <Pressable onPress={() => router.push({ pathname: '/members', params: { mode: 'following', userId } } as never)}><Text style={styles.socialStatValue}>{counts.following}</Text><Text style={styles.socialStatLabel}>Abonnements</Text></Pressable>
        </View>

        <View style={styles.aboutCard}><Text style={styles.sectionTitle}>À propos</Text><Text style={styles.aboutText}>{profile?.bio || 'Ce membre n’a pas encore ajouté de présentation.'}</Text>{profile?.country ? <Text style={styles.aboutMeta}>Pays · {profile.country}</Text> : null}</View>
        <Text style={styles.sectionTitle}>Fil d’activité</Text>

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
  hiddenContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }, hiddenTitle: { color: '#F3FFF9', fontSize: 24, fontWeight: '900' }, hiddenText: { color: '#8FA69B', textAlign: 'center' }, unblockButton: { borderRadius: 15, backgroundColor: '#174B3B', paddingHorizontal: 20, paddingVertical: 12 }, unblockText: { color: '#62E6B1', fontWeight: '900' },
  container: { padding: 20, paddingBottom: 80 }, back: { alignSelf: 'flex-start', paddingVertical: 8 }, backText: { color: '#62E6B1', fontSize: 15, fontWeight: '800' },
  publicHero: { height: 270, overflow: 'hidden', borderRadius: 25, borderWidth: 1, borderColor: '#285345', backgroundColor: '#12382D', marginTop: 10 }, publicCover: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }, publicCoverFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end', justifyContent: 'center' }, coverLetter: { color: 'rgba(98,230,177,0.08)', fontSize: 210, fontWeight: '900', marginRight: -10 }, publicShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,12,9,0.48)' }, passportLabel: { position: 'absolute', top: 18, left: 18, color: '#8EF0C5', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  avatar: { position: 'absolute', left: 18, bottom: 18, width: 94, height: 94, alignItems: 'center', justifyContent: 'center', borderRadius: 47, overflow: 'hidden', backgroundColor: '#174B3B', borderWidth: 3, borderColor: '#62E6B1' },
  avatarImage: { width: '100%', height: '100%' }, avatarText: { color: '#F3FFF9', fontSize: 40, fontWeight: '900' },
  name: { color: '#F3FFF9', fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 16 }, handle: { color: '#62E6B1', textAlign: 'center', marginTop: 5 }, country: { color: '#8FA69B', textAlign: 'center', marginTop: 8 }, bio: { color: '#B7C9C1', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 16 },
  socials: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 }, social: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, borderColor: '#28634F', backgroundColor: '#10251E', paddingHorizontal: 13, paddingVertical: 9 }, socialText: { color: '#DFFFF2', fontSize: 12, fontWeight: '800' }, socialArrow: { color: '#62E6B1', marginLeft: 6 },
  stats: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 24 }, stat: { color: '#B7C9C1', borderRadius: 13, backgroundColor: '#0C1C17', padding: 12 },
  followButton: { alignSelf: 'center', borderRadius: 10, backgroundColor: '#62E6B1', paddingHorizontal: 30, paddingVertical: 12, marginTop: 18 }, followingButton: { backgroundColor: '#173D31' }, followButtonText: { color: '#071310', fontWeight: '900' }, followingButtonText: { color: '#62E6B1' },
  socialStats: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 14 }, socialStatValue: { color: '#F3FFF9', fontSize: 20, fontWeight: '900', textAlign: 'center' }, socialStatLabel: { color: '#81958C', fontSize: 11, marginTop: 3 }, aboutCard: { borderRadius: 14, backgroundColor: '#0C1C17', padding: 18, marginTop: 24 }, aboutText: { color: '#B7C9C1', lineHeight: 21, marginTop: 8 }, aboutMeta: { color: '#62E6B1', fontSize: 12, fontWeight: '800', marginTop: 12 },
  safetyActions: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }, reportButton: { paddingHorizontal: 14, paddingVertical: 10 }, reportText: { color: '#81958C', fontSize: 11, fontWeight: '800' }, blockText: { color: '#B77A7A', fontSize: 11, fontWeight: '800' },
  sectionTitle: { color: '#F3FFF9', fontSize: 20, fontWeight: '900', marginTop: 28, marginBottom: 10 }, card: { minHeight: 78, flexDirection: 'row', alignItems: 'center', borderRadius: 17, backgroundColor: '#0C1C17', borderWidth: 1, borderColor: '#19392E', padding: 9, marginBottom: 9 }, cardImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#173D31' }, cardContent: { flex: 1, paddingHorizontal: 12 }, cardTitle: { color: '#F3FFF9', fontSize: 14, fontWeight: '900' }, cardSubtitle: { color: '#81958C', fontSize: 11, marginTop: 5 }, arrow: { color: '#62E6B1', fontSize: 27, paddingRight: 5 },
});
