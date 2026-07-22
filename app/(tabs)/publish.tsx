import { useAdventures } from '@/context/adventures-context';
import { LocationPicker } from '@/components/location-picker';
import { useAuth } from '@/context/auth-context';
import { getRouteProfileForCategory, type RouteProfile } from '@/lib/routing';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categories = [
  'Vélo',
  'Road trip',
  'À pied',
  'Camping',
  'Urbain',
  'Défi',
  'Autre',
];

const routeProfiles: { value: RouteProfile; label: string; detail: string }[] = [
  { value: 'cycling', label: 'Vélo', detail: 'Privilégie les pistes cyclables' },
  { value: 'walking', label: 'Marche', detail: 'Suit les trottoirs et sentiers' },
  { value: 'driving', label: 'Auto', detail: 'Suit le réseau routier' },
];

export default function PublishScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addAdventure } = useAdventures();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [category, setCategory] = useState('Vélo');
  const [routingProfile, setRoutingProfile] = useState<RouteProfile>('cycling');
  const [durationHours, setDurationHours] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [coordinate, setCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [publishing, setPublishing] = useState(false);

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);
    const suggestedProfile = getRouteProfileForCategory(nextCategory);
    if (suggestedProfile) setRoutingProfile(suggestedProfile);
  }

  async function pickImages() {
    if (publishing) {
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission requise',
        'Fragmenta doit accéder à tes photos pour les ajouter à ta publication.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const selectedUris = result.assets.map((asset) => asset.uri);

    setImages((currentImages) => {
      const combinedImages = [
        ...currentImages,
        ...selectedUris,
      ];

      const uniqueImages = [...new Set(combinedImages)];

      return uniqueImages.slice(0, 10);
    });
  }

  function removeImage(imageUri: string) {
    if (publishing) {
      return;
    }

    setImages((currentImages) =>
      currentImages.filter((uri) => uri !== imageUri)
    );
  }

  async function handlePublish() {
    if (publishing) {
      return;
    }

    if (!user) {
      Alert.alert(
        'Compte requis',
        'Tu dois créer un compte ou te connecter pour publier une aventure.',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Connexion',
            onPress: () => router.push('/auth'),
          },
        ]
      );

      return;
    }

    if (!title.trim()) {
      Alert.alert(
        'Titre requis',
        'Donne un titre à ton aventure.'
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        'Description requise',
        'Explique rapidement ce que tu vas faire.'
      );
      return;
    }

    if (images.length === 0) {
      Alert.alert(
        'Photo recommandée',
        'Ajoute au moins une photo pour rendre ton aventure plus intéressante.',
        [
          {
            text: 'Ajouter une photo',
            onPress: () => {
              void pickImages();
            },
          },
          {
            text: 'Publier quand même',
            onPress: () => {
              void publishAdventure();
            },
          },
        ]
      );

      return;
    }

    await publishAdventure();
  }

  async function saveAdventure(
    publicationStatus: 'draft' | 'published'
  ) {
    if (publishing) {
      return;
    }

    setPublishing(true);

    try {
      const success = await addAdventure({
        title,
        description,
        startLocation,
        destination,
        category,
        routingProfile,
        durationMinutes: durationHours.trim() ? Math.round(Number(durationHours.replace(',', '.')) * 60) : 0,
        images,
        publicationStatus,
        latitude: coordinate?.latitude,
        longitude: coordinate?.longitude,
      });

      if (!success) {
        Alert.alert(
          'Erreur',
          publicationStatus === 'draft'
            ? "Impossible d'enregistrer ce brouillon."
            : 'Impossible de publier cette aventure.'
        );
        return;
      }

      setTitle('');
      setDescription('');
      setStartLocation('');
      setDestination('');
      setCategory('Vélo');
      setRoutingProfile('cycling');
      setDurationHours('');
      setImages([]);
      setCoordinate(null);

      Alert.alert(
        publicationStatus === 'draft'
          ? 'Brouillon enregistré'
          : 'Aventure publiée',
        publicationStatus === 'draft'
          ? 'Tu peux retrouver ce brouillon dans ton profil.'
          : 'Ton aventure est maintenant dans le fil.',
        [
          {
            text:
              publicationStatus === 'draft'
                ? 'Voir mon profil'
                : 'Voir le fil',
            onPress: () =>
              router.replace(
                publicationStatus === 'draft' ? '/profile' : '/'
              ),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Erreur pendant la publication :',
        error
      );

      Alert.alert(
        'Erreur',
        'Une erreur inattendue est survenue pendant la publication.'
      );
    } finally {
      setPublishing(false);
    }
  }

  async function publishAdventure() {
    await saveAdventure('published');
  }

  async function saveDraft() {
    if (!user) {
      Alert.alert(
        'Compte requis',
        'Tu dois être connecté pour enregistrer un brouillon.'
      );
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert(
        'Informations manquantes',
        'Ajoute au minimum un titre et une description.'
      );
      return;
    }

    await saveAdventure('draft');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              NOUVELLE AVENTURE
            </Text>

            <Text style={styles.title}>
              Crée une aventure
            </Text>

            <Text style={styles.subtitle}>
              Publie ton prochain voyage, défi ou projet
              complètement fou.
            </Text>
          </View>

          <Pressable
            style={styles.coverButton}
            onPress={pickImages}
            disabled={publishing}
          >
            <Text style={styles.coverIcon}>＋</Text>

            <Text style={styles.coverTitle}>
              Ajouter des photos
            </Text>

            <Text style={styles.coverText}>
              Jusqu’à 10 images
            </Text>
          </Pressable>

          {images.length > 0 ? (
            <>
              <View style={styles.imageSectionHeader}>
                <Text style={styles.label}>
                  Photos sélectionnées
                </Text>

                <Text style={styles.imageCounter}>
                  {images.length}/10
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageList}
              >
                {images.map((imageUri, index) => (
                  <View
                    key={`${imageUri}-${index}`}
                    style={styles.imageCard}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.previewImage}
                    />

                    {index === 0 ? (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>
                          Couverture
                        </Text>
                      </View>
                    ) : null}

                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() =>
                        removeImage(imageUri)
                      }
                      disabled={publishing}
                    >
                      <Text style={styles.removeImageText}>
                        ×
                      </Text>
                    </Pressable>
                  </View>
                ))}

                {images.length < 10 ? (
                  <Pressable
                    style={styles.addMoreButton}
                    onPress={pickImages}
                    disabled={publishing}
                  >
                    <Text style={styles.addMoreIcon}>
                      ＋
                    </Text>

                    <Text style={styles.addMoreText}>
                      Ajouter
                    </Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.label}>
            Titre de l’aventure
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex. Traverser le Canada à vélo"
            placeholderTextColor="#B8B59E"
            style={styles.input}
            maxLength={80}
            editable={!publishing}
          />

          <Text style={styles.characterCount}>
            {title.length}/80
          </Text>

          <Text style={styles.label}>Description</Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Raconte ton objectif, ton plan et pourquoi cette aventure est folle."
            placeholderTextColor="#B8B59E"
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
            maxLength={500}
            editable={!publishing}
          />

          <Text style={styles.characterCount}>
            {description.length}/500
          </Text>

          <Text style={styles.label}>Catégorie</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {categories.map((item) => {
              const isSelected = category === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => selectCategory(item)}
                  disabled={publishing}
                  style={[
                    styles.categoryButton,
                    isSelected &&
                      styles.categoryButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected &&
                        styles.categoryTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Mode du trajet</Text>
          <Text style={styles.routeHint}>Choisi automatiquement selon la catégorie, mais reste modifiable.</Text>
          <View style={styles.routeProfiles}>
            {routeProfiles.map((item) => {
              const selected = routingProfile === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setRoutingProfile(item.value)}
                  disabled={publishing}
                  style={[styles.routeProfileButton, selected && styles.routeProfileButtonActive]}
                >
                  <Text style={[styles.routeProfileLabel, selected && styles.routeProfileLabelActive]}>{item.label}</Text>
                  <Text style={[styles.routeProfileDetail, selected && styles.routeProfileDetailActive]}>{item.detail}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>
            Point de départ
          </Text>

          <TextInput
            value={startLocation}
            onChangeText={setStartLocation}
            placeholder="Ex. Montréal, Québec"
            placeholderTextColor="#B8B59E"
            style={styles.input}
            maxLength={100}
            editable={!publishing}
          />

          <Text style={styles.label}>Destination</Text>

          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="Ex. Ushuaïa, Argentine"
            placeholderTextColor="#B8B59E"
            style={styles.input}
            maxLength={100}
            editable={!publishing}
          />

          <Text style={styles.label}>Durée totale estimée</Text>
          <View style={styles.durationInputRow}><TextInput value={durationHours} onChangeText={(value) => setDurationHours(value.replace(/[^0-9,.]/g, ''))} placeholder="Ex. 12" placeholderTextColor="#B8B59E" style={[styles.input, styles.durationInput]} keyboardType="decimal-pad" maxLength={7} editable={!publishing} /><Text style={styles.durationUnit}>heures</Text></View>

          <Text style={styles.label}>Position sur la carte</Text>
          <LocationPicker coordinate={coordinate} onSelect={setCoordinate} />
          <Text style={styles.mapHelper}>
            {coordinate
              ? `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`
              : 'Facultatif — touche la carte pour choisir un point.'}
          </Text>

          <View style={styles.visibilityCard}>
            <View style={styles.visibilityIcon}>
              <Text style={styles.visibilityEmoji}>
                🌎
              </Text>
            </View>

            <View style={styles.visibilityContent}>
              <Text style={styles.visibilityTitle}>
                Aventure publique
              </Text>

              <Text style={styles.visibilityText}>
                Tout le monde pourra suivre et commenter
                cette aventure.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              void handlePublish();
            }}
            disabled={publishing}
            style={({ pressed }) => [
              styles.publishButton,
              pressed && styles.buttonPressed,
              publishing && styles.buttonDisabled,
            ]}
          >
            {publishing ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator
                  size="small"
                  color="#173E28"
                />

                <Text style={styles.publishButtonText}>
                  Publication…
                </Text>
              </View>
            ) : (
              <Text style={styles.publishButtonText}>
                Publier l’aventure
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.draftButton}
            disabled={publishing}
            onPress={() => {
              void saveDraft();
            }}
          >
            <Text style={styles.draftButtonText}>
              Enregistrer comme brouillon
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#173E28',
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120,
  },

  header: {
    marginBottom: 22,
  },

  eyebrow: {
    color: '#E9576F',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  title: {
    color: '#F5E6C8',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },

  subtitle: {
    color: '#D8CFBA',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  coverButton: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#7BA578',
    backgroundColor: '#245A35',
    marginBottom: 20,
  },

  coverIcon: {
    color: '#E9576F',
    fontSize: 42,
  },

  coverTitle: {
    color: '#F5E6C8',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },

  coverText: {
    color: '#7F968B',
    fontSize: 13,
    marginTop: 4,
  },

  imageSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  imageCounter: {
    color: '#7F968B',
    fontSize: 12,
  },

  imageList: {
    gap: 12,
    paddingBottom: 18,
  },

  imageCard: {
    width: 150,
    height: 180,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#245A35',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  coverBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: '#E9576F',
    borderRadius: 0,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  coverBadgeText: {
    color: '#173E28',
    fontSize: 10,
    fontWeight: '900',
  },

  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },

  removeImageText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
  },

  addMoreButton: {
    width: 110,
    height: 180,
    borderRadius: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#7BA578',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#245A35',
  },

  addMoreIcon: {
    color: '#E9576F',
    fontSize: 32,
  },

  addMoreText: {
    color: '#A4B8AF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },

  label: {
    color: '#FFF1D6',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 9,
    marginTop: 8,
  },

  input: {
    minHeight: 55,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#356F43',
    backgroundColor: '#245A35',
    color: '#F5E6C8',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  textArea: {
    minHeight: 140,
  },

  characterCount: {
    color: '#B8B59E',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 5,
    marginBottom: 8,
  },

  categories: {
    gap: 9,
    paddingBottom: 14,
  },

  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 0,
    backgroundColor: '#2F6F3E',
    borderWidth: 1,
    borderColor: '#356F43',
  },

  categoryButtonActive: {
    backgroundColor: '#E9576F',
    borderColor: '#E9576F',
  },

  categoryText: {
    color: '#A4B8AF',
    fontSize: 13,
    fontWeight: '700',
  },

  categoryTextActive: {
    color: '#173E28',
    fontWeight: '900',
  },

  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    backgroundColor: '#245A35',
    borderWidth: 1,
    borderColor: '#315F3C',
    padding: 16,
    marginTop: 22,
    marginBottom: 22,
  },

  routeHint: { color: '#D0C4A9', fontSize: 11, lineHeight: 16, marginTop: -3, marginBottom: 9 },
  durationInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, durationInput: { flex: 1 }, durationUnit: { color: '#E9576F', fontSize: 13, fontWeight: '900', paddingRight: 8 },
  routeProfiles: { gap: 8 },
  routeProfileButton: { borderRadius: 0, borderWidth: 1, borderColor: '#356F43', backgroundColor: '#245A35', paddingHorizontal: 15, paddingVertical: 12 },
  routeProfileButtonActive: { borderColor: '#E9576F', backgroundColor: '#3B7C49' },
  routeProfileLabel: { color: '#FFF1D6', fontSize: 13, fontWeight: '900' },
  routeProfileLabelActive: { color: '#E9576F' },
  routeProfileDetail: { color: '#BDB7A3', fontSize: 11, marginTop: 3 },
  routeProfileDetailActive: { color: '#BFEEDB' },
  mapHelper: { color: '#B8B59E', fontSize: 11, marginTop: 8 },

  visibilityIcon: {
    width: 46,
    height: 46,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B7C49',
  },

  visibilityEmoji: {
    fontSize: 22,
  },

  visibilityContent: {
    flex: 1,
    marginLeft: 13,
  },

  visibilityTitle: {
    color: '#F5E6C8',
    fontSize: 15,
    fontWeight: '800',
  },

  visibilityText: {
    color: '#7F968B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  publishButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#E9576F',
  },

  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  publishButtonText: {
    color: '#173E28',
    fontSize: 16,
    fontWeight: '900',
  },

  draftButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  draftButtonText: {
    color: '#95AA9F',
    fontSize: 14,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  buttonDisabled: {
    opacity: 0.65,
  },
});
