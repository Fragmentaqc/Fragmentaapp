import { useAuth } from '@/context/auth-context';
import { useAdventures } from '@/context/adventures-context';
import { useCuriosities } from '@/context/curiosities-context';
import { useCollections } from '@/context/collections-context';
import { useFollows } from '@/context/follows-context';
import { supabase } from '@/lib/supabase';
import { normalizeSocialUrl, parseSocialLinks, type SocialLink } from '@/lib/social-links';
import { useFocusEffect } from '@react-navigation/native';
import * as ExpoLinking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, type Region } from 'react-native-maps';

type Profile = {
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: SocialLink[] | null;
  country: string | null;
  cover_url: string | null;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { adventures } = useAdventures();
  const { curiosities } = useCuriosities();
  const { collections, createCollection, deleteCollection } = useCollections();
  const { getCounts } = useFollows();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsModerator(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profileResult = await supabase
        .from('profiles')
        .select('username, display_name, bio, country, avatar_url, cover_url, social_links')
        .eq('id', user.id)
        .maybeSingle();
      const moderatorResult = await supabase.rpc('is_moderator');
      setIsModerator(moderatorResult.data === true);
      setFollowCounts(await getCounts(user.id));

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
  }, [getCounts, user]);

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

  async function resendConfirmation() {
    if (!user?.email || resendingConfirmation) return;
    setResendingConfirmation(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email, options: { emailRedirectTo: ExpoLinking.createURL('/') } });
    setResendingConfirmation(false);
    if (error) Alert.alert('Envoi impossible', error.message);
    else Alert.alert('Courriel envoyé', 'Consulte ta boîte de réception pour confirmer ton adresse.');
  }

  async function handleCreateCollection() {
    if (!newCollectionName.trim() || creatingCollection) return;
    setCreatingCollection(true);
    const id = await createCollection(newCollectionName);
    setCreatingCollection(false);
    if (id) setNewCollectionName('');
    else Alert.alert('Création impossible', 'Vérifie le nom de la collection et réessaie.');
  }

  function confirmDeleteCollection(collectionId: string, name: string) {
    Alert.alert('Supprimer la collection', `Supprimer « ${name} »? Les aventures ne seront pas supprimées.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        if (!await deleteCollection(collectionId)) Alert.alert('Erreur', 'Impossible de supprimer cette collection.');
      } },
    ]);
  }

  const displayName =
    profile?.display_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Aventurier';

  const username = profile?.username?.trim()
    ? `@${profile.username}`
    : 'Profil Fragmenta';

  const initial = displayName.charAt(0).toUpperCase();
  const myAdventures = useMemo(() => user
    ? adventures.filter((adventure) => adventure.ownerId === user.id)
    : [], [adventures, user]);
  const myCuriosities = useMemo(() => user
    ? curiosities.filter((curiosity) => curiosity.ownerId === user.id)
    : [], [curiosities, user]);
  const coverImage = profile?.cover_url || myAdventures.find((adventure) => adventure.images[0])?.images[0];
  const totalDistanceKm = myAdventures.reduce((total, adventure) => total + Number(adventure.distanceKm ?? 0), 0);
  const totalDurationMinutes = myAdventures.reduce((total, adventure) => total + Number(adventure.durationMinutes ?? 0), 0);
  const completedAdventures = myAdventures.filter((adventure) => adventure.status === 'completed').length;
  const longestAdventure = myAdventures.reduce((longest, adventure) => Number(adventure.distanceKm ?? 0) > Number(longest?.distanceKm ?? -1) ? adventure : longest, null as (typeof myAdventures)[number] | null);
  const distanceByProfile = {
    cycling: myAdventures.filter((item) => item.routingProfile === 'cycling').reduce((total, item) => total + Number(item.distanceKm ?? 0), 0),
    walking: myAdventures.filter((item) => item.routingProfile === 'walking').reduce((total, item) => total + Number(item.distanceKm ?? 0), 0),
    driving: myAdventures.filter((item) => item.routingProfile === 'driving').reduce((total, item) => total + Number(item.distanceKm ?? 0), 0),
  };
  const profileMapItems = useMemo(() => [
    ...myAdventures.filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number').map((item) => ({ id: item.id, type: 'adventure' as const, title: item.title, latitude: item.latitude as number, longitude: item.longitude as number })),
    ...myCuriosities.filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number').map((item) => ({ id: item.id, type: 'curiosity' as const, title: item.title, latitude: item.latitude as number, longitude: item.longitude as number })),
  ], [myAdventures, myCuriosities]);
  const profileMapRegion = useMemo<Region>(() => {
    if (profileMapItems.length === 0) return { latitude: 20, longitude: 0, latitudeDelta: 125, longitudeDelta: 180 };
    const latitudes = profileMapItems.map((item) => item.latitude);
    const longitudes = profileMapItems.map((item) => item.longitude);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    return {
      latitude: (minLatitude + maxLatitude) / 2,
      longitude: (minLongitude + maxLongitude) / 2,
      latitudeDelta: Math.max(8, (maxLatitude - minLatitude) * 1.7),
      longitudeDelta: Math.max(8, (maxLongitude - minLongitude) * 1.7),
    };
  }, [profileMapItems]);

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
        <View style={styles.passportHero}>
          {coverImage ? <Image source={{ uri: coverImage }} style={styles.coverImage} /> : <View style={styles.coverFallback}><Text style={styles.coverMark}>F</Text></View>}
          <View style={styles.coverShade} />
          <View style={styles.heroTop}><View><Text style={styles.heroEyebrow}>PASSEPORT D’AVENTURIER</Text><Text style={styles.heroBrand}>FRAGMENTA</Text></View>{user ? <Pressable style={styles.settingsButton} onPress={() => router.push('/edit-profile')}><Text style={styles.settingsIcon}>⚙</Text></Pressable> : null}</View>
          <View style={styles.heroIdentity}>
            <View style={styles.avatar}>{user && profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{user ? initial : '?'}</Text>}</View>
            <View style={styles.identityText}><Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{user ? displayName : 'Bienvenue sur Fragmenta'}</Text><Text style={styles.username} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{user ? username : 'Le réseau des aventures vécues'}</Text>{profile?.country ? <Text style={styles.heroCountry} numberOfLines={1}>⌖ {profile.country}</Text> : null}</View>
          </View>
        </View>

        {user ? <View style={styles.profileIntro}><Text style={profile?.bio ? styles.bio : styles.bioPlaceholder}>{profile?.bio || 'Ajoute une bio pour raconter le genre d’aventures que tu veux vivre.'}</Text><Pressable style={styles.editProfilePill} onPress={() => router.push('/edit-profile')}><Text style={styles.editProfilePillText}>Modifier le profil</Text></Pressable></View> : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statValue}>{myAdventures.length}</Text><Text style={styles.statLabel}>Aventures</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}><Text style={styles.statValue}>{myCuriosities.length}</Text><Text style={styles.statLabel}>Curiosités</Text></View>
          <View style={styles.statDivider} />
          <Pressable style={styles.statCard} onPress={() => user && router.push({ pathname: '/members', params: { mode: 'followers', userId: user.id } } as never)}><Text style={styles.statValue}>{followCounts.followers}</Text><Text style={styles.statLabel}>Abonnés</Text></Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.statCard} onPress={() => user && router.push({ pathname: '/members', params: { mode: 'following', userId: user.id } } as never)}><Text style={styles.statValue}>{followCounts.following}</Text><Text style={styles.statLabel}>Suivis</Text></Pressable>
        </View>

        {user ? <View style={styles.bilanSection}>
          <View style={styles.sectionTitleRow}><View><Text style={styles.libraryEyebrow}>MON BILAN</Text><Text style={styles.aboutTitle}>Vue d’ensemble</Text></View><Text style={styles.bilanYear}>{new Date().getFullYear()}</Text></View>
          <View style={styles.bilanGrid}><BilanMetric value={formatDistance(totalDistanceKm)} label="Distance totale" icon="↝" /><BilanMetric value={formatDuration(totalDurationMinutes)} label="Temps d’activité" icon="◷" /><BilanMetric value={String(completedAdventures)} label="Terminées" icon="✓" /><BilanMetric value={String(myAdventures.length + myCuriosities.length)} label="Activités réalisées" icon="◇" /></View>
          <Text style={styles.breakdownTitle}>Répartition de la distance</Text>
          <DistanceBar label="Vélo" value={distanceByProfile.cycling} total={totalDistanceKm} color="#4DA3FF" />
          <DistanceBar label="Marche" value={distanceByProfile.walking} total={totalDistanceKm} color="#62E6B1" />
          <DistanceBar label="Auto" value={distanceByProfile.driving} total={totalDistanceKm} color="#E9B949" />
          {longestAdventure && longestAdventure.distanceKm > 0 ? <Pressable style={styles.recordCard} onPress={() => router.push({ pathname: '/adventure/[id]', params: { id: longestAdventure.id } })}><View><Text style={styles.recordEyebrow}>RECORD PERSONNEL</Text><Text style={styles.recordTitle} numberOfLines={1}>{longestAdventure.title}</Text></View><Text style={styles.recordDistance}>{formatDistance(longestAdventure.distanceKm)}</Text></Pressable> : <Text style={styles.bilanHelper}>Les distances apparaîtront après le calcul des parcours de tes aventures.</Text>}
        </View> : null}

        {user ? <>
          <View style={styles.pageSectionHeader}><Text style={styles.libraryEyebrow}>TON UNIVERS</Text><Text style={styles.aboutTitle}>Explorer mon parcours</Text></View>
          <View style={styles.profileMapSection}>
            <View style={styles.profileMapHeader}><View><Text style={styles.sectionCardEyebrow}>MA CARTE DU MONDE</Text><Text style={styles.sectionCardTitle}>Mes activités autour du monde</Text></View><Text style={styles.profileMapCount}>{profileMapItems.length}</Text></View>
            <MapView style={styles.profileMap} region={profileMapRegion} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false} toolbarEnabled={false}>
              {profileMapItems.map((item) => <Marker key={`${item.type}-${item.id}`} coordinate={{ latitude: item.latitude, longitude: item.longitude }} title={item.title} pinColor={item.type === 'adventure' ? '#4DA3FF' : '#62E6B1'} onPress={() => router.push(item.type === 'adventure' ? { pathname: '/adventure/[id]', params: { id: item.id } } : { pathname: '/curiosity/[id]', params: { id: item.id } })} />)}
            </MapView>
            <View style={styles.profileMapLegend}><Text style={styles.profileMapLegendText}>● Aventures</Text><Text style={[styles.profileMapLegendText, styles.profileMapLegendCuriosity]}>● Curiosités</Text></View>
            {profileMapItems.length === 0 ? <View style={styles.profileMapEmpty}><Text style={styles.profileMapEmptyTitle}>Ta carte est prête</Text><Text style={styles.profileMapEmptyText}>Les pins apparaîtront dès qu’une de tes activités possède un emplacement.</Text></View> : null}
          </View>
          <View style={styles.aboutSection}><Text style={styles.libraryEyebrow}>À PROPOS</Text><Text style={styles.aboutTitle}>Mon profil d’aventurier</Text><Text style={styles.aboutText}>{profile?.bio || 'Ajoute une bio pour présenter tes passions et tes prochaines aventures.'}</Text>{profile?.country ? <Text style={styles.aboutCountry}>Pays · {profile.country}</Text> : null}{user.email ? <Text style={styles.aboutMeta}>{user.email} · {user.email_confirmed_at ? 'confirmé' : 'à confirmer'}</Text> : null}{!user.email_confirmed_at ? <Pressable onPress={() => void resendConfirmation()} disabled={resendingConfirmation}><Text style={styles.resendText}>{resendingConfirmation ? 'Envoi…' : 'Renvoyer la confirmation'}</Text></Pressable> : null}<Pressable style={styles.discoverButton} onPress={() => router.push('/members' as never)}><Text style={styles.discoverButtonText}>⌕ Découvrir des aventuriers</Text></Pressable></View>
          <View style={styles.sectionIntro}>
            <View style={styles.sectionTitleRow}><View><Text style={styles.libraryEyebrow}>COLLECTIONS</Text><Text style={styles.aboutTitle}>Mes listes d’aventures</Text></View><Text style={styles.collectionCount}>{collections.length}</Text></View>
            <Text style={styles.aboutText}>Crée des listes et range les aventures que tu veux retrouver.</Text>
            <View style={styles.collectionCreateRow}><TextInput value={newCollectionName} onChangeText={setNewCollectionName} placeholder="Nom de la collection" placeholderTextColor="#6F837B" style={styles.collectionInput} maxLength={80} /><Pressable style={styles.collectionCreateButton} onPress={() => void handleCreateCollection()} disabled={creatingCollection}><Text style={styles.collectionCreateText}>{creatingCollection ? '…' : 'Créer'}</Text></Pressable></View>
          </View>
          <View style={styles.sectionItems}>{collections.map((collection) => {
            const collectionAdventures = adventures.filter((adventure) => collection.adventureIds.includes(adventure.id));
            const collectionCuriosities = curiosities.filter((curiosity) => collection.curiosityIds.includes(curiosity.id));
            return <View key={collection.id} style={styles.collectionCard}><View style={styles.collectionCardHeader}><View><Text style={styles.collectionCardTitle}>{collection.name}</Text><Text style={styles.collectionCardMeta}>{collection.adventureIds.length + collection.curiosityIds.length} élément(s)</Text></View><Pressable onPress={() => confirmDeleteCollection(collection.id, collection.name)}><Text style={styles.collectionDelete}>Supprimer</Text></Pressable></View>{collectionAdventures.map((adventure) => <ProfileContentCard key={`${collection.id}-${adventure.id}`} title={adventure.title} subtitle={adventure.location} imageUrl={adventure.images[0]} badge="Aventure" onPress={() => router.push({ pathname: '/adventure/[id]', params: { id: adventure.id } })} />)}{collectionCuriosities.map((curiosity) => <ProfileContentCard key={`${collection.id}-${curiosity.id}`} title={curiosity.title} subtitle={curiosity.locationName || curiosity.address} imageUrl={curiosity.images[0]} badge="Curiosité" onPress={() => router.push({ pathname: '/curiosity/[id]', params: { id: curiosity.id } })} />)}{collectionAdventures.length + collectionCuriosities.length === 0 ? <Text style={styles.emptyLibraryText}>Ajoute une aventure ou une curiosité depuis sa fiche.</Text> : null}</View>;
          })}{collections.length === 0 ? <Text style={styles.emptyLibraryText}>Crée ta première collection ci-dessus.</Text> : null}</View>
          <View style={styles.activityHeader}><Text style={styles.libraryEyebrow}>FIL D’ACTIVITÉ</Text><Text style={styles.aboutTitle}>Mes dernières publications</Text></View>
        </> : null}

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
            {isModerator ? <Pressable style={styles.moderationButton} onPress={() => router.push('/moderation')}><Text style={styles.moderationButtonText}>⚑ Ouvrir la modération</Text></Pressable> : null}
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
            <Pressable style={styles.blockedUsersButton} onPress={() => router.push('/blocked-users')}><Text style={styles.blockedUsersText}>Gérer les comptes bloqués</Text></Pressable>
            <Pressable style={styles.blockedUsersButton} onPress={() => router.push('/export-data')}><Text style={styles.blockedUsersText}>Exporter mes données</Text></Pressable>
            <View style={styles.legalRow}><Pressable onPress={() => router.push({ pathname: '/legal/[document]', params: { document: 'privacy' } })}><Text style={styles.legalText}>Confidentialité</Text></Pressable><Pressable onPress={() => router.push({ pathname: '/legal/[document]', params: { document: 'terms' } })}><Text style={styles.legalText}>Conditions</Text></Pressable></View>
            <Pressable style={styles.deleteAccountButton} onPress={() => router.push('/delete-account')}><Text style={styles.deleteAccountText}>Supprimer mon compte</Text></Pressable>
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

function formatDistance(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k km`;
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} km`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder}` : `${hours} h`;
}

