import {
  type Adventure,
  useAdventures,
} from '@/context/adventures-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { useFragments } from '@/context/fragments-context';
import { useFavorites } from '@/context/favorites-context';
import { openDirections } from '@/lib/directions';
import { useEffect, useState } from 'react';
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

const SCREEN_WIDTH = Dimensions.get('window').width;

function getStatusLabel(status: string) {
  if (status === 'completed') return 'Terminée';
  if (status === 'active') return 'En cours';
  return 'En préparation';
}

export default function AdventureDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { adventures, loading, deleteAdventure } = useAdventures();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { fragmentsByAdventure, loadingAdventureId, loadFragments, deleteFragment } = useFragments();
  const [deleting, setDeleting] = useState(false);
  const [deletingFragmentId, setDeletingFragmentId] = useState<string | null>(null);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const adventureId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;
  const adventure = adventures.find((item) => item.id === adventureId);
  const fragments = adventureId ? fragmentsByAdventure[adventureId] ?? [] : [];
  const favorite = adventureId ? isFavorite({ type: 'adventure', id: adventureId }) : false;

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
          <ActivityIndicator size="large" color="#62E6B1" />
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
        </View>

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
        {loadingAdventureId === adventure.id ? <ActivityIndicator color="#62E6B1" style={styles.fragmentLoader} /> : fragments.length ? fragments.map((fragment) => (
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
          <AdventureStats adventure={adventure} fragments={fragments} />
        ) : null}

        <AdventureRouteMap
          adventure={adventure}
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

function distanceBetween(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function AdventureStats({ adventure, fragments }: {
  adventure: Adventure;
  fragments: ReturnType<typeof useFragments>['fragmentsByAdventure'][string];
}) {
  const coordinates = [
    ...(typeof adventure.latitude === 'number' && typeof adventure.longitude === 'number'
      ? [{ latitude: adventure.latitude, longitude: adventure.longitude }]
      : []),
    ...fragments
      .filter((fragment) => typeof fragment.latitude === 'number' && typeof fragment.longitude === 'number')
      .map((fragment) => ({ latitude: fragment.latitude as number, longitude: fragment.longitude as number })),
  ];
  const distance = coordinates.slice(1).reduce(
    (total, coordinate, index) => total + distanceBetween(coordinates[index], coordinate),
    0
  );
  const photoCount = adventure.images.length + fragments.reduce((total, fragment) => total + fragment.images.length, 0);
  const dates = fragments
    .map((fragment) => fragment.occurredAt ? new Date(fragment.occurredAt).getTime() : Number.NaN)
    .filter(Number.isFinite);
  const durationDays = dates.length
    ? Math.max(1, Math.floor((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1)
    : 0;

  return (
    <View style={styles.statsSection}>
      <Text style={styles.sectionEyebrow}>STATISTIQUES</Text>
      <Text style={styles.statsTitle}>L’aventure en chiffres</Text>
      <View style={styles.statsGrid}>
        <StatCard value={`${fragments.length}`} label="Fragments" />
        <StatCard value={`${photoCount}`} label="Photos" />
        <StatCard value={distance >= 10 ? `${Math.round(distance)} km` : `${distance.toFixed(1)} km`} label="Distance GPS" />
        <StatCard value={durationDays ? `${durationDays} j` : '—'} label="Durée racontée" />
      </View>
      {coordinates.length < 2 ? <Text style={styles.statsHelper}>Ajoute au moins deux positions GPS pour calculer la distance.</Text> : null}
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return <View style={styles.statCard}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function AdventureRouteMap({
  adventure,
  fragmentCoordinates,
}: {
  adventure: Adventure;
  fragmentCoordinates: { id: string; title: string; latitude: number; longitude: number }[];
}) {
  const adventureCoordinate = typeof adventure.latitude === 'number' && typeof adventure.longitude === 'number'
    ? { latitude: adventure.latitude, longitude: adventure.longitude }
    : null;
  const coordinates = [
    ...(adventureCoordinate ? [adventureCoordinate] : []),
    ...fragmentCoordinates.map(({ latitude, longitude }) => ({ latitude, longitude })),
  ];

  if (!coordinates.length) return null;

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
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
        <Text style={styles.routeMapCount}>{coordinates.length} point{coordinates.length > 1 ? 's' : ''}</Text>
      </View>
      <MapView style={styles.routeMap} initialRegion={initialRegion} scrollEnabled zoomEnabled>
        {coordinates.length > 1 ? <Polyline coordinates={coordinates} strokeColor="#62E6B1" strokeWidth={4} /> : null}
        {adventureCoordinate ? <Marker coordinate={adventureCoordinate} title={adventure.title} description="Point de l’aventure" pinColor="#E9B949" /> : null}
        {fragmentCoordinates.map((fragment, index) => (
          <Marker key={fragment.id} coordinate={fragment} title={fragment.title} description={`Fragment ${index + 1}`} pinColor="#62E6B1" />
        ))}
      </MapView>
      <Text style={styles.routeMapHelper}>La ligne relie les positions dans l’ordre chronologique.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071310' },
  container: { paddingBottom: 60 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { color: '#81958C', fontSize: 13, marginTop: 12 },
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#0C1C17',
  },
  backIcon: { color: '#62E6B1', fontSize: 34, lineHeight: 36 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#173D31',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusDot: { color: '#62E6B1', fontSize: 9, marginRight: 7 },
  statusText: { color: '#DFFFF2', fontSize: 10, fontWeight: '900' },
  gallery: { position: 'relative', minHeight: 310, backgroundColor: '#10251E' },
  galleryImage: { width: SCREEN_WIDTH, height: 310 },
  galleryFallback: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#173D31',
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
    borderRadius: 999,
    backgroundColor: 'rgba(7, 19, 16, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  imageCountText: { color: '#DFFFF2', fontSize: 10, fontWeight: '900' },
  heading: { paddingHorizontal: 18, paddingTop: 24 },
  eyebrow: {
    color: '#62E6B1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: {
    color: '#F3FFF9',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    marginTop: 7,
  },
  location: { color: '#79DDB5', fontSize: 13, fontWeight: '800', marginTop: 11 },
  favoriteButton: { alignSelf: 'flex-start', borderRadius: 14, borderWidth: 1, borderColor: '#386B59', paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 },
  favoriteButtonActive: { backgroundColor: '#62E6B1', borderColor: '#62E6B1' },
  favoriteButtonText: { color: '#DFFFF2', fontSize: 12, fontWeight: '900' },
  favoriteButtonTextActive: { color: '#071310' },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 15,
    marginHorizontal: 18,
    marginTop: 22,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#173D31',
  },
  avatarText: { color: '#62E6B1', fontSize: 18, fontWeight: '900' },
  authorContent: { flex: 1, marginLeft: 12 },
  authorLabel: { color: '#657970', fontSize: 8, fontWeight: '900' },
  authorName: { color: '#F3FFF9', fontSize: 14, fontWeight: '900', marginTop: 3 },
  authorHandle: { color: '#62E6B1', fontSize: 10, marginTop: 2 },
  date: { color: '#71877D', fontSize: 9, maxWidth: 92, textAlign: 'right' },
  routeCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#285345',
    backgroundColor: '#10251E',
    padding: 18,
    marginHorizontal: 18,
    marginTop: 16,
  },
  sectionEyebrow: {
    color: '#62E6B1',
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
    borderRadius: 17,
    backgroundColor: '#62E6B1',
  },
  routeMarkerText: { color: '#071310', fontSize: 12, fontWeight: '900' },
  routeContent: { flex: 1, marginLeft: 12 },
  routeLabel: { color: '#70877D', fontSize: 9, fontWeight: '800' },
  routeValue: { color: '#F3FFF9', fontSize: 14, fontWeight: '800', marginTop: 3 },
  routeLine: { width: 2, height: 18, backgroundColor: '#285345', marginLeft: 16 },
  detailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 12,
  },
  detailPill: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 14,
  },
  detailLabel: { color: '#657970', fontSize: 9, fontWeight: '800' },
  detailValue: { color: '#DFFFF2', fontSize: 14, fontWeight: '900', marginTop: 5 },
  descriptionCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 18,
    marginHorizontal: 18,
    marginTop: 16,
  },
  sectionTitle: { color: '#F3FFF9', fontSize: 19, fontWeight: '900', marginTop: 5 },
  description: { color: '#A2B3AB', fontSize: 14, lineHeight: 22, marginTop: 11 },
  fragmentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 25 },
  addFragmentButton: { borderRadius: 14, backgroundColor: '#62E6B1', paddingHorizontal: 13, paddingVertical: 10 },
  addFragmentButtonText: { color: '#071310', fontSize: 11, fontWeight: '900' },
  fragmentLoader: { marginTop: 24 },
  fragmentCard: { borderRadius: 22, borderWidth: 1, borderColor: '#285345', backgroundColor: '#10251E', padding: 17, marginHorizontal: 18, marginTop: 12 },
  fragmentTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fragmentDate: { color: '#62E6B1', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  draftBadge: { color: '#071310', backgroundColor: '#E9B949', fontSize: 8, fontWeight: '900', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  fragmentTitle: { color: '#F3FFF9', fontSize: 18, fontWeight: '900', marginTop: 10 },
  fragmentBody: { color: '#A2B3AB', fontSize: 13, lineHeight: 20, marginTop: 7 },
  fragmentGallery: { gap: 10, paddingTop: 13 },
  fragmentImage: { width: 245, height: 190, borderRadius: 16 },
  fragmentActions: { flexDirection: 'row', gap: 9, marginTop: 13 },
  fragmentEditButton: { flex: 1, alignItems: 'center', borderRadius: 13, backgroundColor: '#28634F', padding: 11 },
  fragmentEditText: { color: '#F3FFF9', fontSize: 11, fontWeight: '900' },
  fragmentDeleteButton: { flex: 1, alignItems: 'center', borderRadius: 13, borderWidth: 1, borderColor: '#7B3535', padding: 11 },
  fragmentDeleteText: { color: '#FFB8B8', fontSize: 11, fontWeight: '900' },
  emptyFragments: { borderRadius: 18, borderWidth: 1, borderColor: '#19392E', padding: 18, marginHorizontal: 18, marginTop: 12 },
  emptyFragmentsText: { color: '#71877D', fontSize: 12, textAlign: 'center' },
  statsSection: { marginHorizontal: 18, marginTop: 24 },
  statsTitle: { color: '#F3FFF9', fontSize: 19, fontWeight: '900', marginTop: 5, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', minHeight: 88, justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#19392E', backgroundColor: '#0C1C17', padding: 14 },
  statValue: { color: '#62E6B1', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#81958C', fontSize: 10, fontWeight: '800', marginTop: 5 },
  statsHelper: { color: '#63766D', fontSize: 10, lineHeight: 15, marginTop: 9 },
  routeMapCard: { overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: '#285345', backgroundColor: '#10251E', marginHorizontal: 18, marginTop: 16 },
  routeMapHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  routeMapTitle: { color: '#F3FFF9', fontSize: 18, fontWeight: '900', marginTop: 4 },
  routeMapCount: { color: '#82AA99', fontSize: 10, fontWeight: '800' },
  routeMap: { width: '100%', height: 260 },
  routeMapHelper: { color: '#71877D', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, paddingVertical: 12 },
  coordinatesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#173D31',
    padding: 15,
    marginHorizontal: 18,
    marginTop: 12,
  },
  coordinatesIcon: { color: '#62E6B1', fontSize: 25, marginRight: 12 },
  coordinatesTitle: { color: '#F3FFF9', fontSize: 12, fontWeight: '900' },
  coordinatesText: { color: '#82AA99', fontSize: 11, marginTop: 4 },
  directionsButton: { marginLeft: 'auto', borderRadius: 13, backgroundColor: '#62E6B1', paddingHorizontal: 12, paddingVertical: 9 },
  directionsButtonText: { color: '#071310', fontSize: 11, fontWeight: '900' },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: '#F3FFF9', fontSize: 21, fontWeight: '900', marginTop: 13 },
  emptyText: {
    color: '#81958C',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#62E6B1',
    paddingHorizontal: 22,
    marginTop: 20,
  },
  primaryButtonText: { color: '#071310', fontSize: 13, fontWeight: '900' },
  ownerActions: { marginHorizontal: 18, marginTop: 22, gap: 10 },
  editButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#62E6B1' },
  editButtonText: { color: '#071310', fontSize: 14, fontWeight: '900' },
  deleteButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: '#7B3535', backgroundColor: '#261414' },
  deleteButtonText: { color: '#FFB8B8', fontSize: 14, fontWeight: '900' },
  reportButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginHorizontal: 18, marginTop: 20 },
  reportButtonText: { color: '#81958C', fontSize: 11, fontWeight: '800' },
});
