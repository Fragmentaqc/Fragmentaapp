import { useAdventures, type Adventure } from '@/context/adventures-context';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CARD_WIDTH = Dimensions.get('window').width - 32;

export default function HomeScreen() {
  const { adventures } = useAdventures();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>FRAGMENTA</Text>
            <Text style={styles.subtitle}>Les aventures en direct</Text>
          </View>

          <Pressable style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </Pressable>
        </View>

        <View style={styles.feedTabs}>
          <Pressable style={styles.activeFeedTab}>
            <Text style={styles.activeFeedTabText}>Pour toi</Text>
          </Pressable>

          <Pressable style={styles.feedTab}>
            <Text style={styles.feedTabText}>Suivis</Text>
          </Pressable>

          <Pressable style={styles.feedTab}>
            <Text style={styles.feedTabText}>Près de toi</Text>
          </Pressable>
        </View>

        <View style={styles.liveBanner}>
          <View>
            <Text style={styles.liveLabel}>● EN DIRECT</Text>
            <Text style={styles.liveTitle}>
              {adventures.length} aventures dans le fil
            </Text>
          </View>

          <Text style={styles.liveArrow}>›</Text>
        </View>

        {adventures.map((adventure) => (
          <AdventureCard
            key={adventure.id}
            adventure={adventure}
            onOpen={() =>
              router.push({
                pathname: '/adventure/[id]',
                params: { id: adventure.id },
              })
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function AdventureCard({
  adventure,
  onOpen,
}: {
  adventure: Adventure;
  onOpen: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {adventure.user.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{adventure.user}</Text>
          <Text style={styles.handle}>{adventure.handle}</Text>
        </View>

        <Pressable>
          <Text style={styles.moreButton}>•••</Text>
        </Pressable>
      </View>

      <Pressable onPress={onOpen}>
        <AdventureGallery adventure={adventure} />
      </Pressable>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{adventure.title}</Text>

        <Text style={styles.description}>
          {adventure.description}
        </Text>

        <Pressable
          style={styles.openAdventureButton}
          onPress={onOpen}
        >
          <Text style={styles.openAdventureButtonText}>
            Voir l'aventure
          </Text>
          <Text style={styles.openAdventureArrow}>›</Text>
        </Pressable>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statText}>{adventure.distance}</Text>
          </View>

          <View style={styles.statPill}>
            <Text style={styles.statText}>{adventure.detail}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>♡ 248</Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>💬 31</Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>↗ Partager</Text>
          </Pressable>

          <Pressable style={styles.followButton}>
            <Text style={styles.followButtonText}>Suivre</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function AdventureGallery({ adventure }: { adventure: Adventure }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = Array.isArray(adventure.images) ? adventure.images : [];

  if (images.length === 0) {
    return (
      <View style={styles.visual}>
        <Text style={styles.visualEmoji}>{adventure.emoji}</Text>

        <View style={styles.visualOverlay}>
          <Text style={styles.dayBadge}>{adventure.day}</Text>
          <Text style={styles.location}>{adventure.location}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.galleryContainer}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        nestedScrollEnabled
        keyExtractor={(_, index) =>
          `${adventure.id}-image-${index}`
        }
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH,
          offset: CARD_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.x / CARD_WIDTH
          );

          setActiveIndex(nextIndex);
        }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={styles.galleryImage}
            resizeMode="cover"
          />
        )}
      />

      <View style={styles.galleryOverlay}>
        <Text style={styles.dayBadge}>{adventure.day}</Text>
        <Text style={styles.location}>{adventure.location}</Text>
      </View>

      {images.length > 1 && (
        <>
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {activeIndex + 1}/{images.length}
            </Text>
          </View>

          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View
                key={`${adventure.id}-dot-${index}`}
                style={[
                  styles.dot,
                  index === activeIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </>
      )}
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    color: '#F3FFF9',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#8FA69B',
    fontSize: 13,
    marginTop: 3,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10251E',
    borderWidth: 1,
    borderColor: '#1D4538',
  },
  notificationIcon: {
    fontSize: 20,
  },
  feedTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  activeFeedTab: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#62E6B1',
  },
  activeFeedTabText: {
    color: '#071310',
    fontSize: 14,
    fontWeight: '900',
  },
  feedTab: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#10251E',
    borderWidth: 1,
    borderColor: '#1D4538',
  },
  feedTabText: {
    color: '#A4B8AF',
    fontSize: 14,
    fontWeight: '700',
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#122A22',
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: '#24533F',
    marginBottom: 20,
  },
  liveLabel: {
    color: '#62E6B1',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  liveTitle: {
    color: '#F3FFF9',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 5,
  },
  liveArrow: {
    color: '#62E6B1',
    fontSize: 30,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#0C1C17',
    borderWidth: 1,
    borderColor: '#19392E',
    marginBottom: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#174B3B',
  },
  avatarText: {
    color: '#F3FFF9',
    fontSize: 17,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
    marginLeft: 11,
  },
  userName: {
    color: '#F3FFF9',
    fontSize: 15,
    fontWeight: '800',
  },
  handle: {
    color: '#7F968B',
    fontSize: 12,
    marginTop: 2,
  },
  moreButton: {
    color: '#95AA9F',
    fontSize: 18,
    letterSpacing: 2,
  },
  visual: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#173D31',
  },
  visualEmoji: {
    fontSize: 94,
  },
  visualOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  galleryContainer: {
    height: 300,
    position: 'relative',
    backgroundColor: '#173D31',
  },
  galleryImage: {
    width: CARD_WIDTH,
    height: 300,
  },
  galleryOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 38,
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dotsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  activeDot: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  dayBadge: {
    alignSelf: 'flex-start',
    color: '#071310',
    backgroundColor: '#62E6B1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
  },
  location: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 9,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    color: '#F3FFF9',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  description: {
    color: '#A0B5AB',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  openAdventureButton: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#173D31',
    marginTop: 15,
  },
  openAdventureButtonText: {
    color: '#DFFFF2',
    fontSize: 12,
    fontWeight: '900',
  },
  openAdventureArrow: {
    color: '#62E6B1',
    fontSize: 23,
    fontWeight: '900',
    marginLeft: 7,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 15,
  },
  statPill: {
    backgroundColor: '#132E25',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statText: {
    color: '#BFE5D4',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
  },
  actionButton: {
    marginRight: 14,
  },
  actionText: {
    color: '#A5B9B0',
    fontSize: 13,
    fontWeight: '700',
  },
  followButton: {
    marginLeft: 'auto',
    backgroundColor: '#62E6B1',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  followButtonText: {
    color: '#071310',
    fontSize: 13,
    fontWeight: '900',
  },
});
