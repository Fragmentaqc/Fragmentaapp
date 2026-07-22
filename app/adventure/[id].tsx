import {
  type Adventure,
  useAdventures,
} from '@/context/adventures-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { useFragments } from '@/context/fragments-context';
import { useFavorites } from '@/context/favorites-context';
import { openDirections } from '@/lib/directions';
import { useAdventureRoute } from '@/hooks/use-adventure-route';
import type { RouteCoordinate } from '@/lib/routing';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import { CollectionPicker } from '@/components/collection-picker';

const SCREEN_WIDTH = Dimensions.get('window').width;

function getStatusLabel(status: string) {
  if (status === 'completed') return 'Terminée';
  if (status === 'active') return 'En cours';
  return 'En préparation';
}

export default function AdventureDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { adventures, loading, deleteAdventure, refreshAdventures } = useAdventures();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { fragmentsByAdventure, loadingAdventureId, loadFragments, deleteFragment } = useFragments();
  const [deleting, setDeleting] = useState(false);
  const [deletingFragmentId, setDeletingFragmentId] = useState<string | null>(null);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [collectionPickerVisible, setCollectionPickerVisible] = useState(false);
  const adventureId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;
  const adventure = adventures.find((item) => item.id === adventureId);
  const fragments = useMemo(
    () => adventureId ? fragmentsByAdventure[adventureId] ?? [] : [],
    [adventureId, fragmentsByAdventure]
  );
  const favorite = adventureId ? isFavorite({ type: 'adventure', id: adventureId }) : false;
  const routePoints = useMemo<RouteCoordinate[]>(() => [
    ...(typeof adventure?.latitude === 'number' && typeof adventure.longitude === 'number'
      ? [{ latitude: adventure.latitude, longitude: adventure.longitude }]
      : []),
    ...fragments
      .filter((fragment) => typeof fragment.latitude === 'number' && typeof fragment.longitude === 'number')
      .map((fragment) => ({ latitude: fragment.latitude as number, longitude: fragment.longitude as number })),
  ], [adventure?.latitude, adventure?.longitude, fragments]);
  const { route, loading: routeLoading, usedFallback } = useAdventureRoute(
    routePoints,
    adventure?.routingProfile ?? 'walking'
  );

  useEffect(() => {
    if (!adventure || routeLoading || route.distanceKm <= 0 || user?.id !== adventure.ownerId || Math.abs(adventure.distanceKm - route.distanceKm) < 0.01) return;
    void supabase.from('adventures').update({ distance_km: Number(route.distanceKm.toFixed(2)) }).eq('id', adventure.id).eq('owner_id', user.id).then(({ error }) => {
      if (!error) void refreshAdventures();
      else console.error('Erreur de synchronisation de la distance :', error.message);
    });
  }, [adventure, refreshAdventures, route.distanceKm, routeLoading, user?.id]);

  async function handleFavorite() {
    if (!adventure || savingFavorite) return;
    if (!user) {
      Alert.alert('Connexion requise', 'Connecte-toi pour enregistrer cette aventure.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Connexion', onPress: () => router.push('/auth') }]);
      return;
    }
    setSavingFavorite(true);
    const success = await toggleFavorite({ type: 'adventure', id: adventure.id });
    setSavingFavorite(false);
    if (!success) Alert.alert('Erreur', 'Impossible de modifier ce favori.');
  }

  useEffect(() => {
    if (adventureId) void loadFragments(adventureId);
  }, [adventureId, loadFragments]);

  function confirmDelete() {
    if (!adventure || deleting) return;
    Alert.alert(
      "Supprimer l'aventure",
      'Cette action est définitive. Les photos associées seront aussi supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const success = await deleteAdventure(adventure.id);
            setDeleting(false);
            if (success) router.replace('/profile');
            else Alert.alert('Erreur', "Impossible de supprimer l'aventure.");
          },
        },
      ]
    );
  }

  function confirmDeleteFragment(fragmentId: string, fragmentTitle: string) {
    if (!adventure || deletingFragmentId) return;
    Alert.alert('Supprimer le fragment', `Supprimer « ${fragmentTitle} » et toutes ses photos?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        setDeletingFragmentId(fragmentId);
        const success = await deleteFragment(fragmentId, adventure.id);
        setDeletingFragmentId(null);
        if (!success) Alert.alert('Erreur', 'Impossible de supprimer le fragment.');
      } },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E9576F" />
          <Text style={styles.loadingText}>{"Chargement de l'aventure…"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!adventure) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🧭</Text>
          <Text style={styles.emptyTitle}>Aventure introuvable</Text>
          <Text style={styles.emptyText}>
            {"Cette aventure n'existe plus ou n'est pas accessible."}
          </Text>
          <Pressable style={styles.primaryButton} onPress={router.back}>
            <Text style={styles.primaryButtonText}>Revenir</Text>
          </Pressable>
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
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={router.back}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.statusBadge}>
            <Text style={styles.statusDot}>●</Text>
            <Text style={styles.statusText}>
              {getStatusLabel(adventure.status)}
            </Text>
          </View>
        </View>

        <AdventureGallery adventure={adventure} />

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>
            {adventure.category.toUpperCase()}
          </Text>
          <Text style={styles.title}>{adventure.title}</Text>
          <Text style={styles.location}>⌖ {adventure.location}</Text>
          <Pressable style={[styles.favoriteButton, favorite && styles.favoriteButtonActive]} onPress={() => void handleFavorite()} disabled={savingFavorite}>
            <Text style={[styles.favoriteButtonText, favorite && styles.favoriteButtonTextActive]}>{favorite ? '♥ Enregistrée' : '♡ Enregistrer'}</Text>
          </Pressable>
          {user ? <Pressable style={styles.favoriteButton} onPress={() => setCollectionPickerVisible(true)}><Text style={styles.favoriteButtonText}>＋ Ajouter à une collection</Text></Pressable> : null}
        </View>

        <CollectionPicker target={{ type: 'adventure', id: adventure.id }} visible={collectionPickerVisible} onClose={() => setCollectionPickerVisible(false)} />

        <Pressable
          style={styles.authorCard}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: adventure.ownerId } })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {adventure.user.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorContent}>
            <Text style={styles.authorLabel}>AVENTURE DE</Text>
            <Text style={styles.authorName}>{adventure.user}</Text>
            <Text style={styles.authorHandle}>{adventure.handle}</Text>
          </View>
          <Text style={styles.date}>{adventure.day}</Text>
        </Pressable>

        <View style={styles.routeCard}>
          <Text style={styles.sectionEyebrow}>ITINÉRAIRE</Text>
          <RoutePoint
            marker="A"
            label="Départ"
            value={adventure.startLocation || 'À définir'}
          />
          <View style={styles.routeLine} />
          <RoutePoint
            marker="B"
            label="Destination"
            value={adventure.destination || 'À définir'}
          />
        </View>

        <View style={styles.detailsRow}>
          <DetailPill label="Distance" value={adventure.distance} />
          <DetailPill label="Catégorie" value={adventure.detail} />
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.sectionEyebrow}>{"L'HISTOIRE"}</Text>
          <Text style={styles.sectionTitle}>{"À propos de l'aventure"}</Text>
          <Text style={styles.description}>{adventure.description}</Text>
        </View>

        <View style={styles.fragmentsHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>JOURNAL DE BORD</Text>
            <Text style={styles.sectionTitle}>Fragments</Text>
          </View>
          {user?.id === adventure.ownerId ? (
            <Pressable style={styles.addFragmentButton} onPress={() => router.push({ pathname: '/add-fragment/[adventureId]', params: { adventureId: adventure.id } })}>
              <Text style={styles.addFragmentButtonText}>＋ Ajouter</Text>
            </Pressable>
          ) : null}
        </View>
        {loadingAdventureId === adventure.id ? <ActivityIndicator color="#E9576F" style={styles.fragmentLoader} /> : fragments.length ? fragments.map((fragment) => (
          <View key={fragment.id} style={styles.fragmentCard}>
            <View style={styles.fragmentTopRow}>
              <Text style={styles.fragmentDate}>{fragment.occurredAt ? new Date(fragment.occurredAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date à venir'}</Text>
              {fragment.status === 'draft' ? <Text style={styles.draftBadge}>BROUILLON</Text> : null}
            </View>
            <Text style={styles.fragmentTitle}>{fragment.title}</Text>
            <Text style={styles.fragmentBody}>{fragment.body}</Text>
            {fragment.images.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fragmentGallery}>{fragment.images.map((imageUrl, imageIndex) => <Image key={`${fragment.id}-${imageIndex}`} source={{ uri: imageUrl }} style={styles.fragmentImage} />)}</ScrollView> : null}
            {user?.id === fragment.ownerId ? <View style={styles.fragmentActions}>
              <Pressable style={styles.fragmentEditButton} onPress={() => router.push({ pathname: '/edit-fragment/[id]', params: { id: fragment.id } })}><Text style={styles.fragmentEditText}>Modifier</Text></Pressable>
              <Pressable style={styles.fragmentDeleteButton} disabled={deletingFragmentId === fragment.id} onPress={() => confirmDeleteFragment(fragment.id, fragment.title)}><Text style={styles.fragmentDeleteText}>{deletingFragmentId === fragment.id ? 'Suppression…' : 'Supprimer'}</Text></Pressable>
            </View> : null}
          </View>
        )) : <View style={styles.emptyFragments}><Text style={styles.emptyFragmentsText}>Aucun fragment pour le moment.</Text></View>}

        {loadingAdventureId !== adventure.id ? (
          <AdventureStats adventure={adventure} fragments={fragments} distanceKm={route.distanceKm} />
        ) : null}

        <AdventureRouteMap
          adventure={adventure}
          routeCoordinates={route.coordinates}
          distanceKm={route.distanceKm}
          loading={routeLoading}
          usedFallback={usedFallback}
          fragmentCoordinates={fragments
            .filter((fragment) => typeof fragment.latitude === 'number' && typeof fragment.longitude === 'number')
            .map((fragment) => ({
              id: fragment.id,
              title: fragment.title,
              latitude: fragment.latitude as number,
              longitude: fragment.longitude as number,
            }))}
        />

        {typeof adventure.latitude === 'number' &&
        typeof adventure.longitude === 'number' ? (
          <View style={styles.coordinatesCard}>
            <Text style={styles.coordinatesIcon}>⌖</Text>
            <View>
              <Text style={styles.coordinatesTitle}>Position enregistrée</Text>
              <Text style={styles.coordinatesText}>
                {adventure.latitude.toFixed(5)}, {' '}
                {adventure.longitude.toFixed(5)}
              </Text>
            </View>
            <Pressable
              style={styles.directionsButton}
              onPress={() => void openDirections(
                adventure.latitude as number,
                adventure.longitude as number,
                adventure.title
              )}
            >
              <Text style={styles.directionsButtonText}>Itinéraire ↗</Text>
            </Pressable>
          </View>
        ) : null}
        {user?.id === adventure.ownerId ? (
          <View style={styles.ownerActions}>
            <Pressable
              style={styles.editButton}
              onPress={() => router.push({ pathname: '/edit-adventure/[id]', params: { id: adventure.id } })}
            >
              <Text style={styles.editButtonText}>{"Modifier l'aventure"}</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={confirmDelete} disabled={deleting}>
              <Text style={styles.deleteButtonText}>
                {deleting ? 'Suppression…' : "Supprimer l'aventure"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.reportButton} onPress={() => user ? router.push({ pathname: '/report', params: { type: 'adventure', id: adventure.id, label: adventure.title } }) : router.push('/auth')}>
            <Text style={styles.reportButtonText}>⚑ Signaler cette aventure</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AdventureGallery({ adventure }: { adventure: Adventure }) {
  if (adventure.images.length === 0) {
    return (
      <View style={styles.galleryFallback}>
        <Text style={styles.galleryEmoji}>{adventure.emoji}</Text>
        <Text style={styles.galleryFallbackText}>
          Aucune photo pour le moment
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.gallery}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      >
        {adventure.images.map((imageUrl, index) => (
          <Image
            key={`${adventure.id}-detail-${index}`}
            source={{ uri: imageUrl }}
            style={styles.galleryImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      <View style={styles.imageCount}>
        <Text style={styles.imageCountText}>
          {adventure.images.length} photo
          {adventure.images.length > 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

function RoutePoint({ marker, label, value }: {
  marker: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.routePoint}>
      <View style={styles.routeMarker}>
        <Text style={styles.routeMarkerText}>{marker}</Text>
      </View>
      <View style={styles.routeContent}>
        <Text style={styles.routeLabel}>{label}</Text>
        <Text style={styles.routeValue}>{value}</Text>
      </View>
    </View>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailPill}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function AdventureStats({ adventure, fragments, distanceKm }: {
  adventure: Adventure;
  fragments: ReturnType<typeof useFragments>['fragmentsByAdventure'][string];
  distanceKm: number;
}) {
  const photoCount = adventure.images.length + fragments.reduce((total, fragment) => total + fragment.images.length, 0);
  const dates = fragments
    .map((fragment) => fragment.occurredAt ? new Date(fragment.occurredAt).getTime() : Number.NaN)
    .filter(Number.isFinite);
  const durationDays = dates.length
    ? Math.max(1, Math.floor((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1)
    : 0;
  const recordedDuration = adventure.durationMinutes >= 60
    ? `${Math.floor(adventure.durationMinutes / 60)} h${adventure.durationMinutes % 60 ? ` ${adventure.durationMinutes % 60}` : ''}`
    : adventure.durationMinutes > 0 ? `${adventure.durationMinutes} min` : null;

  return (
    <View style={styles.statsSection}>
      <Text style={styles.sectionEyebrow}>STATISTIQUES</Text>
      <Text style={styles.statsTitle}>L’aventure en chiffres</Text>
      <View style={styles.statsGrid}>
        <StatCard value={`${fragments.length}`} label="Fragments" />
        <StatCard value={`${photoCount}`} label="Photos" />
        <StatCard value={distanceKm >= 10 ? `${Math.round(distanceKm)} km` : `${distanceKm.toFixed(1)} km`} label="Distance parcourue" />
        <StatCard value={recordedDuration || (durationDays ? `${durationDays} j` : '—')} label={recordedDuration ? "Temps d’activité" : "Durée racontée"} />
      </View>
      {distanceKm === 0 ? <Text style={styles.statsHelper}>Ajoute au moins deux positions GPS pour calculer la distance.</Text> : null}
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return <View style={styles.statCard}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function AdventureRouteMap({
  adventure,
  fragmentCoordinates,
  routeCoordinates,
  distanceKm,
  loading,
  usedFallback,
}: {
  adventure: Adventure;
  fragmentCoordinates: { id: string; title: string; latitude: number; longitude: number }[];
  routeCoordinates: RouteCoordinate[];
  distanceKm: number;
  loading: boolean;
  usedFallback: boolean;
}) {
  const adventureCoordinate = typeof adventure.latitude === 'number' && typeof adventure.longitude === 'number'
    ? { latitude: adventure.latitude, longitude: adventure.longitude }
    : null;
  const waypointCoordinates = [
    ...(adventureCoordinate ? [adventureCoordinate] : []),
    ...fragmentCoordinates.map(({ latitude, longitude }) => ({ latitude, longitude })),
  ];

  if (!waypointCoordinates.length) return null;

  const displayedCoordinates = routeCoordinates.length ? routeCoordinates : waypointCoordinates;
  const latitudes = displayedCoordinates.map((coordinate) => coordinate.latitude);
  const longitudes = displayedCoordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const initialRegion = {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.5, 0.04),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.5, 0.04),
  };

  return (
    <View style={styles.routeMapCard}>
      <View style={styles.routeMapHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>PARCOURS</Text>
          <Text style={styles.routeMapTitle}>Sur la carte</Text>
        </View>
        <View style={styles.routeMapMeta}>
          <Text style={styles.routeMapDistance}>{distanceKm >= 10 ? Math.round(distanceKm) : distanceKm.toFixed(1)} km</Text>
          <Text style={styles.routeMapCount}>{getRouteProfileLabel(adventure.routingProfile)}</Text>
        </View>
      </View>
      <MapView style={styles.routeMap} initialRegion={initialRegion} scrollEnabled zoomEnabled>
        {displayedCoordinates.length > 1 ? <Polyline coordinates={displayedCoordinates} strokeColor="#E9576F" strokeWidth={5} /> : null}
        {adventureCoordinate ? <Marker coordinate={adventureCoordinate} title={adventure.title} description="Point de l’aventure" pinColor="#F0A36B" /> : null}
        {fragmentCoordinates.map((fragment, index) => (
          <Marker key={fragment.id} coordinate={fragment} title={fragment.title} description={`Fragment ${index + 1}`} pinColor="#E9576F" />
        ))}
      </MapView>
      <Text style={styles.routeMapHelper}>
        {loading
          ? 'Calcul du trajet réel…'
          : usedFallback
            ? 'Trajet approximatif. Configure Mapbox ou reconnecte-toi pour suivre le réseau réel.'
            : 'Le trajet suit le réseau adapté au mode choisi et les fragments dans l’ordre chronologique.'}
      </Text>
    </View>
  );
}

function getRouteProfileLabel(profile: Adventure['routingProfile']) {
  if (profile === 'cycling') return 'Vélo';
  if (profile === 'driving') return 'Auto';
  return 'Marche';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#173E28' },
  container: { paddingBottom: 60 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { color: '#D0C4A9', fontSize: 13, marginTop: 12 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#356F43',
    backgroundColor: '#245A35',
  },
  backIcon: { color: '#E9576F', fontSize: 34, lineHeight: 36 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    backgroundColor: '#3B7C49',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusDot: { color: '#E9576F', fontSize: 9, marginRight: 7 },
  statusText: { color: '#FFF1D6', fontSize: 10, fontWeight: '900' },
  gallery: { position: 'relative', minHeight: 310, backgroundColor: '#2F6F3E' },
  galleryImage: { width: SCREEN_WIDTH, height: 310 },
  galleryFallback: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B7C49',
  },
  galleryEmoji: { fontSize: 72 },
  galleryFallbackText: {
    color: '#82AA99',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  imageCount: {
    position: 'absolute',
    right: 16,
    bottom: 14,
    borderRadius: 0,
    backgroundColor: 'rgba(7, 19, 16, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  imageCountText: { color: '#FFF1D6', fontSize: 10, fontWeight: '900' },
  heading: { paddingHorizontal: 18, paddingTop: 24 },
  eyebrow: {
    color: '#E9576F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: {
    color: '#F5E6C8',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    marginTop: 7,
  },
  location: { color: '#79DDB5', fontSize: 13, fontWeight: '800', marginTop: 11 },
  favoriteButton: { alignSelf: 'flex-start', borderRadius: 0, borderWidth: 1, borderColor: '#7BA578', paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 },
  favoriteButtonActive: { backgroundColor: '#E9576F', borderColor: '#E9576F' },
  favoriteButtonText: { color: '#FFF1D6', fontSize: 12, fontWeight: '900' },
  favoriteButtonTextActive: { color: '#173E28' },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#315F3C',
    backgroundColor: '#245A35',
    padding: 15,
    marginHorizontal: 18,
    marginTop: 22,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#3B7C49',
  },
  avatarText: { color: '#E9576F', fontSize: 18, fontWeight: '900' },
  authorContent: { flex: 1, marginLeft: 12 },
  authorLabel: { color: '#657970', fontSize: 8, fontWeight: '900' },
  authorName: { color: '#F5E6C8', fontSize: 14, fontWeight: '900', marginTop: 3 },
  authorHandle: { color: '#E9576F', fontSize: 10, marginTop: 2 },
  date: { color: '#BDB7A3', fontSize: 9, maxWidth: 92, textAlign: 'right' },
  routeCard: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#5B8F5D',
    backgroundColor: '#2F6F3E',
    padding: 18,
    marginHorizontal: 18,
    marginTop: 16,
  },
  sectionEyebrow: {
    color: '#E9576F',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  routePoint: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  routeMarker: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#E9576F',
  },
  routeMarkerText: { color: '#173E28', fontSize: 12, fontWeight: '900' },
  routeContent: { flex: 1, marginLeft: 12 },
  routeLabel: { color: '#70877D', fontSize: 9, fontWeight: '800' },
  routeValue: { color: '#F5E6C8', fontSize: 14, fontWeight: '800', marginTop: 3 },
  routeLine: { width: 2, height: 18, backgroundColor: '#5B8F5D', marginLeft: 16 },
  detailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 12,
  },
  detailPill: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#315F3C',
    backgroundColor: '#245A35',
    padding: 14,
  },
  detailLabel: { color: '#657970', fontSize: 9, fontWeight: '800' },
  detailValue: { color: '#FFF1D6', fontSize: 14, fontWeight: '900', marginTop: 5 },
  descriptionCard: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#315F3C',
    backgroundColor: '#245A35',
    padding: 18,
    marginHorizontal: 18,
    marginTop: 16,
  },
  sectionTitle: { color: '#F5E6C8', fontSize: 19, fontWeight: '900', marginTop: 5 },
  description: { color: '#A2B3AB', fontSize: 14, lineHeight: 22, marginTop: 11 },
  fragmentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 25 },
  addFragmentButton: { borderRadius: 0, backgroundColor: '#E9576F', paddingHorizontal: 13, paddingVertical: 10 },
  addFragmentButtonText: { color: '#173E28', fontSize: 11, fontWeight: '900' },
  fragmentLoader: { marginTop: 24 },
  fragmentCard: { borderRadius: 0, borderWidth: 1, borderColor: '#5B8F5D', backgroundColor: '#2F6F3E', padding: 17, marginHorizontal: 18, marginTop: 12 },
  fragmentTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fragmentDate: { color: '#E9576F', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  draftBadge: { color: '#173E28', backgroundColor: '#F0A36B', fontSize: 8, fontWeight: '900', borderRadius: 0, paddingHorizontal: 8, paddingVertical: 5 },
  fragmentTitle: { color: '#F5E6C8', fontSize: 18, fontWeight: '900', marginTop: 10 },
  fragmentBody: { color: '#A2B3AB', fontSize: 13, lineHeight: 20, marginTop: 7 },
  fragmentGallery: { gap: 10, paddingTop: 13 },
  fragmentImage: { width: 245, height: 190, borderRadius: 0},
  fragmentActions: { flexDirection: 'row', gap: 9, marginTop: 13 },
  fragmentEditButton: { flex: 1, alignItems: 'center', borderRadius: 0, backgroundColor: '#6D9F6B', padding: 11 },
  fragmentEditText: { color: '#F5E6C8', fontSize: 11, fontWeight: '900' },
  fragmentDeleteButton: { flex: 1, alignItems: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#7B3535', padding: 11 },
  fragmentDeleteText: { color: '#FFB8B8', fontSize: 11, fontWeight: '900' },
  emptyFragments: { borderRadius: 0, borderWidth: 1, borderColor: '#315F3C', padding: 18, marginHorizontal: 18, marginTop: 12 },
  emptyFragmentsText: { color: '#BDB7A3', fontSize: 12, textAlign: 'center' },
  statsSection: { marginHorizontal: 18, marginTop: 24 },
  statsTitle: { color: '#F5E6C8', fontSize: 19, fontWeight: '900', marginTop: 5, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', minHeight: 88, justifyContent: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#315F3C', backgroundColor: '#245A35', padding: 14 },
  statValue: { color: '#E9576F', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#D0C4A9', fontSize: 10, fontWeight: '800', marginTop: 5 },
  statsHelper: { color: '#B8B59E', fontSize: 10, lineHeight: 15, marginTop: 9 },
  routeMapCard: { overflow: 'hidden', borderRadius: 0, borderWidth: 1, borderColor: '#5B8F5D', backgroundColor: '#2F6F3E', marginHorizontal: 18, marginTop: 16 },
  routeMapHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  routeMapTitle: { color: '#F5E6C8', fontSize: 18, fontWeight: '900', marginTop: 4 },
  routeMapCount: { color: '#82AA99', fontSize: 10, fontWeight: '800' },
  routeMapMeta: { alignItems: 'flex-end' },
  routeMapDistance: { color: '#E9576F', fontSize: 18, fontWeight: '900' },
  routeMap: { width: '100%', height: 260 },
  routeMapHelper: { color: '#BDB7A3', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, paddingVertical: 12 },
  coordinatesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    backgroundColor: '#3B7C49',
    padding: 15,
    marginHorizontal: 18,
    marginTop: 12,
  },
  coordinatesIcon: { color: '#E9576F', fontSize: 25, marginRight: 12 },
  coordinatesTitle: { color: '#F5E6C8', fontSize: 12, fontWeight: '900' },
  coordinatesText: { color: '#82AA99', fontSize: 11, marginTop: 4 },
  directionsButton: { marginLeft: 'auto', borderRadius: 0, backgroundColor: '#E9576F', paddingHorizontal: 12, paddingVertical: 9 },
  directionsButtonText: { color: '#173E28', fontSize: 11, fontWeight: '900' },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: '#F5E6C8', fontSize: 21, fontWeight: '900', marginTop: 13 },
  emptyText: {
    color: '#D0C4A9',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#E9576F',
    paddingHorizontal: 22,
    marginTop: 20,
  },
  primaryButtonText: { color: '#173E28', fontSize: 13, fontWeight: '900' },
  ownerActions: { marginHorizontal: 18, marginTop: 22, gap: 10 },
  editButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#E9576F' },
  editButtonText: { color: '#173E28', fontSize: 14, fontWeight: '900' },
  deleteButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#7B3535', backgroundColor: '#261414' },
  deleteButtonText: { color: '#FFB8B8', fontSize: 14, fontWeight: '900' },
  reportButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginHorizontal: 18, marginTop: 20 },
  reportButtonText: { color: '#D0C4A9', fontSize: 11, fontWeight: '800' },
});
