import {
  Adventure,
  useAdventures,
} from '@/context/adventures-context';
import {
  Curiosity,
  useCuriosities,
} from '@/context/curiosities-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Region,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

type ContentFilter =
  | 'Tout'
  | 'Aventures'
  | 'Curiosités';

type SelectedMapItem =
  | {
      type: 'adventure';
      data: Adventure;
    }
  | {
      type: 'curiosity';
      data: Curiosity;
    }
  | null;

type MapCoordinate = {
  latitude: number;
  longitude: number;
};

const initialRegion: Region = {
  latitude: 45.5019,
  longitude: -73.5674,
  latitudeDelta: 7,
  longitudeDelta: 7,
};

const adventureCategoryColors: Record<string, string> = {
  Vélo: '#4DA3FF',
  'Road trip': '#FF9F43',
  'À pied': '#B784F7',
  Camping: '#56D98C',
  Urbain: '#A9B2B8',
  Défi: '#FF6262',
  Autre: '#FFFFFF',
};

const curiosityCategoryColors: Record<string, string> = {
  'Lieu insolite': '#F6C85F',
  'Histoire locale': '#D98E73',
  'Architecture étrange': '#E18FFF',
  'Nature remarquable': '#61D394',
  'Art public': '#FF7BAC',
  'Point de vue': '#59B7FF',
  'Route oubliée': '#FF9F43',
  'Musée atypique': '#BFA6FF',
  'Commerce unique': '#68D7D3',
  'Mystère local': '#F06767',
};

const contentFilters: ContentFilter[] = [
  'Tout',
  'Aventures',
  'Curiosités',
];

function getAdventureColor(category: string) {
  return adventureCategoryColors[category] ?? '#FFFFFF';
}

function getCuriosityColor(category: string) {
  return curiosityCategoryColors[category] ?? '#F6C85F';
}

function hasAdventureCoordinates(adventure: Adventure) {
  return (
    typeof adventure.latitude === 'number' &&
    typeof adventure.longitude === 'number' &&
    Number.isFinite(adventure.latitude) &&
    Number.isFinite(adventure.longitude)
  );
}

function hasCuriosityCoordinates(curiosity: Curiosity) {
  return (
    typeof curiosity.latitude === 'number' &&
    typeof curiosity.longitude === 'number' &&
    Number.isFinite(curiosity.latitude) &&
    Number.isFinite(curiosity.longitude)
  );
}

function getAdventureCoordinate(
  adventure: Adventure
): MapCoordinate {
  return {
    latitude: adventure.latitude as number,
    longitude: adventure.longitude as number,
  };
}

function getCuriosityCoordinate(
  curiosity: Curiosity
): MapCoordinate {
  return {
    latitude: curiosity.latitude as number,
    longitude: curiosity.longitude as number,
  };
}