function BilanMetric({ value, label, icon }: { value: string; label: string; icon: string }) {
  return <View style={styles.bilanMetric}><Text style={styles.bilanMetricIcon}>{icon}</Text><Text style={styles.bilanMetricValue}>{value}</Text><Text style={styles.bilanMetricLabel}>{label}</Text></View>;
}

function DistanceBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.min(100, value / total * 100) : 0;
  return <View style={styles.distanceRow}><View style={styles.distanceLabels}><Text style={styles.distanceLabel}>{label}</Text><Text style={styles.distanceValue}>{formatDistance(value)}</Text></View><View style={styles.distanceTrack}><View style={[styles.distanceFill, { width: `${percentage}%`, backgroundColor: color }]} /></View></View>;
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },

  passportHero: { width: '100%', height: 350, overflow: 'hidden', borderRadius: 0, borderWidth: 1, borderColor: '#285345', backgroundColor: '#10251E' },
  coverImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  coverFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end', justifyContent: 'center', backgroundColor: '#12382D' },
  coverMark: { color: 'rgba(98,230,177,0.08)', fontSize: 260, fontWeight: '900', marginRight: -20 },
  coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,12,9,0.52)' },
  heroTop: { position: 'absolute', top: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroEyebrow: { color: '#8EF0C5', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  heroBrand: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 2.5, marginTop: 5 },
  heroIdentity: { position: 'absolute', left: 20, right: 20, bottom: 20, alignItems: 'flex-start' },
  identityText: { width: '100%', marginTop: 13 },
  heroCountry: { color: '#C4D9D0', fontSize: 11, fontWeight: '700', marginTop: 7 },
  profileIntro: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, marginTop: 16 },
  editProfilePill: { borderRadius: 0, borderWidth: 1, borderColor: '#28634F', paddingHorizontal: 13, paddingVertical: 9 },
  editProfilePillText: { color: '#62E6B1', fontSize: 10, fontWeight: '900' },
  statDivider: { width: 1, height: 30, backgroundColor: '#24483B', alignSelf: 'center' },
  profileNav: { width: '100%', flexDirection: 'row', borderRadius: 0, borderWidth: 1, borderColor: '#19392E', backgroundColor: '#0C1C17', padding: 6, marginTop: 18 },
  navItem: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 0},
  navItemActive: { backgroundColor: '#173D31' },
  navIcon: { color: '#62E6B1', fontSize: 18 },
  navLabel: { color: '#71877D', fontSize: 9, fontWeight: '800', marginTop: 5 },
  navLabelActive: { color: '#E4FFF4' },
  aboutMeta: { color: '#81958C', fontSize: 11, marginTop: 10 },
  discoverButton: { alignSelf: 'flex-start', borderRadius: 0, backgroundColor: '#173D31', paddingHorizontal: 15, paddingVertical: 10, marginTop: 15 },
  discoverButtonText: { color: '#62E6B1', fontSize: 11, fontWeight: '900' },
  sectionIntro: { width: '100%', borderRadius: 0, borderWidth: 1, borderColor: '#19392E', backgroundColor: '#0C1C17', padding: 18, marginTop: 22 },
  pageSectionHeader: { width: '100%', marginTop: 27, marginBottom: 12 },
  profileMapSection: { width: '100%', borderWidth: 1, borderColor: '#2B6552', backgroundColor: '#10251E', overflow: 'hidden' },
  profileMapHeader: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  profileMapCount: { minWidth: 38, height: 38, color: '#071310', fontSize: 13, fontWeight: '900', lineHeight: 38, textAlign: 'center', backgroundColor: '#62E6B1', overflow: 'hidden' },
  profileMap: { width: '100%', height: 280 },
  profileMapLegend: { flexDirection: 'row', gap: 18, paddingHorizontal: 14, paddingVertical: 12 },
  profileMapLegendText: { color: '#4DA3FF', fontSize: 10, fontWeight: '900' },
  profileMapLegendCuriosity: { color: '#62E6B1' },
  profileMapEmpty: { position: 'absolute', left: 18, right: 18, top: 155, backgroundColor: 'rgba(7,19,16,.88)', padding: 16 },
  profileMapEmptyTitle: { color: '#F3FFF9', fontSize: 15, fontWeight: '900' },
  profileMapEmptyText: { color: '#9CB0A7', fontSize: 11, lineHeight: 16, marginTop: 5 },
  sectionGlyph: { width: 58, height: 78, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#173D31' },
  sectionGlyphText: { color: '#62E6B1', fontSize: 31, fontWeight: '900' },
  sectionCardContent: { flex: 1, marginLeft: 14 },
  sectionCardEyebrow: { color: '#62E6B1', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  sectionCardTitle: { color: '#F3FFF9', fontSize: 17, fontWeight: '900', marginTop: 5 },
  sectionCardText: { color: '#8FA69B', fontSize: 11, lineHeight: 16, marginTop: 5 },
  sectionArrow: { color: '#62E6B1', fontSize: 30, marginLeft: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collectionCount: { minWidth: 42, height: 42, color: '#071310', fontSize: 14, fontWeight: '900', lineHeight: 42, textAlign: 'center', borderRadius: 0, backgroundColor: '#62E6B1', overflow: 'hidden' },
  sectionItems: { width: '100%', marginTop: 10 },
  collectionCreateRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  collectionInput: { flex: 1, height: 46, color: '#F3FFF9', borderWidth: 1, borderColor: '#386B59', paddingHorizontal: 12 },
  collectionCreateButton: { height: 46, justifyContent: 'center', backgroundColor: '#62E6B1', paddingHorizontal: 16 },
  collectionCreateText: { color: '#071310', fontSize: 12, fontWeight: '900' },
  collectionCard: { width: '100%', borderWidth: 1, borderColor: '#214337', backgroundColor: '#0C1C17', padding: 14, marginBottom: 10 },
  collectionCardHeader: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collectionCardTitle: { color: '#F3FFF9', fontSize: 17, fontWeight: '900' },
  collectionCardMeta: { color: '#789086', fontSize: 10, marginTop: 4 },
  collectionDelete: { color: '#E89891', fontSize: 10, fontWeight: '800' },
  bilanSection: { width: '100%', borderRadius: 0, borderWidth: 1, borderColor: '#285345', backgroundColor: '#10251E', padding: 18, marginTop: 18 },
  bilanYear: { color: '#62E6B1', fontSize: 13, fontWeight: '900', borderRadius: 0, backgroundColor: '#173D31', paddingHorizontal: 11, paddingVertical: 7 },
  bilanGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 17 },
  bilanMetric: { width: '48%', minHeight: 112, borderRadius: 0, borderWidth: 1, borderColor: '#21483B', backgroundColor: '#0C1C17', padding: 14 },
  bilanMetricIcon: { color: '#62E6B1', fontSize: 18, fontWeight: '900' }, bilanMetricValue: { color: '#F3FFF9', fontSize: 22, fontWeight: '900', marginTop: 9 }, bilanMetricLabel: { color: '#81958C', fontSize: 10, marginTop: 4 },
  breakdownTitle: { color: '#DFFFF2', fontSize: 13, fontWeight: '900', marginTop: 22, marginBottom: 3 },
  distanceRow: { marginTop: 12 }, distanceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }, distanceLabel: { color: '#B7C9C1', fontSize: 11, fontWeight: '800' }, distanceValue: { color: '#81958C', fontSize: 10, fontWeight: '700' }, distanceTrack: { height: 7, overflow: 'hidden', borderRadius: 0, backgroundColor: '#071310' }, distanceFill: { height: '100%', borderRadius: 0},
  recordCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 0, backgroundColor: '#173D31', padding: 14, marginTop: 19 }, recordEyebrow: { color: '#62E6B1', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, recordTitle: { maxWidth: 190, color: '#F3FFF9', fontSize: 13, fontWeight: '900', marginTop: 4 }, recordDistance: { color: '#62E6B1', fontSize: 16, fontWeight: '900' }, bilanHelper: { color: '#71877D', fontSize: 10, lineHeight: 15, marginTop: 17 },

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
    width: 84,
    height: 84,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#174B3B',
    borderWidth: 3,
    borderColor: '#62E6B1',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: '#F3FFF9',
    fontSize: 32,
    fontWeight: '900',
  },

  title: {
    color: '#F3FFF9',
    fontSize: 25,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 8,
  },

  username: {
    color: '#62E6B1',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
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
    flex: 1,
  },

  bioPlaceholder: {
    color: '#6F8279',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  statsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    paddingVertical: 15,
    marginTop: 16,
  },

  statCard: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    color: '#F3FFF9',
    fontSize: 20,
    fontWeight: '900',
  },

  statLabel: {
    color: '#8FA69B',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },

  followingRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  followingCard: { flex: 1, alignItems: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#19392E', backgroundColor: '#10251E', padding: 13 },
  followingValue: { color: '#62E6B1', fontSize: 18, fontWeight: '900' },
  followingLabel: { color: '#8FA69B', fontSize: 11, marginTop: 3 },
  findMembersButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#28634F', backgroundColor: '#10251E', padding: 15, marginTop: 12 },
  findMembersIcon: { color: '#62E6B1', fontSize: 30 }, findMembersContent: { flex: 1, marginLeft: 12 }, findMembersTitle: { color: '#F3FFF9', fontSize: 15, fontWeight: '900' }, findMembersText: { color: '#81958C', fontSize: 11, marginTop: 4 }, findMembersArrow: { color: '#62E6B1', fontSize: 28 },
  aboutSection: { borderRadius: 0, backgroundColor: '#0C1C17', padding: 18, marginTop: 22 }, aboutTitle: { color: '#F3FFF9', fontSize: 19, fontWeight: '900', marginTop: 6 }, aboutText: { color: '#B7C9C1', lineHeight: 20, marginTop: 9 }, aboutCountry: { color: '#62E6B1', fontSize: 12, fontWeight: '800', marginTop: 10 }, activityHeader: { marginTop: 26, marginBottom: -8 },
  settingsButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#173D31' },
  settingsIcon: { color: '#62E6B1', fontSize: 19 },
  socialLinks: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
  socialLink: { flexDirection: 'row', alignItems: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#28634F', backgroundColor: '#10251E', paddingHorizontal: 13, paddingVertical: 9 },
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 10,
    marginBottom: 10,
  },

  contentImage: {
    width: 66,
    height: 66,
    borderRadius: 0,
  },

  contentImageFallback: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#19392E',
    padding: 18,
  },

  primaryButton: {
    width: '100%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
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
    borderRadius: 0,
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
    borderRadius: 0,
    backgroundColor: '#62E6B1',
    marginTop: 30,
  },
  moderationButton: { width: '100%', minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#E9B949', backgroundColor: '#211D0E', marginTop: 30 },
  moderationButtonText: { color: '#E9B949', fontSize: 14, fontWeight: '900' },

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
    borderRadius: 0,
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
  deleteAccountButton: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  deleteAccountText: { color: '#B77A7A', fontSize: 12, fontWeight: '800' },
  blockedUsersButton: { width: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  blockedUsersText: { color: '#8FA69B', fontSize: 12, fontWeight: '800' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 12 },
  legalText: { color: '#62E6B1', fontSize: 11, fontWeight: '800', textDecorationLine: 'underline' },
  emailStatus: { alignSelf: 'center', borderRadius: 0, backgroundColor: '#2A2412', paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  emailStatusConfirmed: { backgroundColor: '#173D31' },
  emailStatusText: { color: '#E9B949', fontSize: 9, fontWeight: '900' },
  emailStatusTextConfirmed: { color: '#62E6B1' },
  resendText: { color: '#8FA69B', fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 8, textDecorationLine: 'underline' },

  quoteCard: {
    width: '100%',
    backgroundColor: '#0C1C17',
    borderWidth: 1,
    borderColor: '#19392E',
    borderRadius: 0,
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
