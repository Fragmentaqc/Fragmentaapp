import { type Adventure, useAdventures } from '@/context/adventures-context';
import { type Curiosity, useCuriosities } from '@/context/curiosities-context';
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
            </View>
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
            <ActivityIndicator color="#C99A2E" />
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
      <View style={styles.tileShade} />
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
      <View style={styles.curiosityShade} />
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
  safeArea: { flex: 1, backgroundColor: '#071A1C' },
  container: { paddingBottom: 0 },
  hero: { height: 610, overflow: 'hidden', borderRadius: 0, backgroundColor: '#16484C' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,14,16,.48)' },
  heroTop: { position: 'absolute', top: 18, left: 18, right: 18, alignItems: 'flex-end' },
  heroLogoLockup: { position: 'absolute', top: -55, left: '50%', width: 190, height: 190, marginLeft: -95 },
  heroLogo: { width: 190, height: 190 },
  heroContent: { position: 'absolute', left: 22, right: 22, bottom: 30 },
  heroEyebrow: { color: '#E4C778', fontSize: 9, fontWeight: '900', letterSpacing: 2.1 },
  heroTitle: { maxWidth: 390, color: '#FFFFFF', fontSize: 43, lineHeight: 46, fontWeight: '900', marginTop: 13, textShadowColor: 'rgba(0,0,0,.72)', textShadowRadius: 12 },
  heroText: { maxWidth: 410, color: '#E2ECE8', fontSize: 13, lineHeight: 20, marginTop: 14, textShadowColor: 'rgba(0,0,0,.65)', textShadowRadius: 7 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 25 },
  primaryAction: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#C99A2E', paddingHorizontal: 22 },
  primaryActionText: { color: '#071A1C', fontSize: 12, fontWeight: '900' },
  primaryActionArrow: { color: '#071A1C', fontSize: 17, fontWeight: '900', marginLeft: 7 },
  secondaryAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 0, paddingHorizontal: 2 },
  secondaryActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  metrics: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, paddingVertical: 24 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { color: '#F4EBD8', fontSize: 25, fontWeight: '900' },
  metricLabel: { color: '#A9BBB5', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 3 },
  metricDivider: { width: 1, height: 38, backgroundColor: 'rgba(228,199,120,.28)' },
  loadingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 18, marginTop: 24, padding: 24 },
  loadingText: { color: '#B8C8C2', fontSize: 12, marginLeft: 10 },
  section: { marginTop: 42 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 17 },
  sectionHeading: { flex: 1, paddingRight: 14 },
  sectionTitle: { color: '#F4EBD8', fontSize: 26, lineHeight: 30, fontWeight: '900' },
  sectionSubtitle: { color: '#A9BBB5', fontSize: 11, lineHeight: 16, marginTop: 4 },
  sectionAction: { color: '#C99A2E', fontSize: 11, fontWeight: '900' },
  horizontalContent: { gap: 12, paddingHorizontal: 22 },
  featuredCard: { height: 470, overflow: 'hidden', borderRadius: 0, backgroundColor: '#1D5A5E' },
  featuredImage: { ...StyleSheet.absoluteFillObject },
  featuredFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  featuredEmoji: { fontSize: 92 },
  featuredShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 12, 9, 0.43)' },
  featuredTopRow: { position: 'absolute', top: 20, left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadge: { color: '#071A1C', backgroundColor: '#C99A2E', borderRadius: 0, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontSize: 8, fontWeight: '900' },
  featuredCategory: { color: '#F4EBD8', backgroundColor: 'rgba(7,19,16,.8)', borderRadius: 0, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontSize: 9, fontWeight: '900' },
  featuredContent: { position: 'absolute', left: 22, right: 22, bottom: 24, borderLeftWidth: 3, borderLeftColor: '#C99A2E', paddingLeft: 16 },
  featuredLocation: { color: '#C99A2E', fontSize: 11, fontWeight: '900' },
  featuredTitle: { color: '#FFFFFF', fontSize: 31, lineHeight: 35, fontWeight: '900', marginTop: 7 },
  featuredDescription: { color: '#D8E8E1', fontSize: 12, lineHeight: 18, marginTop: 7 },
  featuredFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  featuredAuthor: { color: '#D8E8E1', fontSize: 10, fontWeight: '800' },
  featuredOpen: { color: '#C99A2E', fontSize: 11, fontWeight: '900' },
  categoryCard: { width: 136, minHeight: 122, borderRadius: 0, backgroundColor: '#10363A', padding: 16 },
  categoryIcon: { fontSize: 30 },
  categoryName: { color: '#F4EBD8', fontSize: 14, fontWeight: '900', marginTop: 11 },
  categoryCount: { color: '#A9BBB5', fontSize: 10, marginTop: 4 },
  adventureTile: { width: 265, height: 350, overflow: 'hidden', borderRadius: 0, backgroundColor: '#10363A' },
  tileImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  tileFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D5A5E' },
  tileEmoji: { fontSize: 55 },
  tileShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,18,20,.38)' },
  tileContent: { position: 'absolute', left: 17, right: 17, bottom: 18 },
  tileCategory: { color: '#C99A2E', fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  tileTitle: { color: '#FFFFFF', fontSize: 19, lineHeight: 23, fontWeight: '900', marginTop: 7 },
  tileLocation: { color: '#E2ECE8', fontSize: 10, marginTop: 9 },
  curiosityTile: { width: 250, height: 315, overflow: 'hidden', borderRadius: 0, backgroundColor: '#141A15' },
  curiosityImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  curiosityFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2916' },
  curiosityFallbackIcon: { color: '#D8B65A', fontSize: 54 },
  curiosityShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,15,13,.42)' },
  curiosityContent: { position: 'absolute', left: 17, right: 17, bottom: 17 },
  curiosityMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  curiosityCategory: { flex: 1, color: '#D8B65A', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  verifiedBadge: { color: '#071A1C', backgroundColor: '#D8B65A', borderRadius: 0, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, fontSize: 7, fontWeight: '900' },
  curiosityTitle: { color: '#FFFFFF', fontSize: 18, lineHeight: 22, fontWeight: '900', marginTop: 8 },
  curiosityLocation: { color: '#E2ECE8', fontSize: 10, marginTop: 9 },
  recentList: { marginHorizontal: 22, gap: 8 },
  recentCard: { minHeight: 105, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B2528', paddingHorizontal: 16, paddingVertical: 16 },
  recentIndex: { width: 46, color: '#C99A2E', fontSize: 20, fontWeight: '900' },
  recentContent: { flex: 1 },
  recentMeta: { color: '#C99A2E', fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  recentTitle: { color: '#F4EBD8', fontSize: 15, fontWeight: '900', marginTop: 5 },
  recentAuthor: { color: '#A9BBB5', fontSize: 10, marginTop: 5 },
  recentArrow: { color: '#C99A2E', fontSize: 28, marginLeft: 10 },
  emptyState: { alignItems: 'center', margin: 22, padding: 30 },
  emptyIcon: { fontSize: 46 },
  emptyTitle: { color: '#F4EBD8', fontSize: 20, fontWeight: '900', marginTop: 12 },
  emptyText: { color: '#B8C8C2', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 18 },
  contributionCard: { marginTop: 50, borderTopWidth: 4, borderTopColor: '#C99A2E', borderRadius: 0, backgroundColor: '#10363A', paddingHorizontal: 24, paddingTop: 34, paddingBottom: 48 },
  contributionEyebrow: { color: '#C99A2E', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  contributionTitle: { maxWidth: 390, color: '#F4EBD8', fontSize: 29, lineHeight: 34, fontWeight: '900', marginTop: 10 },
  contributionText: { maxWidth: 420, color: '#B8C8C2', fontSize: 12, lineHeight: 19, marginTop: 10 },
  contributionActions: { gap: 8, marginTop: 18 },
  contributionPrimary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#C99A2E' },
  contributionPrimaryText: { color: '#071A1C', fontSize: 12, fontWeight: '900' },
  contributionSecondary: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
  contributionSecondaryText: { color: '#E4C778', fontSize: 12, fontWeight: '900' },
});
