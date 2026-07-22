import { useCuriosities } from '@/context/curiosities-context';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/context/favorites-context';
import { CollectionPicker } from '@/components/collection-picker';
import { openDirections } from '@/lib/directions';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
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

  const { curiosities, deleteCuriosity, refreshCuriosities } = useCuriosities();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [deleting, setDeleting] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [collectionPickerVisible, setCollectionPickerVisible] = useState(false);
  const [requestingVerification, setRequestingVerification] = useState(false);
  const [verificationDecision, setVerificationDecision] = useState<{ status: string; decision_note: string; reviewed_at: string | null } | null>(null);

  const curiosity = curiosities.find(
    (item) => item.id === id
  );
  const favorite = curiosity ? isFavorite({ type: 'curiosity', id: curiosity.id }) : false;

  useEffect(() => {
    async function loadDecision() {
      if (!curiosity || user?.id !== curiosity.ownerId) { setVerificationDecision(null); return; }
      const { data } = await supabase.from('curiosity_verification_requests').select('status, decision_note, reviewed_at').eq('curiosity_id', curiosity.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      setVerificationDecision(data);
    }
    void loadDecision();
  }, [curiosity, user]);

  async function handleFavorite() {
    if (!curiosity || savingFavorite) return;
    if (!user) {
      Alert.alert('Connexion requise', 'Connecte-toi pour enregistrer cette curiosité.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Connexion', onPress: () => router.push('/auth') }]);
      return;
    }
    setSavingFavorite(true);
    const success = await toggleFavorite({ type: 'curiosity', id: curiosity.id });
    setSavingFavorite(false);
    if (!success) Alert.alert('Erreur', 'Impossible de modifier ce favori.');
  }

  function confirmDelete() {
    if (!curiosity || deleting) return;
    Alert.alert(
      'Supprimer la curiosité',
      'Cette action est définitive. Les photos associées seront aussi supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const success = await deleteCuriosity(curiosity.id);
            setDeleting(false);
            if (success) router.replace('/profile');
            else Alert.alert('Erreur', 'Impossible de supprimer la curiosité.');
          },
        },
      ]
    );
  }

  async function requestVerification() {
    if (!curiosity || requestingVerification) return;
    setRequestingVerification(true);
    const { error } = await supabase.rpc('request_curiosity_verification', { target_curiosity_id: curiosity.id });
    setRequestingVerification(false);
    if (error) Alert.alert('Demande impossible', 'Vérifie que la curiosité est publiée et qu’aucune demande n’est déjà en attente.');
    else { await refreshCuriosities(); Alert.alert('Demande envoyée', 'La curiosité sera examinée par un modérateur.'); }
  }

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
                : curiosity.verificationStatus === 'pending'
                  ? '⏳ Vérification en attente'
                  : '? À vérifier'}
          </Text>
        </View>
        <Pressable style={[styles.favoriteButton, favorite && styles.favoriteButtonActive]} onPress={() => void handleFavorite()} disabled={savingFavorite}>
          <Text style={[styles.favoriteButtonText, favorite && styles.favoriteButtonTextActive]}>{favorite ? '♥ Enregistrée' : '♡ Enregistrer'}</Text>
        </Pressable>
        {user ? <Pressable style={styles.favoriteButton} onPress={() => setCollectionPickerVisible(true)}><Text style={styles.favoriteButtonText}>＋ Ajouter à une collection</Text></Pressable> : null}
        <CollectionPicker target={{ type: 'curiosity', id: curiosity.id }} visible={collectionPickerVisible} onClose={() => setCollectionPickerVisible(false)} />

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

        <Pressable
          style={styles.authorCard}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: curiosity.ownerId } })}
        >
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
        </Pressable>
        {user?.id === curiosity.ownerId ? (
          <View style={styles.ownerActions}>
            {curiosity.verificationStatus === 'unverified' && curiosity.status === 'published' && verificationDecision?.status !== 'pending' ? <Pressable style={styles.verifyButton} onPress={() => void requestVerification()} disabled={requestingVerification}><Text style={styles.verifyButtonText}>{requestingVerification ? 'Envoi…' : 'Demander la vérification'}</Text></Pressable> : null}
            {verificationDecision?.status === 'pending' ? <Text style={styles.pendingText}>Ta demande de vérification est en cours d’examen.</Text> : null}
            {verificationDecision?.status === 'rejected' ? <View style={styles.decisionCard}><Text style={styles.decisionTitle}>Vérification refusée</Text><Text style={styles.decisionText}>{verificationDecision.decision_note}</Text></View> : null}
            {verificationDecision?.status === 'approved' ? <View style={styles.approvedCard}><Text style={styles.approvedText}>✓ Vérification approuvée</Text></View> : null}
            <Pressable style={styles.editButton} onPress={() => router.push({ pathname: '/edit-curiosity/[id]', params: { id: curiosity.id } })}>
              <Text style={styles.editButtonText}>Modifier la curiosité</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={confirmDelete} disabled={deleting}>
              <Text style={styles.deleteButtonText}>{deleting ? 'Suppression…' : 'Supprimer la curiosité'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.reportButton} onPress={() => user ? router.push({ pathname: '/report', params: { type: 'curiosity', id: curiosity.id, label: curiosity.title } }) : router.push('/auth')}>
            <Text style={styles.reportButtonText}>⚑ Signaler cette curiosité</Text>
          </Pressable>
        )}

        {typeof curiosity.latitude === 'number' &&
        typeof curiosity.longitude === 'number' ? (
          <Pressable
            style={styles.directionsCard}
            onPress={() => void openDirections(
              curiosity.latitude as number,
              curiosity.longitude as number,
              curiosity.title
            )}
          >
            <View>
              <Text style={styles.directionsEyebrow}>SE RENDRE SUR PLACE</Text>
              <Text style={styles.directionsTitle}>Ouvrir l’itinéraire</Text>
            </View>
            <Text style={styles.directionsArrow}>↗</Text>
          </Pressable>
        ) : null}
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
    backgroundColor: '#173E28',
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#356F43',
    backgroundColor: '#245A35',
    marginBottom: 24,
  },

  backIcon: {
    color: '#E9576F',
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },

  eyebrow: {
    color: '#F0A36B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  title: {
    color: '#F5E6C8',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: 8,
  },

  location: {
    color: '#E9576F',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 0,
    backgroundColor: '#3B7C49',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },

  statusText: {
    color: '#F0A36B',
    fontSize: 10,
    fontWeight: '900',
  },

  section: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#315F3C',
    backgroundColor: '#245A35',
    padding: 18,
    marginTop: 25,
  },

  sectionTitle: {
    color: '#F5E6C8',
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#315F3C',
    backgroundColor: '#245A35',
    padding: 14,
    marginTop: 12,
  },

  infoIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#3B7C49',
  },

  infoEmoji: {
    fontSize: 23,
  },

  infoContent: {
    flex: 1,
    marginLeft: 13,
  },

  infoTitle: {
    color: '#FFF1D6',
    fontSize: 13,
    fontWeight: '900',
  },

  infoText: {
    color: '#D0C4A9',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#5B8F5D',
    backgroundColor: '#2F6F3E',
    padding: 16,
    marginTop: 24,
  },

  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#3B7C49',
    marginRight: 13,
  },

  avatarText: {
    color: '#E9576F',
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
    color: '#F5E6C8',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },

  authorHandle: {
    color: '#E9576F',
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
    color: '#F5E6C8',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 12,
  },

  notFoundText: {
    color: '#D0C4A9',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },

  backButtonLarge: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#E9576F',
    paddingHorizontal: 22,
    marginTop: 20,
  },

  backButtonLargeText: {
    color: '#173E28',
    fontSize: 13,
    fontWeight: '900',
  },
  favoriteButton: { alignSelf: 'flex-start', borderRadius: 0, borderWidth: 1, borderColor: '#7BA578', paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  favoriteButtonActive: { backgroundColor: '#E9576F', borderColor: '#E9576F' },
  favoriteButtonText: { color: '#FFF1D6', fontSize: 12, fontWeight: '900' },
  favoriteButtonTextActive: { color: '#173E28' },
  directionsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 0, backgroundColor: '#3B7C49', padding: 17, marginTop: 14 },
  directionsEyebrow: { color: '#82AA99', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  directionsTitle: { color: '#F5E6C8', fontSize: 15, fontWeight: '900', marginTop: 5 },
  directionsArrow: { color: '#E9576F', fontSize: 25 },
  ownerActions: { marginTop: 22, gap: 10 },
  verifyButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#F0A36B', backgroundColor: '#2A2412' },
  verifyButtonText: { color: '#F0A36B', fontSize: 13, fontWeight: '900' },
  pendingText: { color: '#F0A36B', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  decisionCard: { borderRadius: 0, borderWidth: 1, borderColor: '#7B3535', backgroundColor: '#261414', padding: 13 },
  decisionTitle: { color: '#FFB8B8', fontSize: 12, fontWeight: '900' },
  decisionText: { color: '#D29A9A', fontSize: 11, lineHeight: 17, marginTop: 5 },
  approvedCard: { borderRadius: 0, backgroundColor: '#3B7C49', padding: 13 },
  approvedText: { color: '#E9576F', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  editButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#E9576F' },
  editButtonText: { color: '#173E28', fontSize: 14, fontWeight: '900' },
  deleteButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 0, borderWidth: 1, borderColor: '#7B3535', backgroundColor: '#261414' },
  deleteButtonText: { color: '#FFB8B8', fontSize: 14, fontWeight: '900' },
  reportButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 18 },
  reportButtonText: { color: '#D0C4A9', fontSize: 11, fontWeight: '800' },
});
