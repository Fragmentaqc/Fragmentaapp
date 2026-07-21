import { type Adventure, useAdventures } from '@/context/adventures-context';
import { type Curiosity, useCuriosities } from '@/context/curiosities-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categoryIcons: Record<string, string> = {
  'Vélo': '🚲',
  'Road trip': '🚐',
  'À pied': '🥾',
  Camping: '⛺',
  Urbain: '🏙️',
  Défi: '🔥',
  Autre: '🧭',
};

export default function HomeScreen() {
  const { adventures, loading: adventuresLoading } = useAdventures();
  const { curiosities, loading: curiositiesLoading } = useCuriosities();
  const publishedAdventures = useMemo(
    () => adventures.filter((adventure) => adventure.publicationStatus === 'published'),
    [adventures]
  );
  const publishedCuriosities = useMemo(
    () => curiosities.filter((curiosity) => curiosity.status === 'published'),
    [curiosities]
  );
  const activeAdventures = useMemo(
    () => publishedAdventures.filter((adventure) => adventure.status === 'active'),
    [publishedAdventures]
  );
  const featuredAdventure = activeAdventures.find((adventure) => adventure.images.length > 0)
    ?? publishedAdventures.find((adventure) => adventure.images.length > 0)
    ?? activeAdventures[0]
    ?? publishedAdventures[0];
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    publishedAdventures.forEach((adventure) => {
      counts.set(adventure.category, (counts.get(adventure.category) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((first, second) => second[1] - first[1])
      .slice(0, 6);
  }, [publishedAdventures]);
  const loading = adventuresLoading || curiositiesLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={require('@/assets/images/D7K_3244.jpg')} style={styles.heroImage} contentFit="cover" contentPosition="center" />
          <View style={styles.heroShade} />
          <View style={styles.heroTop}>
            <View style={styles.heroLogoLockup} pointerEvents="none">
              <Image source={require('@/assets/images/android-icon-foreground.png')} style={styles.heroLogo} contentFit="contain" />
              <Text style={styles.heroWordmark}>FRAGMENTA</Text>
            </View>
            <Pressable style={styles.profileButton} onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Ouvrir mon profil">
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>LE MONDE EST PLEIN DE FRAGMENTS</Text>
            <Text style={styles.heroTitle}>Trouve ta prochaine histoire dehors.</Text>
            <Text style={styles.heroText}>Découvre des parcours vécus, suis leurs étapes et repère les curiosités cachées par la communauté.</Text>
            <View style={styles.heroActions}>
              <Pressable style={styles.primaryAction} onPress={() => router.push('/map')}>
                <Text style={styles.primaryActionText}>Explorer la carte</Text>
                <Text style={styles.primaryActionArrow}>↗</Text>
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={() => router.push('/publish')}>
                <Text style={styles.secondaryActionText}>＋ Publier</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.metrics}>
          <Metric value={publishedAdventures.length} label="aventures" onPress={() => router.push('/explore')} />
          <View style={styles.metricDivider} />
          <Metric value={activeAdventures.length} label="en cours" onPress={() => router.push('/explore')} />
          <View style={styles.metricDivider} />
          <Metric value={publishedCuriosities.length} label="curiosités" onPress={() => router.push('/explore')} />
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#62E6B1" />
            <Text style={styles.loadingText}>Préparation des découvertes…</Text>
          </View>
        ) : null}

        {!loading && featuredAdventure ? (
          <Section title="À la une" action="Voir tout" onAction={() => router.push('/explore')}>
            <FeaturedAdventure adventure={featuredAdventure} />
          </Section>
        ) : null}

        {!loading && categories.length ? (
          <Section title="Choisis ton terrain">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent}>
              {categories.map(([category, count]) => (
                <Pressable
                  key={category}
                  style={styles.categoryCard}
                  onPress={() => router.push({ pathname: '/explore', params: { search: category } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Explorer la catégorie ${category}`}
                >
                  <Text style={styles.categoryIcon}>{categoryIcons[category] ?? '🧭'}</Text>
                  <Text style={styles.categoryName}>{category}</Text>
                  <Text style={styles.categoryCount}>{count} aventure{count > 1 ? 's' : ''}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Section>
        ) : null}

        {!loading && activeAdventures.length ? (
          <Section title="En mouvement" subtitle="Des aventures qui s’écrivent maintenant">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent}>
              {activeAdventures.slice(0, 6).map((adventure) => (
                <AdventureTile key={adventure.id} adventure={adventure} />
              ))}
            </ScrollView>
          </Section>
        ) : null}

        {!loading && publishedCuriosities.length ? (
          <Section title="Détours recommandés" subtitle="Des lieux remarquables documentés par la communauté" action="Carte" onAction={() => router.push('/map')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent}>
              {publishedCuriosities.slice(0, 6).map((curiosity) => (
                <CuriosityTile key={curiosity.id} curiosity={curiosity} />
              ))}
            </ScrollView>
          </Section>
        ) : null}

        {!loading && publishedAdventures.length ? (
          <Section title="Fraîchement raconté" subtitle="Les derniers récits ajoutés à Fragmenta">
            <View style={styles.recentList}>
              {publishedAdventures.slice(0, 4).map((adventure, index) => (
                <RecentAdventure key={adventure.id} adventure={adventure} index={index + 1} />
              ))}
            </View>
          </Section>
        ) : null}

        {!loading && !publishedAdventures.length && !publishedCuriosities.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧭</Text>
            <Text style={styles.emptyTitle}>Le terrain est encore vierge</Text>
            <Text style={styles.emptyText}>Sois la première personne à raconter une aventure ou révéler une curiosité.</Text>
            <Pressable style={styles.primaryAction} onPress={() => router.push('/publish')}>
              <Text style={styles.primaryActionText}>Créer une aventure</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.contributionCard}>
          <Text style={styles.contributionEyebrow}>TA TRACE COMPTE</Text>
          <Text style={styles.contributionTitle}>Un moment vécu peut inspirer le prochain départ.</Text>
          <Text style={styles.contributionText}>Ajoute une aventure, raconte ses fragments ou partage un lieu que personne ne devrait manquer.</Text>
          <View style={styles.contributionActions}>
            <Pressable style={styles.contributionPrimary} onPress={() => router.push('/publish')}>
              <Text style={styles.contributionPrimaryText}>Raconter une aventure</Text>
            </Pressable>
            <Pressable style={styles.contributionSecondary} onPress={() => router.push('/add-curiosity')}>
              <Text style={styles.contributionSecondaryText}>Ajouter une curiosité</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ value, label, onPress }: { value: number; label: string; onPress: () => void }) {
  return <Pressable style={styles.metric} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Voir ${value} ${label}`}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></Pressable>;
}

function Section({ title, subtitle, action, onAction, children }: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {action && onAction ? <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action}><Text style={styles.sectionAction}>{action} ›</Text></Pressable> : null}
      </View>
      {children}
    </View>
  );
}

function FeaturedAdventure({ adventure }: { adventure: Adventure }) {
  const open = () => router.push({ pathname: '/adventure/[id]', params: { id: adventure.id } });
  return (
    <Pressable style={styles.featuredCard} onPress={open} accessibilityRole="button" accessibilityLabel={`Ouvrir ${adventure.title}`}>
      {adventure.images[0] ? <Image source={{ uri: adventure.images[0] }} style={styles.featuredImage} contentFit="cover" /> : <View style={styles.featuredFallback}><Text style={styles.featuredEmoji}>{adventure.emoji}</Text></View>}
      <View style={styles.featuredShade} />
      <View style={styles.featuredTopRow}>
        <Text style={styles.liveBadge}>● {adventure.status === 'active' ? 'EN COURS' : 'À DÉCOUVRIR'}</Text>
        <Text style={styles.featuredCategory}>{adventure.category}</Text>
      </View>
      <View style={styles.featuredContent}>
        <Text style={styles.featuredLocation}>⌖ {adventure.location}</Text>
        <Text style={styles.featuredTitle}>{adventure.title}</Text>
        <Text style={styles.featuredDescription} numberOfLines={2}>{adventure.description}</Text>
        <View style={styles.featuredFooter}>
          <Text style={styles.featuredAuthor}>Par {adventure.user}</Text>
          <Text style={styles.featuredOpen}>Ouvrir ↗</Text>
        </View>
      </View>
    </Pressable>
  );
}

function AdventureTile({ adventure }: { adventure: Adventure }) {
  return (
    <Pressable style={styles.adventureTile} onPress={() => router.push({ pathname: '/adventure/[id]', params: { id: adventure.id } })} accessibilityRole="button" accessibilityLabel={`Ouvrir ${adventure.title}`}>
      {adventure.images[0] ? <Image source={{ uri: adventure.images[0] }} style={styles.tileImage} contentFit="cover" /> : <View style={styles.tileFallback}><Text style={styles.tileEmoji}>{adventure.emoji}</Text></View>}
      <View style={styles.tileContent}>
        <Text style={styles.tileCategory}>{adventure.category.toUpperCase()}</Text>
        <Text style={styles.tileTitle} numberOfLines={2}>{adventure.title}</Text>
        <Text style={styles.tileLocation} numberOfLines={1}>⌖ {adventure.location}</Text>
      </View>
    </Pressable>
  );
}

function CuriosityTile({ curiosity }: { curiosity: Curiosity }) {
  const verified = curiosity.verificationStatus === 'verified';
  return (
    <Pressable style={styles.curiosityTile} onPress={() => router.push({ pathname: '/curiosity/[id]', params: { id: curiosity.id } })} accessibilityRole="button" accessibilityLabel={`Ouvrir ${curiosity.title}`}>
      {curiosity.images[0] ? <Image source={{ uri: curiosity.images[0] }} style={styles.curiosityImage} contentFit="cover" /> : <View style={styles.curiosityFallback}><Text style={styles.curiosityFallbackIcon}>◇</Text></View>}
      <View style={styles.curiosityContent}>
        <View style={styles.curiosityMeta}><Text style={styles.curiosityCategory}>{curiosity.category}</Text>{verified ? <Text style={styles.verifiedBadge}>VÉRIFIÉE</Text> : null}</View>
        <Text style={styles.curiosityTitle} numberOfLines={2}>{curiosity.title}</Text>
        <Text style={styles.curiosityLocation} numberOfLines={1}>⌖ {curiosity.locationName || curiosity.address || 'Lieu à découvrir'}</Text>
      </View>
    </Pressable>
  );
}

function RecentAdventure({ adventure, index }: { adventure: Adventure; index: number }) {
  return (
    <Pressable style={styles.recentCard} onPress={() => router.push({ pathname: '/adventure/[id]', params: { id: adventure.id } })} accessibilityRole="button" accessibilityLabel={`Ouvrir ${adventure.title}`}>
      <Text style={styles.recentIndex}>{String(index).padStart(2, '0')}</Text>
      <View style={styles.recentContent}>
        <Text style={styles.recentMeta}>{adventure.category.toUpperCase()} · {adventure.day}</Text>
        <Text style={styles.recentTitle}>{adventure.title}</Text>
        <Text style={styles.recentAuthor}>{adventure.handle} · {adventure.location}</Text>
      </View>
      <Text style={styles.recentArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071310' },
  container: { paddingBottom: 48 },
  profileButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,.55)', backgroundColor: 'rgba(7,19,16,.55)' },
  hero: { height: 540, overflow: 'hidden', borderRadius: 0, backgroundColor: '#10251E' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,10,8,.42)' },
  heroTop: { position: 'absolute', top: 18, left: 18, right: 18, alignItems: 'flex-end' },
  heroLogoLockup: { position: 'absolute', top: -140, left: -140, width: 500, height: 380, justifyContent: 'center' },
  heroLogo: { width: 380, height: 380 },
  heroWordmark: { position: 'absolute', left: 255, top: 154, color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 2.4, textShadowColor: 'rgba(0,0,0,.6)', textShadowRadius: 8 },
  heroContent: { position: 'absolute', left: 18, right: 18, bottom: 22 },
  heroEyebrow: { color: '#8EF0C5', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  heroTitle: { maxWidth: 410, color: '#FFFFFF', fontSize: 36, lineHeight: 40, fontWeight: '900', marginTop: 10, textShadowColor: 'rgba(0,0,0,.7)', textShadowRadius: 10 },
  heroText: { maxWidth: 430, color: '#E2ECE8', fontSize: 13, lineHeight: 20, marginTop: 11, textShadowColor: 'rgba(0,0,0,.65)', textShadowRadius: 7 },
  heroActions: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryAction: { minHeight: 48, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#62E6B1', paddingHorizontal: 14 },
  primaryActionText: { color: '#071310', fontSize: 12, fontWeight: '900' },
  primaryActionArrow: { color: '#071310', fontSize: 17, fontWeight: '900', marginLeft: 7 },
  secondaryAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,.65)', backgroundColor: 'rgba(7,19,16,.5)', paddingHorizontal: 15 },
  secondaryActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  metrics: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginTop: 12, borderRadius: 0, backgroundColor: '#0C1C17', paddingVertical: 14 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { color: '#F3FFF9', fontSize: 20, fontWeight: '900' },
  metricLabel: { color: '#71877D', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 3 },
  metricDivider: { width: 1, height: 30, backgroundColor: '#1D4538' },
  loadingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 18, marginTop: 24, padding: 24 },
  loadingText: { color: '#81958C', fontSize: 12, marginLeft: 10 },
  section: { marginTop: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 13 },
  sectionHeading: { flex: 1, paddingRight: 14 },
  sectionTitle: { color: '#F3FFF9', fontSize: 21, fontWeight: '900' },
  sectionSubtitle: { color: '#71877D', fontSize: 11, lineHeight: 16, marginTop: 4 },
  sectionAction: { color: '#62E6B1', fontSize: 11, fontWeight: '900' },
  horizontalContent: { gap: 11, paddingHorizontal: 18 },
  featuredCard: { height: 430, overflow: 'hidden', marginHorizontal: 18, borderRadius: 0, backgroundColor: '#173D31' },
  featuredImage: { ...StyleSheet.absoluteFillObject },
  featuredFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  featuredEmoji: { fontSize: 92 },
  featuredShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 12, 9, 0.43)' },
  featuredTopRow: { position: 'absolute', top: 15, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadge: { color: '#071310', backgroundColor: '#62E6B1', borderRadius: 0, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontSize: 8, fontWeight: '900' },
  featuredCategory: { color: '#F3FFF9', backgroundColor: 'rgba(7,19,16,.8)', borderRadius: 0, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontSize: 9, fontWeight: '900' },
  featuredContent: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  featuredLocation: { color: '#62E6B1', fontSize: 11, fontWeight: '900' },
  featuredTitle: { color: '#FFFFFF', fontSize: 27, lineHeight: 32, fontWeight: '900', marginTop: 7 },
  featuredDescription: { color: '#D8E8E1', fontSize: 12, lineHeight: 18, marginTop: 7 },
  featuredFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  featuredAuthor: { color: '#D8E8E1', fontSize: 10, fontWeight: '800' },
  featuredOpen: { color: '#62E6B1', fontSize: 11, fontWeight: '900' },
  categoryCard: { width: 140, minHeight: 130, borderRadius: 0, borderWidth: 1, borderColor: '#1D4538', backgroundColor: '#0C1C17', padding: 15 },
  categoryIcon: { fontSize: 27 },
  categoryName: { color: '#F3FFF9', fontSize: 14, fontWeight: '900', marginTop: 12 },
  categoryCount: { color: '#71877D', fontSize: 10, marginTop: 4 },
  adventureTile: { width: 245, overflow: 'hidden', borderRadius: 0, borderWidth: 1, borderColor: '#1D4538', backgroundColor: '#0C1C17' },
  tileImage: { width: '100%', height: 165 },
  tileFallback: { height: 165, alignItems: 'center', justifyContent: 'center', backgroundColor: '#173D31' },
  tileEmoji: { fontSize: 55 },
  tileContent: { padding: 14 },
  tileCategory: { color: '#62E6B1', fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  tileTitle: { color: '#F3FFF9', fontSize: 16, lineHeight: 21, fontWeight: '900', marginTop: 6 },
  tileLocation: { color: '#81958C', fontSize: 10, marginTop: 8 },
  curiosityTile: { width: 235, overflow: 'hidden', borderRadius: 0, borderWidth: 1, borderColor: '#3D3920', backgroundColor: '#141A15' },
  curiosityImage: { width: '100%', height: 145 },
  curiosityFallback: { height: 145, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2916' },
  curiosityFallbackIcon: { color: '#F6C85F', fontSize: 54 },
  curiosityContent: { padding: 14 },
  curiosityMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  curiosityCategory: { flex: 1, color: '#F6C85F', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  verifiedBadge: { color: '#071310', backgroundColor: '#F6C85F', borderRadius: 0, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, fontSize: 7, fontWeight: '900' },
  curiosityTitle: { color: '#F3FFF9', fontSize: 16, lineHeight: 21, fontWeight: '900', marginTop: 7 },
  curiosityLocation: { color: '#81958C', fontSize: 10, marginTop: 8 },
  recentList: { marginHorizontal: 18, borderTopWidth: 1, borderTopColor: '#19392E' },
  recentCard: { minHeight: 96, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#19392E', paddingVertical: 15 },
  recentIndex: { width: 42, color: '#386B59', fontSize: 18, fontWeight: '900' },
  recentContent: { flex: 1 },
  recentMeta: { color: '#62E6B1', fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  recentTitle: { color: '#F3FFF9', fontSize: 15, fontWeight: '900', marginTop: 5 },
  recentAuthor: { color: '#71877D', fontSize: 10, marginTop: 5 },
  recentArrow: { color: '#62E6B1', fontSize: 28, marginLeft: 10 },
  emptyState: { alignItems: 'center', margin: 18, borderRadius: 0, borderWidth: 1, borderColor: '#285345', padding: 26 },
  emptyIcon: { fontSize: 46 },
  emptyTitle: { color: '#F3FFF9', fontSize: 20, fontWeight: '900', marginTop: 12 },
  emptyText: { color: '#81958C', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 18 },
  contributionCard: { marginHorizontal: 18, marginTop: 34, borderRadius: 0, backgroundColor: '#62E6B1', padding: 22 },
  contributionEyebrow: { color: '#174B3B', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  contributionTitle: { color: '#071310', fontSize: 24, lineHeight: 29, fontWeight: '900', marginTop: 8 },
  contributionText: { color: '#174B3B', fontSize: 12, lineHeight: 18, marginTop: 8 },
  contributionActions: { gap: 8, marginTop: 18 },
  contributionPrimary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#071310' },
  contributionPrimaryText: { color: '#F3FFF9', fontSize: 12, fontWeight: '900' },
  contributionSecondary: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#174B3B' },
  contributionSecondaryText: { color: '#071310', fontSize: 12, fontWeight: '900' },
});
