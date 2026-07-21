import { useAuth } from '@/context/auth-context';
import { useAdventures } from '@/context/adventures-context';
import { useCuriosities } from '@/context/curiosities-context';
import { useFavorites } from '@/context/favorites-context';
import { supabase } from '@/lib/supabase';
import { normalizeSocialUrl, parseSocialLinks, type SocialLink } from '@/lib/social-links';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Profile = {
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: SocialLink[] | null;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { adventures } = useAdventures();
  const { curiosities } = useCuriosities();
  const { adventureIds: favoriteAdventureIds, curiosityIds: favoriteCuriosityIds } = useFavorites();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profileResult = await supabase
        .from('profiles')
        .select('username, display_name, bio, avatar_url, social_links')
        .eq('id', user.id)
        .maybeSingle();

      if (profileResult.error) {
        console.error(
          'Erreur de chargement du profil :',
          profileResult.error.message
        );
      } else {
        setProfile(profileResult.data);
      }

    } catch (error) {
      console.error('Erreur inattendue du profil :', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  function handleSignOut() {
    Alert.alert(
      'Se déconnecter',
      'Veux-tu vraiment te déconnecter de Fragmenta?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            setProfile(null);
          },
        },
      ]
    );
  }

  const displayName =
    profile?.display_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Aventurier';

  const username = profile?.username?.trim()
    ? `@${profile.username}`
    : 'Profil Fragmenta';

  const initial = displayName.charAt(0).toUpperCase();
  const myAdventures = user
    ? adventures.filter((adventure) => adventure.ownerId === user.id)
    : [];
  const myCuriosities = user
    ? curiosities.filter((curiosity) => curiosity.ownerId === user.id)
    : [];
  const favoriteAdventures = adventures.filter((adventure) => favoriteAdventureIds.includes(adventure.id));
  const favoriteCuriosities = curiosities.filter((curiosity) => favoriteCuriosityIds.includes(curiosity.id));

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#62E6B1" />

          <Text style={styles.loadingText}>
            Chargement du profil…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topLabel}>
          <Text style={styles.brand}>FRAGMENTA</Text>
          <Text style={styles.sectionLabel}>PROFIL</Text>
          {user ? (
            <Pressable style={styles.settingsButton} onPress={() => router.push('/edit-profile')}>
              <Text style={styles.settingsIcon}>⚙</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.avatar}>
          {user && profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>
              {user ? initial : '?'}
            </Text>
          )}
        </View>

        <Text style={styles.title}>
          {user ? displayName : 'Bienvenue sur Fragmenta'}
        </Text>

        <Text style={styles.username}>
          {user
            ? username
            : 'Le réseau social des aventures vécues'}
        </Text>

        {user?.email ? (
          <Text style={styles.email}>{user.email}</Text>
        ) : null}

        {user ? (
          profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>
              Ajoute une bio pour raconter le genre d’aventures
              que tu veux vivre.
            </Text>
          )
        ) : (
          <Text style={styles.bioPlaceholder}>
            Crée ton compte pour publier tes aventures et raconter
            chaque fragment de ton histoire.
          </Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {myAdventures.length}
            </Text>
            <Text style={styles.statLabel}>Aventures</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{myCuriosities.length}</Text>
            <Text style={styles.statLabel}>Curiosités</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Abonnés</Text>
          </View>
        </View>

        {user ? (
          <View style={styles.library}>
            <View style={styles.libraryHeader}>
              <View>
                <Text style={styles.libraryEyebrow}>MA COLLECTION</Text>
                <Text style={styles.libraryTitle}>{"Mes aventures"}</Text>
              </View>
              <Text style={styles.libraryCount}>{myAdventures.length}</Text>
            </View>

            {myAdventures.length > 0 ? (
              myAdventures.map((adventure) => (
                <ProfileContentCard
                  key={adventure.id}
                  title={adventure.title}
                  subtitle={adventure.location}
                  imageUrl={adventure.images[0]}
                  badge={
                    adventure.publicationStatus === 'draft'
                      ? 'Brouillon'
                      : adventure.status
                  }
                  onPress={() =>
                    router.push({
                      pathname: '/adventure/[id]',
                      params: { id: adventure.id },
                    })
                  }
                />
              ))
            ) : (
              <Text style={styles.emptyLibraryText}>
                {"Aucune aventure publiée pour le moment."}
              </Text>
            )}

            <View style={[styles.libraryHeader, styles.curiosityHeader]}>
              <View>
                <Text style={styles.libraryEyebrow}>MES DÉCOUVERTES</Text>
                <Text style={styles.libraryTitle}>{"Mes curiosités"}</Text>
              </View>
              <Text style={styles.libraryCount}>{myCuriosities.length}</Text>
            </View>

            {myCuriosities.length > 0 ? (
              myCuriosities.map((curiosity) => (
                <ProfileContentCard
                  key={curiosity.id}
                  title={curiosity.title}
                  subtitle={curiosity.locationName || curiosity.address}
                  imageUrl={curiosity.images[0]}
                  badge={curiosity.verificationStatus}
                  onPress={() =>
                    router.push({
                      pathname: '/curiosity/[id]',
                      params: { id: curiosity.id },
                    })
                  }
                />
              ))
            ) : (
              <Text style={styles.emptyLibraryText}>
                {"Aucune curiosité publiée pour le moment."}
              </Text>
            )}

            <View style={[styles.libraryHeader, styles.curiosityHeader]}>
              <View><Text style={styles.libraryEyebrow}>ENREGISTRÉS</Text><Text style={styles.libraryTitle}>Mes favoris</Text></View>
              <Text style={styles.libraryCount}>{favoriteAdventures.length + favoriteCuriosities.length}</Text>
            </View>
            {favoriteAdventures.map((adventure) => <ProfileContentCard key={`favorite-adventure-${adventure.id}`} title={adventure.title} subtitle={adventure.location} imageUrl={adventure.images[0]} badge="Aventure" onPress={() => router.push({ pathname: '/adventure/[id]', params: { id: adventure.id } })} />)}
            {favoriteCuriosities.map((curiosity) => <ProfileContentCard key={`favorite-curiosity-${curiosity.id}`} title={curiosity.title} subtitle={curiosity.locationName || curiosity.address} imageUrl={curiosity.images[0]} badge="Curiosité" onPress={() => router.push({ pathname: '/curiosity/[id]', params: { id: curiosity.id } })} />)}
            {favoriteAdventures.length + favoriteCuriosities.length === 0 ? <Text style={styles.emptyLibraryText}>Aucun favori enregistré pour le moment.</Text> : null}
          </View>
        ) : null}

        {user && parseSocialLinks(profile?.social_links).length > 0 ? (
          <View style={styles.socialLinks}>
            {parseSocialLinks(profile?.social_links).map((link, index) => (
              <Pressable
                key={`${link.platform}-${index}`}
                style={styles.socialLink}
                onPress={() => void Linking.openURL(normalizeSocialUrl(link.url))}
              >
                <Text style={styles.socialLinkText}>{link.platform}</Text>
                <Text style={styles.socialLinkArrow}>↗</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {user ? (
          <>
            <Pressable
              style={styles.editButton}
              onPress={() => router.push('/edit-profile')}
            >
              <Text style={styles.editButtonText}>
                Modifier mon profil
              </Text>
            </Pressable>

            <Pressable
              style={styles.logoutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.logoutButtonText}>
                Se déconnecter
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.primaryButtonText}>
                Créer un compte
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.secondaryButtonText}>
                Me connecter
              </Text>
            </Pressable>
          </>
        )}

        <View style={styles.quoteCard}>
          <Text style={styles.quote}>
            Sortez du trajet prévu.
          </Text>

          <Text style={styles.quoteDescription}>
            Chaque aventure devient une histoire. Chaque moment
            devient un fragment.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileContentCard({
  title,
  subtitle,
  imageUrl,
  badge,
  onPress,
}: {
  title: string;
  subtitle: string;
  imageUrl?: string;
  badge: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.contentCard} onPress={onPress}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.contentImage} />
      ) : (
        <View style={styles.contentImageFallback}>
          <Text style={styles.contentImageFallbackText}>⌖</Text>
        </View>
      )}
      <View style={styles.contentInfo}>
        <Text style={styles.contentBadge}>{badge.toUpperCase()}</Text>
        <Text style={styles.contentTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.contentSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={styles.contentArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#071310',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#8FA69B',
    fontSize: 14,
    marginTop: 14,
  },

  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },

  topLabel: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  brand: {
    color: '#F3FFF9',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },

  sectionLabel: {
    color: '#62E6B1',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#174B3B',
    borderWidth: 2,
    borderColor: '#62E6B1',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: '#F3FFF9',
    fontSize: 40,
    fontWeight: '900',
  },

  title: {
    color: '#F3FFF9',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
  },

  username: {
    color: '#62E6B1',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 7,
    textAlign: 'center',
  },

  email: {
    color: '#7F968B',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },

  bio: {
    color: '#B7C9C1',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 14,
  },

  bioPlaceholder: {
    color: '#6F8279',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 20,
  },

  statsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 30,
  },

  statCard: {
    flex: 1,
    minHeight: 102,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C1C17',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#19392E',
  },

  statValue: {
    color: '#F3FFF9',
    fontSize: 25,
    fontWeight: '900',
  },

  statLabel: {
    color: '#8FA69B',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  settingsButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#173D31' },
  settingsIcon: { color: '#62E6B1', fontSize: 19 },
  socialLinks: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
  socialLink: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#28634F', backgroundColor: '#10251E', paddingHorizontal: 13, paddingVertical: 9 },
  socialLinkText: { color: '#DFFFF2', fontSize: 12, fontWeight: '800' },
  socialLinkArrow: { color: '#62E6B1', fontSize: 13, marginLeft: 6 },

  library: {
    width: '100%',
    marginTop: 30,
  },

  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  curiosityHeader: {
    marginTop: 28,
  },

  libraryEyebrow: {
    color: '#62E6B1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  libraryTitle: {
    color: '#F3FFF9',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },

  libraryCount: {
    color: '#8FA69B',
    fontSize: 14,
    fontWeight: '800',
  },

  contentCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 10,
    marginBottom: 10,
  },

  contentImage: {
    width: 66,
    height: 66,
    borderRadius: 13,
  },

  contentImageFallback: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#173D31',
  },

  contentImageFallbackText: {
    color: '#62E6B1',
    fontSize: 23,
  },

  contentInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },

  contentBadge: {
    color: '#62E6B1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  contentTitle: {
    color: '#F3FFF9',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },

  contentSubtitle: {
    color: '#81958C',
    fontSize: 11,
    marginTop: 4,
  },

  contentArrow: {
    color: '#62E6B1',
    fontSize: 27,
    paddingRight: 5,
  },

  emptyLibraryText: {
    color: '#6F8279',
    fontSize: 13,
    lineHeight: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#19392E',
    padding: 18,
  },

  primaryButton: {
    width: '100%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#62E6B1',
    marginTop: 30,
  },

  primaryButtonText: {
    color: '#071310',
    fontSize: 15,
    fontWeight: '900',
  },

  secondaryButton: {
    width: '100%',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#386B59',
    backgroundColor: '#10251E',
    marginTop: 12,
  },

  secondaryButtonText: {
    color: '#DFFFF2',
    fontSize: 15,
    fontWeight: '800',
  },

  editButton: {
    width: '100%',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#62E6B1',
    marginTop: 30,
  },

  editButtonText: {
    color: '#071310',
    fontSize: 15,
    fontWeight: '900',
  },

  logoutButton: {
    width: '100%',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#7B3535',
    backgroundColor: '#261414',
    marginTop: 12,
  },

  logoutButtonText: {
    color: '#FFB8B8',
    fontSize: 15,
    fontWeight: '800',
  },

  quoteCard: {
    width: '100%',
    backgroundColor: '#0C1C17',
    borderWidth: 1,
    borderColor: '#19392E',
    borderRadius: 20,
    padding: 20,
    marginTop: 28,
  },

  quote: {
    color: '#62E6B1',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },

  quoteDescription: {
    color: '#7F968B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});
