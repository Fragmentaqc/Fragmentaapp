import {
  Adventure,
  useAdventures,
} from '@/context/adventures-context';
import { useAuth } from '@/context/auth-context';
import {
  Curiosity,
  useCuriosities,
} from '@/context/curiosities-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ExploreCategory =
  | 'Tout'
  | 'Lieu insolite'
  | 'Histoire locale'
  | 'Architecture étrange'
  | 'Nature remarquable'
  | 'Art public'
  | 'Point de vue'
  | 'Route oubliée'
  | 'Musée atypique'
  | 'Commerce unique'
  | 'Mystère local';

const categories: ExploreCategory[] = [
  'Tout',
  'Lieu insolite',
  'Histoire locale',
  'Architecture étrange',
  'Nature remarquable',
  'Art public',
  'Point de vue',
  'Route oubliée',
  'Musée atypique',
  'Commerce unique',
  'Mystère local',
];

type Coordinate = { latitude: number; longitude: number };

function distanceInKm(from: Coordinate, latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return Number.POSITIVE_INFINITY;
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(latitude - from.latitude);
  const longitudeDelta = toRadians(longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(latitude)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatLocation(curiosity: Curiosity) {
  return (
    curiosity.locationName ||
    curiosity.address ||
    'Emplacement à découvrir'
  );
}

function getVerificationLabel(status: string) {
  if (status === 'verified') {
    return 'Vérifié';
  }

  if (status === 'community_confirmed') {
    return 'Confirmé';
  }

  return 'À vérifier';
}

function getVerificationIcon(status: string) {
  if (status === 'verified') {
    return '✓';
  }

  if (status === 'community_confirmed') {
    return '●';
  }

  return '?';
}

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ search?: string | string[] }>();
  const initialSearch = Array.isArray(params.search) ? params.search[0] : params.search;
  const { user } = useAuth();

  const {
    curiosities,
    loading: curiositiesLoading,
    refreshCuriosities,
  } = useCuriosities();

  const {
    adventures,
    loading: adventuresLoading,
  } = useAdventures();

  const [selectedCategory, setSelectedCategory] =
    useState<ExploreCategory>('Tout');

  const [search, setSearch] = useState(initialSearch ?? '');
  const [userCoordinate, setUserCoordinate] = useState<Coordinate | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (typeof initialSearch === 'string') setSearch(initialSearch);
  }, [initialSearch]);

  async function toggleNearby() {
    if (userCoordinate) {
      setUserCoordinate(null);
      return;
    }
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Localisation désactivée', 'Autorise la localisation pour trier les découvertes près de toi.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserCoordinate({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      Alert.alert('GPS indisponible', 'Impossible de récupérer ta position pour le moment.');
    } finally {
      setLocating(false);
    }
  }

  const publishedCuriosities = useMemo(() => {
    return curiosities.filter(
      (curiosity) => curiosity.status === 'published'
    );
  }, [curiosities]);

  const filteredCuriosities = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const results = publishedCuriosities.filter((curiosity) => {
      const matchesCategory =
        selectedCategory === 'Tout' ||
        curiosity.category === selectedCategory;

      const searchableContent = [
        curiosity.title,
        curiosity.description,
        curiosity.category,
        curiosity.locationName,
        curiosity.address,
        curiosity.authorName,
        curiosity.authorHandle,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableContent.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
    return userCoordinate
      ? [...results].sort((first, second) =>
          distanceInKm(userCoordinate, first.latitude, first.longitude) -
          distanceInKm(userCoordinate, second.latitude, second.longitude)
        )
      : results;
  }, [
    publishedCuriosities,
    search,
    selectedCategory,
    userCoordinate,
  ]);

  const filteredAdventures = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const results = adventures.filter((adventure) => {
      if (adventure.publicationStatus !== 'published') {
        return false;
      }

      const searchableContent = [
        adventure.title,
        adventure.description,
        adventure.location,
        adventure.category,
        adventure.user,
        adventure.handle,
      ]
        .join(' ')
        .toLowerCase();

      return (
        !normalizedSearch ||
        searchableContent.includes(normalizedSearch)
      );
    });
    return userCoordinate
      ? [...results].sort((first, second) =>
          distanceInKm(userCoordinate, first.latitude, first.longitude) -
          distanceInKm(userCoordinate, second.latitude, second.longitude)
        )
      : results;
  }, [adventures, search, userCoordinate]);

  const featuredCuriosity =
    filteredCuriosities.length > 0
      ? filteredCuriosities[0]
      : null;

  const remainingCuriosities =
    filteredCuriosities.length > 1
      ? filteredCuriosities.slice(1)
      : [];

  const loading =
    curiositiesLoading || adventuresLoading;

  function openAddCuriosity() {
    if (!user) {
      Alert.alert(
        'Connexion requise',
        'Tu dois être connecté pour ajouter une curiosité.',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Se connecter',
            onPress: () => router.push('/auth'),
          },
        ]
      );

      return;
    }

    router.push('/add-curiosity');
  }

  function openRandomCuriosity() {
    if (filteredCuriosities.length === 0) {
      Alert.alert(
        'Aucune curiosité',
        'Aucune curiosité ne correspond aux filtres actuels.'
      );

      return;
    }

    const randomIndex = Math.floor(
      Math.random() * filteredCuriosities.length
    );

    const randomCuriosity =
      filteredCuriosities[randomIndex];

    router.push({ pathname: '/curiosity/[id]', params: { id: randomCuriosity.id } });
  }

  function openCuriosity(curiosity: Curiosity) {
    router.push({ pathname: '/curiosity/[id]', params: { id: curiosity.id } });
  }

  function openAdventure(adventure: Adventure) {
    router.push({
      pathname: '/adventure/[id]',
      params: {
        id: adventure.id,
      },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleArea}>
              <Text style={styles.eyebrow}>
                EXPLORER FRAGMENTA
              </Text>

              <Text style={styles.title}>
                Découvre ce que les guides oublient
              </Text>
            </View>

            <Pressable
              style={styles.addHeaderButton}
              onPress={openAddCuriosity}
            >
              <Text style={styles.addHeaderIcon}>＋</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Lieux étranges, histoires locales, routes
            oubliées et découvertes partagées par la
            communauté.
          </Text>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un lieu, une ville ou une histoire"
            placeholderTextColor="#657970"
            style={styles.searchInput}
            returnKeyType="search"
          />

          {search.length > 0 ? (
            <Pressable
              style={styles.clearButton}
              onPress={() => setSearch('')}
            >
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable style={styles.memberSearchButton} onPress={() => router.push('/members' as never)}>
          <Text style={styles.memberSearchIcon}>◎</Text>
          <View style={styles.memberSearchContent}><Text style={styles.memberSearchTitle}>Rechercher parmi les membres</Text><Text style={styles.memberSearchText}>Filtre par pays ou type d’aventure et abonne-toi directement</Text></View>
          <Text style={styles.memberSearchArrow}>›</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          <Pressable
            onPress={() => void toggleNearby()}
            disabled={locating}
            style={[
              styles.categoryButton,
              userCoordinate && styles.categoryButtonSelected,
            ]}
          >
            <Text style={[
              styles.categoryText,
              userCoordinate && styles.categoryTextSelected,
            ]}>
              {locating ? 'Localisation…' : '◎ Près de moi'}
            </Text>
          </Pressable>
          {categories.map((category) => {
            const isSelected =
              category === selectedCategory;

            return (
              <Pressable
                key={category}
                onPress={() =>
                  setSelectedCategory(category)
                }
                style={[
                  styles.categoryButton,
                  isSelected &&
                    styles.categoryButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected &&
                      styles.categoryTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {userCoordinate ? (
          <View style={styles.nearbyNotice}>
            <Text style={styles.nearbyNoticeText}>
              Triés du plus proche au plus loin
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator
              size="large"
              color="#C99A2E"
            />

            <Text style={styles.loadingText}>
              Découverte des curiosités…
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>
                  SÉLECTION COMMUNAUTAIRE
                </Text>

                <Text style={styles.sectionTitle}>
                  Curiosités à découvrir
                </Text>
              </View>

              <Pressable
                style={styles.refreshButton}
                onPress={() => {
                  void refreshCuriosities();
                }}
              >
                <Text style={styles.refreshText}>↻</Text>
              </Pressable>
            </View>

            {featuredCuriosity ? (
              <FeaturedCuriosityCard
                curiosity={featuredCuriosity}
                onPress={() =>
                  openCuriosity(featuredCuriosity)
                }
              />
            ) : (
              <EmptyCuriosities
                onAdd={openAddCuriosity}
              />
            )}

            {remainingCuriosities.length > 0 ? (
              <>
                <View style={styles.smallSectionHeader}>
                  <Text style={styles.smallSectionTitle}>
                    Plus de découvertes
                  </Text>

                  <Text style={styles.resultCount}>
                    {remainingCuriosities.length}
                  </Text>
                </View>

                <View style={styles.curiositiesGrid}>
                  {remainingCuriosities.map(
                    (curiosity) => (
                      <CuriosityCard
                        key={curiosity.id}
                        curiosity={curiosity}
                        onPress={() =>
                          openCuriosity(curiosity)
                        }
                      />
                    )
                  )}
                </View>
              </>
            ) : null}

            <Pressable
              style={styles.randomCard}
              onPress={openRandomCuriosity}
            >
              <View style={styles.randomIcon}>
                <Text style={styles.randomEmoji}>
                  🧭
                </Text>
              </View>

              <View style={styles.randomContent}>
                <Text style={styles.randomTitle}>
                  Découverte au hasard
                </Text>

                <Text style={styles.randomText}>
                  Laisse Fragmenta choisir une curiosité
                  inattendue.
                </Text>
              </View>

              <View style={styles.randomButton}>
                <Text style={styles.randomArrow}>›</Text>
              </View>
            </Pressable>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>
                  HISTOIRES DE LA COMMUNAUTÉ
                </Text>

                <Text style={styles.sectionTitle}>
                  Aventures récentes
                </Text>
              </View>

              <Text style={styles.resultCount}>
                {filteredAdventures.length}
              </Text>
            </View>

            {filteredAdventures.length > 0 ? (
              <View style={styles.adventuresList}>
                {filteredAdventures
                  .slice(0, 8)
                  .map((adventure) => (
                    <AdventureCard
                      key={adventure.id}
                      adventure={adventure}
                      onPress={() =>
                        openAdventure(adventure)
                      }
                    />
                  ))}
              </View>
            ) : (
              <View style={styles.emptyCommunity}>
                <Text style={styles.emptyCommunityIcon}>
                  🗺️
                </Text>

                <Text style={styles.emptyCommunityTitle}>
                  Aucune aventure trouvée
                </Text>

                <Text style={styles.emptyCommunityText}>
                  Les aventures publiées apparaîtront ici.
                </Text>
              </View>
            )}

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FeaturedCuriosityCard({
  curiosity,
  onPress,
}: {
  curiosity: Curiosity;
  onPress: () => void;
}) {
  const coverImage = curiosity.images[0];

  return (
    <Pressable
      style={styles.featuredCard}
      onPress={onPress}
    >
      {coverImage ? (
        <Image
          source={{ uri: coverImage }}
          style={styles.featuredImage}
        />
      ) : (
        <View style={styles.featuredFallback}>
          <Text style={styles.featuredFallbackEmoji}>
            🧭
          </Text>

          <Text style={styles.featuredFallbackText}>
            Curiosité Fragmenta
          </Text>
        </View>
      )}

      <View style={styles.featuredOverlay} />

      <View style={styles.featuredTopRow}>
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>
            {curiosity.category}
          </Text>
        </View>

        <View style={styles.verificationBadge}>
          <Text style={styles.verificationIcon}>
            {getVerificationIcon(
              curiosity.verificationStatus
            )}
          </Text>

          <Text style={styles.verificationText}>
            {getVerificationLabel(
              curiosity.verificationStatus
            )}
          </Text>
        </View>
      </View>

      <View style={styles.featuredContent}>
        <Text
          style={styles.featuredTitle}
          numberOfLines={2}
        >
          {curiosity.title}
        </Text>

        <Text style={styles.featuredLocation}>
          ◉ {formatLocation(curiosity)}
        </Text>

        <Text
          style={styles.featuredDescription}
          numberOfLines={3}
        >
          {curiosity.description}
        </Text>

        <View style={styles.featuredFooter}>
          <View style={styles.featuredAuthor}>
            <View style={styles.featuredAvatar}>
              <Text style={styles.featuredAvatarText}>
                {curiosity.authorName
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View>
              <Text style={styles.featuredAuthorName}>
                {curiosity.authorName}
              </Text>

              <Text style={styles.featuredAuthorHandle}>
                {curiosity.authorHandle}
              </Text>
            </View>
          </View>

          <View style={styles.featuredOpenButton}>
            <Text style={styles.featuredOpenText}>
              Explorer
            </Text>

            <Text style={styles.featuredOpenArrow}>
              ›
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function CuriosityCard({
  curiosity,
  onPress,
}: {
  curiosity: Curiosity;
  onPress: () => void;
}) {
  const coverImage = curiosity.images[0];

  return (
    <Pressable
      style={styles.curiosityCard}
      onPress={onPress}
    >
      {coverImage ? (
        <Image
          source={{ uri: coverImage }}
          style={styles.curiosityImage}
        />
      ) : (
        <View style={styles.curiosityFallback}>
          <Text style={styles.curiosityFallbackEmoji}>
            📍
          </Text>
        </View>
      )}

      <View style={styles.curiosityOverlay} />

      <View style={styles.curiosityContent}>
        <Text style={styles.curiosityCategory}>
          {curiosity.category}
        </Text>

        <Text
          style={styles.curiosityTitle}
          numberOfLines={2}
        >
          {curiosity.title}
        </Text>

        <Text
          style={styles.curiosityLocation}
          numberOfLines={1}
        >
          ◉ {formatLocation(curiosity)}
        </Text>

        <View style={styles.curiosityFooter}>
          <Text style={styles.curiosityAuthor}>
            {curiosity.authorHandle}
          </Text>

          <Text style={styles.curiosityArrow}>›</Text>
        </View>
      </View>
    </Pressable>
  );
}

function AdventureCard({
  adventure,
  onPress,
}: {
  adventure: Adventure;
  onPress: () => void;
}) {
  const coverImage = adventure.images[0];

  return (
    <Pressable
      style={styles.adventureCard}
      onPress={onPress}
    >
      {coverImage ? (
        <Image
          source={{ uri: coverImage }}
          style={styles.adventureImage}
        />
      ) : (
        <View style={styles.adventureFallback}>
          <Text style={styles.adventureEmoji}>
            {adventure.emoji}
          </Text>
        </View>
      )}

      <View style={styles.adventureOverlay} />

      <View style={styles.adventureContent}>
        <View style={styles.adventureTopRow}>
          <Text style={styles.adventureCategory}>
            {adventure.category}
          </Text>

          <Text style={styles.adventureDate}>
            {adventure.day}
          </Text>
        </View>

        <Text
          style={styles.adventureTitle}
          numberOfLines={2}
        >
          {adventure.title}
        </Text>

        <Text
          style={styles.adventureLocation}
          numberOfLines={1}
        >
          ◉ {adventure.location}
        </Text>

        <Text
          style={styles.adventureDescription}
          numberOfLines={2}
        >
          {adventure.description}
        </Text>

        <View style={styles.adventureFooter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {adventure.user.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.authorText}>
            <Text
              style={styles.authorName}
              numberOfLines={1}
            >
              {adventure.user}
            </Text>

            <Text style={styles.authorHandle}>
              {adventure.handle}
            </Text>
          </View>

          <View style={styles.openCircle}>
            <Text style={styles.openCircleText}>›</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyCuriosities({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <View style={styles.emptyCuriosities}>
      <View style={styles.emptyCuriositiesIcon}>
        <Text style={styles.emptyCuriositiesEmoji}>
          🔎
        </Text>
      </View>

      <Text style={styles.emptyCuriositiesTitle}>
        Aucun lieu trouvé
      </Text>

      <Text style={styles.emptyCuriositiesText}>
        Modifie ta recherche ou ajoute la première curiosité de
        cette catégorie.
      </Text>

      <Pressable
        style={styles.emptyAddButton}
        onPress={onAdd}
      >
        <Text style={styles.emptyAddButtonText}>
          Ajouter une curiosité
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#071A1C',
  },

  container: {
    paddingTop: 22,
    paddingBottom: 110,
  },

  header: {
    paddingHorizontal: 22,
    marginBottom: 24,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  headerTitleArea: {
    flex: 1,
    paddingRight: 14,
  },

  eyebrow: {
    color: '#C99A2E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },

  title: {
    color: '#F4EBD8',
    fontSize: 39,
    lineHeight: 44,
    fontWeight: '900',
    marginTop: 8,
  },

  subtitle: {
    color: '#C9D6D1',
    maxWidth: 430,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },

  addHeaderButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#C99A2E',
  },

  addHeaderIcon: {
    color: '#071A1C',
    fontSize: 30,
    fontWeight: '500',
    marginTop: -2,
  },

  contributionCard: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#2B6552',
    backgroundColor: '#16484C',
    padding: 16,
    marginBottom: 17,
  },

  contributionIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#1D5A5E',
  },

  contributionEmoji: {
    fontSize: 28,
  },

  contributionContent: {
    flex: 1,
    marginLeft: 14,
  },

  contributionEyebrow: {
    color: '#C99A2E',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  contributionTitle: {
    color: '#F4EBD8',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },

  contributionText: {
    color: '#C9D6D1',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  contributionArrow: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#C99A2E',
    marginLeft: 10,
  },

  contributionArrowText: {
    color: '#071A1C',
    fontSize: 26,
    fontWeight: '800',
  },

  searchBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderBottomWidth: 1,
    borderColor: '#4B8180',
    backgroundColor: '#10363A',
    paddingHorizontal: 15,
    marginHorizontal: 22,
  },

  memberSearchButton: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderRadius: 0, backgroundColor: '#0B2528', paddingHorizontal: 15, marginHorizontal: 22, marginTop: 10 },
  memberSearchIcon: { color: '#C99A2E', fontSize: 27 }, memberSearchContent: { flex: 1, marginLeft: 12 }, memberSearchTitle: { color: '#F4EBD8', fontSize: 14, fontWeight: '900' }, memberSearchText: { color: '#B8C8C2', fontSize: 10, lineHeight: 15, marginTop: 4 }, memberSearchArrow: { color: '#C99A2E', fontSize: 28 },

  searchIcon: {
    color: '#C99A2E',
    fontSize: 26,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: '#F4EBD8',
    fontSize: 14,
  },

  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#1D5A5E',
  },

  clearText: {
    color: '#FFF6E5',
    fontSize: 21,
  },

  categories: {
    gap: 9,
    paddingHorizontal: 22,
    paddingTop: 15,
    paddingBottom: 8,
  },

  categoryButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#10363A',
    paddingHorizontal: 15,
  },

  categoryButtonSelected: {
    borderColor: '#C99A2E',
    backgroundColor: '#C99A2E',
  },

  categoryText: {
    color: '#9EB0A8',
    fontSize: 12,
    fontWeight: '800',
  },

  categoryTextSelected: {
    color: '#071A1C',
    fontWeight: '900',
  },

  nearbyNotice: { alignSelf: 'flex-start', borderRadius: 0, backgroundColor: '#1D5A5E', paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 22, marginTop: 4 },
  nearbyNoticeText: { color: '#C99A2E', fontSize: 10, fontWeight: '800' },

  loadingArea: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#B8C8C2',
    fontSize: 13,
    marginTop: 13,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    marginTop: 44,
    marginBottom: 18,
  },

  sectionEyebrow: {
    color: '#C99A2E',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  sectionTitle: {
    color: '#F4EBD8',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 4,
  },

  refreshButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#1D5A5E',
  },

  refreshText: {
    color: '#C99A2E',
    fontSize: 20,
    fontWeight: '900',
  },

  resultCount: {
    minWidth: 32,
    height: 32,
    color: '#FFF6E5',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 0,
    backgroundColor: '#1D5A5E',
  },

  featuredCard: {
    minHeight: 540,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#16484C',
  },

  featuredImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  featuredFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D5A5E',
  },

  featuredFallbackEmoji: {
    fontSize: 65,
  },

  featuredFallbackText: {
    color: '#82AA99',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },

  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 10, 8, 0.49)',
  },

  featuredTopRow: {
    position: 'absolute',
    top: 22,
    left: 22,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  featuredBadge: {
    maxWidth: '58%',
    borderRadius: 0,
    backgroundColor: 'rgba(7, 19, 16, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  featuredBadgeText: {
    color: '#C99A2E',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    backgroundColor: 'rgba(7, 19, 16, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  verificationIcon: {
    width: 18,
    height: 18,
    color: '#071A1C',
    fontSize: 10,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
    borderRadius: 0,
    backgroundColor: '#C99A2E',
    overflow: 'hidden',
    marginRight: 6,
  },

  verificationText: {
    color: '#FFF6E5',
    fontSize: 9,
    fontWeight: '900',
  },

  featuredContent: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 26,
    borderLeftWidth: 3,
    borderLeftColor: '#C99A2E',
    paddingLeft: 16,
  },

  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '900',
  },

  featuredLocation: {
    color: '#E4C778',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },

  featuredDescription: {
    color: '#D0DED8',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },

  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  featuredAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  featuredAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#3D705D',
    backgroundColor: '#1D5A5E',
    marginRight: 9,
  },

  featuredAvatarText: {
    color: '#C99A2E',
    fontSize: 15,
    fontWeight: '900',
  },

  featuredAuthorName: {
    color: '#F4EBD8',
    fontSize: 11,
    fontWeight: '900',
  },

  featuredAuthorHandle: {
    color: '#82988E',
    fontSize: 9,
    marginTop: 3,
  },

  featuredOpenButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    backgroundColor: '#C99A2E',
    paddingHorizontal: 14,
    marginLeft: 8,
  },

  featuredOpenText: {
    color: '#071A1C',
    fontSize: 11,
    fontWeight: '900',
  },

  featuredOpenArrow: {
    color: '#071A1C',
    fontSize: 23,
    fontWeight: '800',
    marginLeft: 5,
  },

  smallSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    marginTop: 34,
    marginBottom: 13,
  },

  smallSectionTitle: {
    color: '#F4EBD8',
    fontSize: 17,
    fontWeight: '900',
  },

  curiositiesGrid: {
    gap: 10,
  },

  curiosityCard: {
    height: 330,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#10363A',
  },

  curiosityImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  curiosityFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D5A5E',
  },

  curiosityOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,18,20,.44)' },

  curiosityFallbackEmoji: {
    fontSize: 37,
  },

  curiosityContent: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 20,
  },

  curiosityCategory: {
    color: '#C99A2E',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  curiosityTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '900',
    marginTop: 6,
  },

  curiosityLocation: {
    color: '#E4C778',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 7,
  },

  curiosityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  curiosityAuthor: {
    color: '#E6E2D5',
    fontSize: 9,
    fontWeight: '700',
  },

  curiosityArrow: {
    color: '#C99A2E',
    fontSize: 23,
    fontWeight: '800',
  },

  randomCard: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    backgroundColor: '#16484C',
    padding: 15,
    marginHorizontal: 22,
    marginTop: 28,
  },

  randomIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#1D5A5E',
  },

  randomEmoji: {
    fontSize: 25,
  },

  randomContent: {
    flex: 1,
    marginLeft: 13,
  },

  randomTitle: {
    color: '#F4EBD8',
    fontSize: 15,
    fontWeight: '900',
  },

  randomText: {
    color: '#B8C8C2',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  randomButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#C99A2E',
    marginLeft: 10,
  },

  randomArrow: {
    color: '#071A1C',
    fontSize: 27,
    fontWeight: '800',
  },

  adventuresList: {
    gap: 10,
  },

  adventureCard: {
    overflow: 'hidden',
    height: 410,
    borderRadius: 0,
    backgroundColor: '#10363A',
  },

  adventureImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  adventureFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D5A5E',
  },

  adventureOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,17,19,.5)' },

  adventureEmoji: {
    fontSize: 44,
  },

  adventureContent: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 22,
  },

  adventureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  adventureCategory: {
    color: '#C99A2E',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  adventureDate: {
    color: '#657970',
    fontSize: 9,
    fontWeight: '700',
  },

  adventureTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 8,
  },

  adventureLocation: {
    color: '#E4C778',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
  },

  adventureDescription: {
    color: '#C9D6D1',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
  },

  adventureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  avatar: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#1D5A5E',
  },

  avatarText: {
    color: '#C99A2E',
    fontSize: 12,
    fontWeight: '900',
  },

  authorText: {
    flex: 1,
    marginLeft: 8,
  },

  authorName: {
    color: '#FFF6E5',
    fontSize: 10,
    fontWeight: '800',
  },

  authorHandle: {
    color: '#657970',
    fontSize: 9,
    marginTop: 1,
  },

  openCircle: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#C99A2E',
  },

  openCircleText: {
    color: '#071A1C',
    fontSize: 21,
    fontWeight: '800',
  },

  emptyCuriosities: {
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#275456',
    backgroundColor: '#10363A',
    padding: 28,
  },

  emptyCuriositiesIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#1D5A5E',
  },

  emptyCuriositiesEmoji: {
    fontSize: 29,
  },

  emptyCuriositiesTitle: {
    color: '#F4EBD8',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 13,
  },

  emptyCuriositiesText: {
    color: '#B8C8C2',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },

  emptyAddButton: {
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#C99A2E',
    paddingHorizontal: 16,
    marginTop: 16,
  },

  emptyAddButtonText: {
    color: '#071A1C',
    fontSize: 12,
    fontWeight: '900',
  },

  emptyCommunity: {
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#275456',
    backgroundColor: '#10363A',
    padding: 28,
  },

  emptyCommunityIcon: {
    fontSize: 32,
  },

  emptyCommunityTitle: {
    color: '#F4EBD8',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },

  emptyCommunityText: {
    color: '#B8C8C2',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },

  bottomBanner: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#3C7475',
    backgroundColor: '#16484C',
    padding: 22,
    marginTop: 28,
  },

  bottomBannerEyebrow: {
    color: '#C99A2E',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  bottomBannerTitle: {
    color: '#F4EBD8',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    marginTop: 7,
  },

  bottomBannerText: {
    color: '#C9D6D1',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
});
