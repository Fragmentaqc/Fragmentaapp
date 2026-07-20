import {
  Adventure,
  useAdventures,
} from '@/context/adventures-context';
import { useAuth } from '@/context/auth-context';
import {
  Curiosity,
  useCuriosities,
} from '@/context/curiosities-context';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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

  const [search, setSearch] = useState('');

  const publishedCuriosities = useMemo(() => {
    return curiosities.filter(
      (curiosity) => curiosity.status === 'published'
    );
  }, [curiosities]);

  const filteredCuriosities = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return publishedCuriosities.filter((curiosity) => {
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
  }, [
    publishedCuriosities,
    search,
    selectedCategory,
  ]);

  const filteredAdventures = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return adventures.filter((adventure) => {
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
  }, [adventures, search]);

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

    Alert.alert(
      randomCuriosity.title,
      `${formatLocation(randomCuriosity)}\n\n${randomCuriosity.description}`
    );
  }

  function openCuriosity(curiosity: Curiosity) {
    Alert.alert(
      curiosity.title,
      `${formatLocation(curiosity)}\n\n${curiosity.description}`
    );
  }

  function openAdventure(adventure: Adventure) {
    Alert.alert(
      adventure.title,
      `${adventure.location}\n\n${adventure.description}`
    );
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

        <Pressable
          style={styles.contributionCard}
          onPress={openAddCuriosity}
        >
          <View style={styles.contributionIcon}>
            <Text style={styles.contributionEmoji}>
              📍
            </Text>
          </View>

          <View style={styles.contributionContent}>
            <Text style={styles.contributionEyebrow}>
              CONTRIBUTION COMMUNAUTAIRE
            </Text>

            <Text style={styles.contributionTitle}>
              Ajouter une curiosité
            </Text>

            <Text style={styles.contributionText}>
              Partage un lieu étrange, historique ou
              remarquable découvert pendant une aventure.
            </Text>
          </View>

          <View style={styles.contributionArrow}>
            <Text style={styles.contributionArrowText}>
              ›
            </Text>
          </View>
        </Pressable>

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
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

        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator
              size="large"
              color="#62E6B1"
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

            <View style={styles.bottomBanner}>
              <Text style={styles.bottomBannerEyebrow}>
                FRAGMENTA
              </Text>

              <Text style={styles.bottomBannerTitle}>
                Chaque détour peut cacher une histoire
              </Text>

              <Text style={styles.bottomBannerText}>
                Explore, documente et partage les endroits qui
                méritent de ne pas être oubliés.
              </Text>
            </View>
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
    backgroundColor: '#071310',
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 135,
  },

  header: {
    marginBottom: 20,
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
    color: '#62E6B1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },

  title: {
    color: '#F3FFF9',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    marginTop: 8,
  },

  subtitle: {
    color: '#8FA69B',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 11,
  },

  addHeaderButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#62E6B1',
  },

  addHeaderIcon: {
    color: '#071310',
    fontSize: 30,
    fontWeight: '500',
    marginTop: -2,
  },

  contributionCard: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2B6552',
    backgroundColor: '#10251E',
    padding: 16,
    marginBottom: 17,
  },

  contributionIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#173D31',
  },

  contributionEmoji: {
    fontSize: 28,
  },

  contributionContent: {
    flex: 1,
    marginLeft: 14,
  },

  contributionEyebrow: {
    color: '#62E6B1',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  contributionTitle: {
    color: '#F3FFF9',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },

  contributionText: {
    color: '#8FA69B',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  contributionArrow: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#62E6B1',
    marginLeft: 10,
  },

  contributionArrowText: {
    color: '#071310',
    fontSize: 26,
    fontWeight: '800',
  },

  searchBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#0C1C17',
    paddingHorizontal: 15,
  },

  searchIcon: {
    color: '#62E6B1',
    fontSize: 26,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: '#F3FFF9',
    fontSize: 14,
  },

  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#173D31',
  },

  clearText: {
    color: '#DFFFF2',
    fontSize: 21,
  },

  categories: {
    gap: 9,
    paddingTop: 15,
    paddingBottom: 8,
  },

  categoryButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#0C1C17',
    paddingHorizontal: 15,
  },

  categoryButtonSelected: {
    borderColor: '#62E6B1',
    backgroundColor: '#62E6B1',
  },

  categoryText: {
    color: '#9EB0A8',
    fontSize: 12,
    fontWeight: '800',
  },

  categoryTextSelected: {
    color: '#071310',
    fontWeight: '900',
  },

  loadingArea: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#81958C',
    fontSize: 13,
    marginTop: 13,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 14,
  },

  sectionEyebrow: {
    color: '#62E6B1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  sectionTitle: {
    color: '#F3FFF9',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },

  refreshButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#173D31',
  },

  refreshText: {
    color: '#62E6B1',
    fontSize: 20,
    fontWeight: '900',
  },

  resultCount: {
    minWidth: 32,
    height: 32,
    color: '#DFFFF2',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 16,
    backgroundColor: '#173D31',
  },

  featuredCard: {
    minHeight: 430,
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#285345',
    backgroundColor: '#10251E',
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
    backgroundColor: '#173D31',
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
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  featuredBadge: {
    maxWidth: '58%',
    borderRadius: 999,
    backgroundColor: 'rgba(7, 19, 16, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  featuredBadgeText: {
    color: '#62E6B1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(7, 19, 16, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  verificationIcon: {
    width: 18,
    height: 18,
    color: '#071310',
    fontSize: 10,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
    borderRadius: 9,
    backgroundColor: '#62E6B1',
    overflow: 'hidden',
    marginRight: 6,
  },

  verificationText: {
    color: '#DFFFF2',
    fontSize: 9,
    fontWeight: '900',
  },

  featuredContent: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 19,
  },

  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
  },

  featuredLocation: {
    color: '#8EF0C5',
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3D705D',
    backgroundColor: '#173D31',
    marginRight: 9,
  },

  featuredAvatarText: {
    color: '#62E6B1',
    fontSize: 15,
    fontWeight: '900',
  },

  featuredAuthorName: {
    color: '#F3FFF9',
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
    borderRadius: 15,
    backgroundColor: '#62E6B1',
    paddingHorizontal: 14,
    marginLeft: 8,
  },

  featuredOpenText: {
    color: '#071310',
    fontSize: 11,
    fontWeight: '900',
  },

  featuredOpenArrow: {
    color: '#071310',
    fontSize: 23,
    fontWeight: '800',
    marginLeft: 5,
  },

  smallSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 23,
    marginBottom: 13,
  },

  smallSectionTitle: {
    color: '#F3FFF9',
    fontSize: 17,
    fontWeight: '900',
  },

  curiositiesGrid: {
    gap: 12,
  },

  curiosityCard: {
    minHeight: 135,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
  },

  curiosityImage: {
    width: 122,
    minHeight: 135,
  },

  curiosityFallback: {
    width: 122,
    minHeight: 135,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#173D31',
  },

  curiosityFallbackEmoji: {
    fontSize: 37,
  },

  curiosityContent: {
    flex: 1,
    padding: 13,
  },

  curiosityCategory: {
    color: '#62E6B1',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  curiosityTitle: {
    color: '#F3FFF9',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    marginTop: 6,
  },

  curiosityLocation: {
    color: '#79BDA1',
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
    color: '#6E857B',
    fontSize: 9,
    fontWeight: '700',
  },

  curiosityArrow: {
    color: '#62E6B1',
    fontSize: 23,
    fontWeight: '800',
  },

  randomCard: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#10251E',
    padding: 15,
    marginTop: 22,
  },

  randomIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#173D31',
  },

  randomEmoji: {
    fontSize: 25,
  },

  randomContent: {
    flex: 1,
    marginLeft: 13,
  },

  randomTitle: {
    color: '#F3FFF9',
    fontSize: 15,
    fontWeight: '900',
  },

  randomText: {
    color: '#81958C',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  randomButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#62E6B1',
    marginLeft: 10,
  },

  randomArrow: {
    color: '#071310',
    fontSize: 27,
    fontWeight: '800',
  },

  adventuresList: {
    gap: 14,
  },

  adventureCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 190,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
  },

  adventureImage: {
    width: 125,
    minHeight: 190,
  },

  adventureFallback: {
    width: 125,
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#173D31',
  },

  adventureEmoji: {
    fontSize: 44,
  },

  adventureContent: {
    flex: 1,
    padding: 14,
  },

  adventureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  adventureCategory: {
    color: '#62E6B1',
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
    color: '#F3FFF9',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
    marginTop: 8,
  },

  adventureLocation: {
    color: '#78DDB4',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
  },

  adventureDescription: {
    color: '#8FA69B',
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
    borderRadius: 15,
    backgroundColor: '#173D31',
  },

  avatarText: {
    color: '#62E6B1',
    fontSize: 12,
    fontWeight: '900',
  },

  authorText: {
    flex: 1,
    marginLeft: 8,
  },

  authorName: {
    color: '#DFFFF2',
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
    borderRadius: 15,
    backgroundColor: '#62E6B1',
  },

  openCircleText: {
    color: '#071310',
    fontSize: 21,
    fontWeight: '800',
  },

  emptyCuriosities: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 28,
  },

  emptyCuriositiesIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#173D31',
  },

  emptyCuriositiesEmoji: {
    fontSize: 29,
  },

  emptyCuriositiesTitle: {
    color: '#F3FFF9',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 13,
  },

  emptyCuriositiesText: {
    color: '#81958C',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },

  emptyAddButton: {
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#62E6B1',
    paddingHorizontal: 16,
    marginTop: 16,
  },

  emptyAddButtonText: {
    color: '#071310',
    fontSize: 12,
    fontWeight: '900',
  },

  emptyCommunity: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 28,
  },

  emptyCommunityIcon: {
    fontSize: 32,
  },

  emptyCommunityTitle: {
    color: '#F3FFF9',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },

  emptyCommunityText: {
    color: '#81958C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },

  bottomBanner: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#285345',
    backgroundColor: '#10251E',
    padding: 22,
    marginTop: 28,
  },

  bottomBannerEyebrow: {
    color: '#62E6B1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  bottomBannerTitle: {
    color: '#F3FFF9',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    marginTop: 7,
  },

  bottomBannerText: {
    color: '#8FA69B',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
});