function getCuriosityLocation(curiosity: Curiosity) {
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
    return 'Confirmé par la communauté';
  }

  return 'À vérifier';
}

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);

  const {
    adventures,
    loading: adventuresLoading,
    refreshAdventures,
  } = useAdventures();

  const {
    curiosities,
    loading: curiositiesLoading,
    refreshCuriosities,
  } = useCuriosities();

  const [contentFilter, setContentFilter] =
    useState<ContentFilter>('Tout');

  const [selectedItem, setSelectedItem] =
    useState<SelectedMapItem>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locating, setLocating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([
        refreshAdventures(),
        refreshCuriosities(),
      ]);
    }, [refreshAdventures, refreshCuriosities])
  );

  async function centerOnUser() {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Localisation désactivée', 'Autorise la localisation dans les réglages du téléphone pour utiliser le bouton Ma position.');
        return;
      }
      setLocationEnabled(true);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.025, longitudeDelta: 0.025 }, 600);
    } catch {
      Alert.alert('GPS indisponible', 'Vérifie que la localisation du téléphone est activée, puis réessaie.');
    } finally {
      setLocating(false);
    }
  }

  const adventuresWithCoordinates = useMemo(() => {
    return adventures.filter(
      (adventure) =>
        adventure.publicationStatus === 'published' &&
        hasAdventureCoordinates(adventure)
    );
  }, [adventures]);

  const curiositiesWithCoordinates = useMemo(() => {
    return curiosities.filter(
      (curiosity) =>
        curiosity.status === 'published' &&
        hasCuriosityCoordinates(curiosity)
    );
  }, [curiosities]);

  const visibleAdventures = useMemo(() => {
    if (contentFilter === 'Curiosités') {
      return [];
    }

    return adventuresWithCoordinates;
  }, [adventuresWithCoordinates, contentFilter]);

  const visibleCuriosities = useMemo(() => {
    if (contentFilter === 'Aventures') {
      return [];
    }

    return curiositiesWithCoordinates;
  }, [curiositiesWithCoordinates, contentFilter]);

  const visiblePointCount =
    visibleAdventures.length +
    visibleCuriosities.length;

  const loading =
    adventuresLoading || curiositiesLoading;

  function getVisibleCoordinates() {
    const adventureCoordinates =
      visibleAdventures.map(getAdventureCoordinate);

    const curiosityCoordinates =
      visibleCuriosities.map(getCuriosityCoordinate);

    return [
      ...adventureCoordinates,
      ...curiosityCoordinates,
    ];
  }

  function showAllPoints() {
    const coordinates = getVisibleCoordinates();

    if (coordinates.length === 0) {
      return;
    }

    if (coordinates.length === 1) {
      mapRef.current?.animateToRegion(
        {
          ...coordinates[0],
          latitudeDelta: 0.35,
          longitudeDelta: 0.35,
        },
        600
      );

      return;
    }

    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 260,
        right: 70,
        bottom: 315,
        left: 70,
      },
      animated: true,
    });
  }

  function selectContentFilter(
    filter: ContentFilter
  ) {
    setContentFilter(filter);
    setSelectedItem(null);

    const adventuresToShow =
      filter === 'Curiosités'
        ? []
        : adventuresWithCoordinates;

    const curiositiesToShow =
      filter === 'Aventures'
        ? []
        : curiositiesWithCoordinates;

    const coordinates = [
      ...adventuresToShow.map(
        getAdventureCoordinate
      ),
      ...curiositiesToShow.map(
        getCuriosityCoordinate
      ),
    ];

    setTimeout(() => {
      if (coordinates.length === 0) {
        return;
      }

      if (coordinates.length === 1) {
        mapRef.current?.animateToRegion(
          {
            ...coordinates[0],
            latitudeDelta: 0.35,
            longitudeDelta: 0.35,
          },
          600
        );

        return;
      }

      mapRef.current?.fitToCoordinates(
        coordinates,
        {
          edgePadding: {
            top: 260,
            right: 70,
            bottom: 315,
            left: 70,
          },
          animated: true,
        }
      );
    }, 100);
  }

  function selectAdventure(adventure: Adventure) {
    setSelectedItem({
      type: 'adventure',
      data: adventure,
    });

    mapRef.current?.animateToRegion(
      {
        ...getAdventureCoordinate(adventure),
        latitudeDelta: 0.3,
        longitudeDelta: 0.3,
      },
      500
    );
  }

  function selectCuriosity(curiosity: Curiosity) {
    setSelectedItem({
      type: 'curiosity',
      data: curiosity,
    });

    mapRef.current?.animateToRegion(
      {
        ...getCuriosityCoordinate(curiosity),
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      },
      500
    );
  }

  function openSelectedItem() {
    if (!selectedItem) {
      return;
    }

    if (selectedItem.type === 'curiosity') {
      router.push({
        pathname: '/curiosity/[id]',
        params: {
          id: selectedItem.data.id,
        },
      });

      return;
    }

    router.push({
      pathname: '/adventure/[id]',
      params: {
        id: selectedItem.data.id,
      },
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#62E6B1"
          />

          <Text style={styles.loadingText}>
            Chargement de la carte…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsCompass={false}
          showsScale={false}
          showsBuildings
          showsTraffic={false}
          showsMyLocationButton={false}
          showsUserLocation={locationEnabled}
          toolbarEnabled={false}
          onPress={() => setSelectedItem(null)}
        >
          {visibleAdventures.map((adventure) => (
            <Marker
              key={`adventure-${adventure.id}`}
              coordinate={getAdventureCoordinate(
                adventure
              )}
              title={adventure.title}
              description={`Aventure · ${adventure.location}`}
              pinColor={getAdventureColor(
                adventure.category
              )}
              onPress={() =>
                selectAdventure(adventure)
              }
            />
          ))}

          {visibleCuriosities.map((curiosity) => (
            <Marker
              key={`curiosity-${curiosity.id}`}
              coordinate={getCuriosityCoordinate(
                curiosity
              )}
              title={curiosity.title}
              description={`Curiosité · ${getCuriosityLocation(
                curiosity
              )}`}
              pinColor={getCuriosityColor(
                curiosity.category
              )}
              onPress={() =>
                selectCuriosity(curiosity)
              }
            />
          ))}
        </MapView>

        <View style={styles.topArea}>
          <View style={styles.headerCard}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                CARTE FRAGMENTA
              </Text>

              <Text style={styles.title}>
                Explore l’inattendu
              </Text>

              <Text style={styles.subtitle}>
                {visiblePointCount} point
                {visiblePointCount !== 1 ? 's' : ''}{' '}
                à découvrir sur la carte
              </Text>
            </View>

          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {contentFilters.map((filter) => {
              const selected =
                filter === contentFilter;

              const color =
                filter === 'Aventures'
                  ? '#4DA3FF'
                  : filter === 'Curiosités'
                    ? '#F6C85F'
                    : '#62E6B1';

              const icon =
                filter === 'Aventures'
                  ? '●'
                  : filter === 'Curiosités'
                    ? '◆'
                    : '◉';

              return (
                <Pressable
                  key={filter}
                  onPress={() =>
                    selectContentFilter(filter)
                  }
                  style={[
                    styles.filterButton,
                    selected && {
                      borderColor: color,
                      backgroundColor: '#10251E',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterIcon,
                      {
                        color,
                      },
                    ]}
                  >
                    {icon}
                  </Text>

                  <Text
                    style={[
                      styles.filterText,
                      selected &&
                        styles.filterTextSelected,
                    ]}
                  >
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

        </View>

        <View style={styles.mapButtons}>
          <Pressable
            style={[styles.mapButton, styles.showAllButton]}
            onPress={showAllPoints}
            accessibilityLabel="Afficher tous les points"
          >
            <Text style={styles.showAllButtonText}>Tout voir</Text>
          </Pressable>

          <Pressable
            style={styles.mapButton}
            onPress={() => {
              void centerOnUser();
            }}
            accessibilityLabel="Ma position"
            disabled={locating}
          >
            <Text style={styles.mapButtonIcon}>
              {locating ? '…' : '◎'}
            </Text>
          </Pressable>
        </View>

        {selectedItem?.type === 'adventure' ? (
          <AdventureDetailCard
            adventure={selectedItem.data}
            onOpen={openSelectedItem}
          />
        ) : null}

        {selectedItem?.type === 'curiosity' ? (
          <CuriosityDetailCard
            curiosity={selectedItem.data}
            onOpen={openSelectedItem}
          />
        ) : null}

        {!selectedItem ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              {visiblePointCount === 0
                ? '📍'
                : '🧭'}
            </Text>

            <Text style={styles.emptyTitle}>
              {visiblePointCount === 0
                ? 'Aucun point géolocalisé'
                : 'Choisis un lieu'}
            </Text>

            <Text style={styles.emptyText}>
              {visiblePointCount === 0
                ? 'Ajoute des coordonnées à une aventure ou à une curiosité.'
                : 'Touche un pin pour découvrir son histoire.'}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function AdventureDetailCard({
  adventure,
  onOpen,
}: {
  adventure: Adventure;
  onOpen: () => void;
}) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.cardHandle} />

      <View style={styles.cardHeader}>
        <View style={styles.cardCategoryRow}>
          <View
            style={[
              styles.cardCategoryDot,
              {
                backgroundColor: getAdventureColor(
                  adventure.category
                ),
              },
            ]}
          />

          <Text style={styles.cardCategory}>
            Aventure · {adventure.category}
          </Text>
        </View>

        <Text style={styles.cardMeta}>
          {adventure.day}
        </Text>
      </View>

      <Text
        style={styles.cardTitle}
        numberOfLines={2}
      >
        {adventure.title}
      </Text>

      <Text style={styles.cardLocation}>
        ◉ {adventure.location}
      </Text>

      <Text
        style={styles.cardDescription}
        numberOfLines={2}
      >
        {adventure.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.authorArea}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitial}>
              {adventure.user
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View>
            <Text style={styles.authorLabel}>
              Aventurier
            </Text>

            <Text style={styles.authorName}>
              {adventure.handle}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.openButton}
          onPress={onOpen}
        >
          <Text style={styles.openButtonText}>
            Voir l’aventure
          </Text>

          <Text style={styles.openButtonArrow}>
            ›
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CuriosityDetailCard({
  curiosity,
  onOpen,
}: {
  curiosity: Curiosity;
  onOpen: () => void;
}) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.cardHandle} />

      <View style={styles.cardHeader}>
        <View style={styles.cardCategoryRow}>
          <View
            style={[
              styles.curiosityDiamond,
              {
                backgroundColor: getCuriosityColor(
                  curiosity.category
                ),
              },
            ]}
          />

          <Text style={styles.cardCategory}>
            Curiosité · {curiosity.category}
          </Text>
        </View>

        <View style={styles.verificationBadge}>
          <Text style={styles.verificationText}>
            {getVerificationLabel(
              curiosity.verificationStatus
            )}
          </Text>
        </View>
      </View>

      <Text
        style={styles.cardTitle}
        numberOfLines={2}
      >
        {curiosity.title}
      </Text>

      <Text style={styles.cardLocation}>
        ◉ {getCuriosityLocation(curiosity)}
      </Text>

      <Text
        style={styles.cardDescription}
        numberOfLines={2}
      >
        {curiosity.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.authorArea}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitial}>
              {curiosity.authorName
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View>
            <Text style={styles.authorLabel}>
              Découvert par
            </Text>

            <Text style={styles.authorName}>
              {curiosity.authorHandle}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.curiosityOpenButton}
          onPress={onOpen}
        >
          <Text
            style={styles.curiosityOpenButtonText}
          >
            Explorer
          </Text>

          <Text
            style={styles.curiosityOpenButtonArrow}
          >
            ›
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#071310',
  },

  container: {
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

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  topArea: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
  },

  headerCard: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(98, 230, 177, 0.18)',
    backgroundColor: 'rgba(7, 19, 16, 0.96)',
    paddingHorizontal: 18,
    paddingVertical: 15,
    elevation: 8,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    color: '#62E6B1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },

  title: {
    color: '#F3FFF9',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 4,
  },

  subtitle: {
    color: '#8FA69B',
    fontSize: 12,
    marginTop: 5,
  },

  filters: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  filterButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(7, 19, 16, 0.91)',
    paddingHorizontal: 14,
  },

  filterIcon: {
    fontSize: 13,
    fontWeight: '900',
    marginRight: 7,
  },

  filterText: {
    color: '#A2B3AB',
    fontSize: 12,
    fontWeight: '700',
  },

  filterTextSelected: {
    color: '#F3FFF9',
    fontWeight: '900',
  },

  mapButtons: {
    position: 'absolute',
    right: 16,
    bottom: 282,
    gap: 10,
  },

  mapButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(98, 230, 177, 0.25)',
    backgroundColor: 'rgba(7, 19, 16, 0.94)',
    elevation: 6,
  },

  mapButtonIcon: {
    color: '#62E6B1',
    fontSize: 23,
    fontWeight: '900',
  },

  showAllButton: {
    width: 78,
  },

  showAllButtonText: {
    color: '#62E6B1',
    fontSize: 11,
    fontWeight: '900',
  },

  detailCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 16,
    minHeight: 230,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(98, 230, 177, 0.18)',
    backgroundColor: 'rgba(7, 19, 16, 0.98)',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    elevation: 12,
  },

  cardHandle: {
    width: 42,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: '#29453B',
    marginBottom: 13,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardCategoryRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },

  cardCategoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  curiosityDiamond: {
    width: 10,
    height: 10,
    marginRight: 9,
    transform: [{ rotate: '45deg' }],
  },

  cardCategory: {
    flex: 1,
    color: '#CDE4DA',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  cardMeta: {
    color: '#70877D',
    fontSize: 10,
    fontWeight: '700',
  },

  verificationBadge: {
    borderRadius: 999,
    backgroundColor: '#173D31',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  verificationText: {
    color: '#F6C85F',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  cardTitle: {
    color: '#F3FFF9',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 10,
  },

  cardLocation: {
    color: '#62E6B1',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },

  cardDescription: {
    color: '#95AAA1',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 9,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },

  authorArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  authorAvatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#173D31',
    borderWidth: 1,
    borderColor: '#2A5B49',
    marginRight: 9,
  },

  authorInitial: {
    color: '#62E6B1',
    fontSize: 15,
    fontWeight: '900',
  },

  authorLabel: {
    color: '#637A70',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  authorName: {
    color: '#DFFFF2',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },

  openButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#62E6B1',
    paddingHorizontal: 14,
    marginLeft: 8,
  },

  openButtonText: {
    color: '#071310',
    fontSize: 11,
    fontWeight: '900',
  },

  openButtonArrow: {
    color: '#071310',
    fontSize: 23,
    fontWeight: '700',
    marginLeft: 5,
  },

  curiosityOpenButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#F6C85F',
    paddingHorizontal: 15,
    marginLeft: 8,
  },

  curiosityOpenButtonText: {
    color: '#171307',
    fontSize: 12,
    fontWeight: '900',
  },

  curiosityOpenButtonArrow: {
    color: '#171307',
    fontSize: 23,
    fontWeight: '800',
    marginLeft: 5,
  },

  emptyCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: 'rgba(7, 19, 16, 0.97)',
    padding: 20,
  },

  emptyIcon: {
    fontSize: 27,
  },

  emptyTitle: {
    color: '#F3FFF9',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },

  emptyText: {
    color: '#81958C',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: 'center',
  },
});
