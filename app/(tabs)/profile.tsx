import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [adventureCount, setAdventureCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setAdventureCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profileResult = await supabase
        .from('profiles')
        .select('username, display_name, bio, avatar_url')
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

      const adventuresResult = await supabase
        .from('adventures')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('owner_id', user.id);

      if (adventuresResult.error) {
        console.error(
          'Erreur de comptage des aventures :',
          adventuresResult.error.message
        );
      } else {
        setAdventureCount(adventuresResult.count ?? 0);
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
            setAdventureCount(0);
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
              {user ? adventureCount : 0}
            </Text>
            <Text style={styles.statLabel}>Aventures</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Fragments</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Abonnés</Text>
          </View>
        </View>

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