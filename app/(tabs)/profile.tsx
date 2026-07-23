import { useAuth } from '@/context/auth-context';
import { useAdventures } from '@/context/adventures-context';
import { useCuriosities } from '@/context/curiosities-context';
import { useCollections } from '@/context/collections-context';
import { useFollows } from '@/context/follows-context';
import { SocialLinksRow } from '@/components/social-links-row';
import { supabase } from '@/lib/supabase';
import { parseSocialLinks, type SocialLink } from '@/lib/social-links';
import { useFocusEffect } from '@react-navigation/native';
import * as ExpoLinking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  const [profileMapFilter, setProfileMapFilter] = useState<'all' | 'adventure' | 'curiosity'>('all');

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
  const visibleProfileMapItems = useMemo(() => profileMapFilter === 'all'
    ? profileMapItems
    : profileMapItems.filter((item) => item.type === profileMapFilter), [profileMapFilter, profileMapItems]);
  const profileMapRegion = useMemo<Region>(() => {
    if (visibleProfileMapItems.length === 0) return { latitude: 20, longitude: 0, latitudeDelta: 125, longitudeDelta: 180 };
    const latitudes = visibleProfileMapItems.map((item) => item.latitude);
    const longitudes = visibleProfileMapItems.map((item) => item.longitude);
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
  }, [visibleProfileMapItems]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B86F4B" />

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
        nestedScrollEnabled
      >
        <View style={styles.passportHero}>
          {coverImage ? <Image source={{ uri: coverImage }} style={styles.coverImage} /> : <View style={styles.coverFallback}><Text style={styles.coverMark}>F</Text></View>}
          <View style={styles.coverShade} />
          <View style={styles.heroTop}>{user ? <Pressable style={styles.settingsButton} onPress={() => router.push('/edit-profile')} accessibilityLabel="Modifier le profil"><Text style={styles.settingsIcon}>⚙</Text></Pressable> : null}</View>
          <View style={styles.heroIdentity}>
            <View style={styles.avatar}>{user && profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{user ? initial : '?'}</Text>}</View>
            <View style={styles.identityText}><Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{user ? displayName : 'Bienvenue sur Fragmenta'}</Text><Text style={styles.username} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{user ? username : 'Le réseau des aventures vécues'}</Text>{profile?.country ? <Text style={styles.heroCountry} numberOfLines={1}>⌖ {profile.country}</Text> : null}</View>
          </View>
        </View>

        <SocialLinksRow links={parseSocialLinks(profile?.social_links)} />

        {user && profile?.bio ? <View style={styles.profileIntro}><Text style={styles.bio}>{profile.bio}</Text></View> : null}

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
          <DistanceBar label="Vélo" value={distanceByProfile.cycling} total={totalDistanceKm} color="#5B879D" />
          <DistanceBar label="Marche" value={distanceByProfile.walking} total={totalDistanceKm} color="#B86F4B" />
          <DistanceBar label="Auto" value={distanceByProfile.driving} total={totalDistanceKm} color="#C58A62" />
          {longestAdventure && longestAdventure.distanceKm > 0 ? <Pressable style={styles.recordCard} onPress={() => router.push({ pathname: '/adventure/[id]', params: { id: longestAdventure.id } })}><View><Text style={styles.recordEyebrow}>RECORD PERSONNEL</Text><Text style={styles.recordTitle} numberOfLines={1}>{longestAdventure.title}</Text></View><Text style={styles.recordDistance}>{formatDistance(longestAdventure.distanceKm)}</Text></Pressable> : <Text style={styles.bilanHelper}>Les distances apparaîtront après le calcul des parcours de tes aventures.</Text>}
        </View> : null}

        {user ? <>
          <View style={styles.pageSectionHeader}><View><Text style={styles.libraryEyebrow}>TON UNIVERS</Text><Text style={styles.aboutTitle}>Explorer mon parcours</Text></View><Text style={styles.routeActivityCount}>{visibleProfileMapItems.length} {visibleProfileMapItems.length === 1 ? 'activité' : 'activités'}</Text></View>
          <View style={styles.profileMapSection}>
            <View style={styles.profileMapHeader}><View><Text style={styles.sectionCardEyebrow}>MA CARTE DU MONDE</Text><Text style={styles.sectionCardTitle}>Mes activités autour du monde</Text></View></View>
            <MapView key={`profile-map-${profileMapFilter}-${visibleProfileMapItems.length}`} style={styles.profileMap} initialRegion={profileMapRegion} scrollEnabled zoomEnabled zoomControlEnabled rotateEnabled={false} pitchEnabled={false} toolbarEnabled={false}>
              {visibleProfileMapItems.map((item) => <Marker key={`${item.type}-${item.id}`} coordinate={{ latitude: item.latitude, longitude: item.longitude }} title={item.title} pinColor={item.type === 'adventure' ? '#5B879D' : '#B86F4B'} onPress={() => router.push(item.type === 'adventure' ? { pathname: '/adventure/[id]', params: { id: item.id } } : { pathname: '/curiosity/[id]', params: { id: item.id } })} />)}
            </MapView>
            <View style={styles.profileMapFilters}>
              <Pressable style={[styles.profileMapFilter, profileMapFilter === 'all' && styles.profileMapFilterActive]} onPress={() => setProfileMapFilter('all')}><Text style={[styles.profileMapFilterText, profileMapFilter === 'all' && styles.profileMapFilterTextActive]}>Tout</Text></Pressable>
              <Pressable style={[styles.profileMapFilter, profileMapFilter === 'adventure' && styles.profileMapFilterAdventure]} onPress={() => setProfileMapFilter('adventure')}><Text style={[styles.profileMapFilterText, profileMapFilter === 'adventure' && styles.profileMapFilterTextActive]}>● Aventures</Text></Pressable>
              <Pressable style={[styles.profileMapFilter, profileMapFilter === 'curiosity' && styles.profileMapFilterCuriosity]} onPress={() => setProfileMapFilter('curiosity')}><Text style={[styles.profileMapFilterText, profileMapFilter === 'curiosity' && styles.profileMapFilterTextActive]}>● Curiosités</Text></Pressable>
            </View>
            {visibleProfileMapItems.length === 0 ? <View style={styles.profileMapEmpty}><Text style={styles.profileMapEmptyTitle}>Aucune activité dans ce filtre</Text><Text style={styles.profileMapEmptyText}>Les pins apparaîtront dès qu’une activité possède un emplacement.</Text></View> : null}
          </View>
          <View style={styles.aboutSection}><Text style={styles.libraryEyebrow}>À PROPOS</Text><Text style={styles.aboutTitle}>Mon profil d’aventurier</Text>{profile?.bio ? <Text style={styles.aboutText}>{profile.bio}</Text> : null}{profile?.country ? <Text style={styles.aboutCountry}>Pays · {profile.country}</Text> : null}{user.email ? <Text style={styles.aboutMeta}>{user.email} · {user.email_confirmed_at ? 'confirmé' : 'à confirmer'}</Text> : null}{!user.email_confirmed_at ? <Pressable onPress={() => void resendConfirmation()} disabled={resendingConfirmation}><Text style={styles.resendText}>{resendingConfirmation ? 'Envoi…' : 'Renvoyer la confirmation'}</Text></Pressable> : null}<Pressable style={styles.discoverButton} onPress={() => router.push('/members' as never)}><Text style={styles.discoverButtonText}>⌕ Découvrir des aventuriers</Text></Pressable></View>
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

        {user ? (
          <>
            {isModerator ? <Pressable style={styles.moderationButton} onPress={() => router.push('/moderation')}><Text style={styles.moderationButtonText}>⚑ Ouvrir la modération</Text></Pressable> : null}
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
    backgroundColor: '#0B1710',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#CBD5C8',
    fontSize: 14,
    marginTop: 14,
  },

  container: {
    flexGrow: 1,
    alignItems: 'stretch',
    paddingBottom: 120,
  },

  passportHero: { width: '100%', height: 350, overflow: 'hidden', backgroundColor: '#21472F' },
  coverImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  coverFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end', justifyContent: 'center', backgroundColor: '#12382D' },
  coverMark: { color: 'rgba(98,230,177,0.08)', fontSize: 260, fontWeight: '900', marginRight: -20 },
  coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,12,9,0.52)' },
  heroTop: { position: 'absolute', top: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start' },
  heroIdentity: { position: 'absolute', left: 20, right: 20, bottom: 20, alignItems: 'flex-start' },
  identityText: { width: '100%', marginTop: 13 },
  heroCountry: { color: '#C4D9D0', fontSize: 11, fontWeight: '700', marginTop: 7 },
  profileIntro: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingVertical: 18 },
  statDivider: { width: 1, height: 30, backgroundColor: '#24483B', alignSelf: 'center' },
  profileNav: { width: '100%', flexDirection: 'row', borderRadius: 0, borderWidth: 1, borderColor: '#35563E', backgroundColor: '#173523', padding: 6, marginTop: 18 },
  navItem: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 0},
  navItemActive: { backgroundColor: '#2D5B3D' },
  navIcon: { color: '#B86F4B', fontSize: 18 },
  navLabel: { color: '#AEBBAA', fontSize: 9, fontWeight: '800', marginTop: 5 },
  navLabelActive: { color: '#E4FFF4' },
  aboutMeta: { color: '#BCC8B8', fontSize: 11, marginTop: 10 },
  discoverButton: { alignSelf: 'flex-start', paddingVertical: 12, marginTop: 8 },
  discoverButtonText: { color: '#B86F4B', fontSize: 11, fontWeight: '900' },
  sectionIntro: { width: '100%', backgroundColor: '#21472F', paddingHorizontal: 22, paddingVertical: 28, marginTop: 22 },
  pageSectionHeader: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 30, marginBottom: 14 },
  routeActivityCount: { color: '#B86F4B', fontSize: 12, fontWeight: '900', paddingBottom: 2 },
  profileMapSection: { width: '100%', backgroundColor: '#21472F', overflow: 'hidden' },
  profileMapHeader: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  profileMap: { width: '100%', height: 280 },
  profileMapFilters: { flexDirection: 'row', gap: 7, paddingHorizontal: 22, paddingVertical: 14 },
  profileMapFilter: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  profileMapFilterActive: { opacity: 1 },
  profileMapFilterAdventure: { opacity: 1 },
  profileMapFilterCuriosity: { opacity: 1 },
  profileMapFilterText: { color: '#E6E2D5', fontSize: 9, fontWeight: '900' },
  profileMapFilterTextActive: { color: '#B86F4B' },
  profileMapEmpty: { position: 'absolute', left: 22, right: 22, top: 155, paddingVertical: 16 },
  profileMapEmptyTitle: { color: '#F4E9D6', fontSize: 15, fontWeight: '900' },
  profileMapEmptyText: { color: '#9CB0A7', fontSize: 11, lineHeight: 16, marginTop: 5 },
  sectionGlyph: { width: 58, height: 78, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#2D5B3D' },
  sectionGlyphText: { color: '#B86F4B', fontSize: 31, fontWeight: '900' },
  sectionCardContent: { flex: 1, marginLeft: 14 },
  sectionCardEyebrow: { color: '#B86F4B', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  sectionCardTitle: { color: '#F4E9D6', fontSize: 17, fontWeight: '900', marginTop: 5 },
  sectionCardText: { color: '#CBD5C8', fontSize: 11, lineHeight: 16, marginTop: 5 },
  sectionArrow: { color: '#B86F4B', fontSize: 30, marginLeft: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collectionCount: { minWidth: 42, height: 42, color: '#B86F4B', fontSize: 17, fontWeight: '900', lineHeight: 42, textAlign: 'right' },
  sectionItems: { width: '100%', backgroundColor: '#102218', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 },
  collectionCreateRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  collectionInput: { flex: 1, height: 46, color: '#F4E9D6', borderBottomWidth: 1, borderBottomColor: '#748D73', paddingHorizontal: 2 },
  collectionCreateButton: { height: 46, justifyContent: 'center', backgroundColor: '#B86F4B', paddingHorizontal: 16 },
  collectionCreateText: { color: '#0B1710', fontSize: 12, fontWeight: '900' },
  collectionCard: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#31513A', paddingVertical: 16 },
  collectionCardHeader: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collectionCardTitle: { color: '#F4E9D6', fontSize: 17, fontWeight: '900' },
  collectionCardMeta: { color: '#789086', fontSize: 10, marginTop: 4 },
  collectionDelete: { color: '#E89891', fontSize: 10, fontWeight: '800' },
  bilanSection: { width: '100%', backgroundColor: '#173523', paddingHorizontal: 22, paddingVertical: 28, marginTop: 8 },
  bilanYear: { color: '#B86F4B', fontSize: 13, fontWeight: '900', paddingVertical: 7 },
  bilanGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 17 },
  bilanMetric: { width: '48%', minHeight: 96, paddingVertical: 12 },
  bilanMetricIcon: { color: '#B86F4B', fontSize: 18, fontWeight: '900' }, bilanMetricValue: { color: '#F4E9D6', fontSize: 22, fontWeight: '900', marginTop: 9 }, bilanMetricLabel: { color: '#BCC8B8', fontSize: 10, marginTop: 4 },
  breakdownTitle: { color: '#FBF1DF', fontSize: 13, fontWeight: '900', marginTop: 22, marginBottom: 3 },
  distanceRow: { marginTop: 12 }, distanceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }, distanceLabel: { color: '#E6E2D5', fontSize: 11, fontWeight: '800' }, distanceValue: { color: '#BCC8B8', fontSize: 10, fontWeight: '700' }, distanceTrack: { height: 7, overflow: 'hidden', borderRadius: 0, backgroundColor: '#0B1710' }, distanceFill: { height: '100%', borderRadius: 0},
  recordCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, marginTop: 10 }, recordEyebrow: { color: '#B86F4B', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, recordTitle: { maxWidth: 190, color: '#F4E9D6', fontSize: 13, fontWeight: '900', marginTop: 4 }, recordDistance: { color: '#B86F4B', fontSize: 16, fontWeight: '900' }, bilanHelper: { color: '#AEBBAA', fontSize: 10, lineHeight: 15, marginTop: 17 },

  topLabel: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  brand: {
    color: '#F4E9D6',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },

  sectionLabel: {
    color: '#B86F4B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: '#F4E9D6',
    fontSize: 32,
    fontWeight: '900',
  },

  title: {
    color: '#F4E9D6',
    fontSize: 25,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 8,
  },

  username: {
    color: '#B86F4B',
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
    color: '#E6E2D5',
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
    paddingHorizontal: 10,
    paddingVertical: 17,
    marginTop: 4,
  },

  statCard: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    color: '#F4E9D6',
    fontSize: 20,
    fontWeight: '900',
  },

  statLabel: {
    color: '#CBD5C8',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },

  followingRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  followingCard: { flex: 1, alignItems: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#35563E', backgroundColor: '#21472F', padding: 13 },
  followingValue: { color: '#B86F4B', fontSize: 18, fontWeight: '900' },
  followingLabel: { color: '#CBD5C8', fontSize: 11, marginTop: 3 },
  findMembersButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#6F8D6C', backgroundColor: '#21472F', padding: 15, marginTop: 12 },
  findMembersIcon: { color: '#B86F4B', fontSize: 30 }, findMembersContent: { flex: 1, marginLeft: 12 }, findMembersTitle: { color: '#F4E9D6', fontSize: 15, fontWeight: '900' }, findMembersText: { color: '#BCC8B8', fontSize: 11, marginTop: 4 }, findMembersArrow: { color: '#B86F4B', fontSize: 28 },
  aboutSection: { width: '100%', backgroundColor: '#102218', paddingHorizontal: 22, paddingVertical: 28, marginTop: 22 }, aboutTitle: { color: '#F4E9D6', fontSize: 19, fontWeight: '900', marginTop: 6 }, aboutText: { color: '#E6E2D5', lineHeight: 20, marginTop: 9 }, aboutCountry: { color: '#B86F4B', fontSize: 12, fontWeight: '800', marginTop: 10 }, activityHeader: { width: '100%', backgroundColor: '#21472F', paddingHorizontal: 22, paddingTop: 28, paddingBottom: 18, marginTop: 22 },
  settingsButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { color: '#B86F4B', fontSize: 19 },

  library: {
    width: '100%',
    backgroundColor: '#102218',
    paddingHorizontal: 22,
    paddingVertical: 28,
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
    color: '#B86F4B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  libraryTitle: {
    color: '#F4E9D6',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },

  libraryCount: {
    color: '#CBD5C8',
    fontSize: 14,
    fontWeight: '800',
  },

  contentCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
    backgroundColor: 'transparent',
  },

  contentImageFallbackText: {
    color: '#B86F4B',
    fontSize: 23,
  },

  contentInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },

  contentBadge: {
    color: '#B86F4B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  contentTitle: {
    color: '#F4E9D6',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },

  contentSubtitle: {
    color: '#BCC8B8',
    fontSize: 11,
    marginTop: 4,
  },

  contentArrow: {
    color: '#B86F4B',
    fontSize: 27,
    paddingRight: 5,
  },

  emptyLibraryText: {
    color: '#6F8279',
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 0,
    paddingVertical: 18,
  },

  primaryButton: {
    marginHorizontal: 22,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#B86F4B',
    marginTop: 30,
  },

  primaryButtonText: {
    color: '#0B1710',
    fontSize: 15,
    fontWeight: '900',
  },

  secondaryButton: {
    marginHorizontal: 22,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  secondaryButtonText: {
    color: '#FBF1DF',
    fontSize: 15,
    fontWeight: '800',
  },

  editButton: {
    marginHorizontal: 22,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#B86F4B',
    marginTop: 30,
  },
  moderationButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', marginHorizontal: 22, marginTop: 30 },
  moderationButtonText: { color: '#C58A62', fontSize: 14, fontWeight: '900' },

  editButtonText: {
    color: '#0B1710',
    fontSize: 15,
    fontWeight: '900',
  },

  logoutButton: {
    marginHorizontal: 22,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  logoutButtonText: {
    color: '#FFB8B8',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteAccountButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginHorizontal: 22, marginTop: 8 },
  deleteAccountText: { color: '#B77A7A', fontSize: 12, fontWeight: '800' },
  blockedUsersButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginHorizontal: 22, marginTop: 8 },
  blockedUsersText: { color: '#CBD5C8', fontSize: 12, fontWeight: '800' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 12 },
  legalText: { color: '#B86F4B', fontSize: 11, fontWeight: '800', textDecorationLine: 'underline' },
  emailStatus: { alignSelf: 'center', borderRadius: 0, backgroundColor: '#2A2412', paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  emailStatusConfirmed: { backgroundColor: '#2D5B3D' },
  emailStatusText: { color: '#C58A62', fontSize: 9, fontWeight: '900' },
  emailStatusTextConfirmed: { color: '#B86F4B' },
  resendText: { color: '#CBD5C8', fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 8, textDecorationLine: 'underline' },

  quoteCard: {
    width: '100%',
    backgroundColor: '#173523',
    paddingHorizontal: 22,
    paddingVertical: 30,
    marginTop: 28,
  },

  quote: {
    color: '#B86F4B',
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
