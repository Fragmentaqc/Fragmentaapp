import { useCuriosities } from '@/context/curiosities-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CuriosityDetailsScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const { curiosities } = useCuriosities();

  const curiosity = curiosities.find(
    (item) => item.id === id
  );

  if (!curiosity) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.notFoundIcon}>🧭</Text>

          <Text style={styles.notFoundTitle}>
            Curiosité introuvable
          </Text>

          <Text style={styles.notFoundText}>
            Ce lieu n’existe plus ou n’a pas encore été chargé.
          </Text>

          <Pressable
            style={styles.backButtonLarge}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonLargeText}>
              Revenir
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const location =
    curiosity.locationName ||
    curiosity.address ||
    'Emplacement à découvrir';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.eyebrow}>
          {curiosity.category.toUpperCase()}
        </Text>

        <Text style={styles.title}>
          {curiosity.title}
        </Text>

        <Text style={styles.location}>
          ◉ {location}
        </Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {curiosity.verificationStatus === 'verified'
              ? '✓ Vérifié'
              : curiosity.verificationStatus ===
                  'community_confirmed'
                ? '● Confirmé par la communauté'
                : '? À vérifier'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            À propos de ce lieu
          </Text>

          <Text style={styles.description}>
            {curiosity.description}
          </Text>
        </View>

        {curiosity.accessibility ? (
          <InfoCard
            icon="🥾"
            title="Accessibilité"
            text={curiosity.accessibility}
          />
        ) : null}

        {curiosity.bestTimeToVisit ? (
          <InfoCard
            icon="🌤️"
            title="Meilleur moment"
            text={curiosity.bestTimeToVisit}
          />
        ) : null}

        {curiosity.recommendedDuration ? (
          <InfoCard
            icon="⏱️"
            title="Durée recommandée"
            text={curiosity.recommendedDuration}
          />
        ) : null}

        <View style={styles.authorCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
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
              {curiosity.authorName}
            </Text>

            <Text style={styles.authorHandle}>
              {curiosity.authorHandle}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Text style={styles.infoEmoji}>{icon}</Text>
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>

        <Text style={styles.infoText}>{text}</Text>
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
    padding: 18,
    paddingBottom: 60,
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
    marginBottom: 24,
  },

  backIcon: {
    color: '#62E6B1',
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },

  eyebrow: {
    color: '#F6C85F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  title: {
    color: '#F3FFF9',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: 8,
  },

  location: {
    color: '#62E6B1',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#173D31',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },

  statusText: {
    color: '#F6C85F',
    fontSize: 10,
    fontWeight: '900',
  },

  section: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 18,
    marginTop: 25,
  },

  sectionTitle: {
    color: '#F3FFF9',
    fontSize: 18,
    fontWeight: '900',
  },

  description: {
    color: '#A2B3AB',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 11,
  },

  infoCard: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 14,
    marginTop: 12,
  },

  infoIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#173D31',
  },

  infoEmoji: {
    fontSize: 23,
  },

  infoContent: {
    flex: 1,
    marginLeft: 13,
  },

  infoTitle: {
    color: '#DFFFF2',
    fontSize: 13,
    fontWeight: '900',
  },

  infoText: {
    color: '#81958C',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#285345',
    backgroundColor: '#10251E',
    padding: 16,
    marginTop: 24,
  },

  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#173D31',
    marginRight: 13,
  },

  avatarText: {
    color: '#62E6B1',
    fontSize: 19,
    fontWeight: '900',
  },

  authorLabel: {
    color: '#70877D',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  authorName: {
    color: '#F3FFF9',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },

  authorHandle: {
    color: '#62E6B1',
    fontSize: 11,
    marginTop: 3,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  notFoundIcon: {
    fontSize: 45,
  },

  notFoundTitle: {
    color: '#F3FFF9',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 12,
  },

  notFoundText: {
    color: '#81958C',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },

  backButtonLarge: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#62E6B1',
    paddingHorizontal: 22,
    marginTop: 20,
  },

  backButtonLargeText: {
    color: '#071310',
    fontSize: 13,
    fontWeight: '900',
  },
});