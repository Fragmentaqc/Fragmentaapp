import {
  type Adventure,
  useAdventures,
} from '@/context/adventures-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { openDirections } from '@/lib/directions';
import { useState } from 'react';
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
  const [deleting, setDeleting] = useState(false);
  const adventureId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;
  const adventure = adventures.find((item) => item.id === adventureId);

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
        ) : null}
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
});
