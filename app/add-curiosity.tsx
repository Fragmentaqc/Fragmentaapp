import { useAdventures } from '@/context/adventures-context';
import { useAuth } from '@/context/auth-context';
import { useCuriosities } from '@/context/curiosities-context';
import { LocationPicker } from '@/components/location-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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

export default function AddCuriosityScreen() {
  const { user } = useAuth();
  const { adventures } = useAdventures();
  const { addCuriosity } = useCuriosities();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] =
    useState('Lieu insolite');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [accessibility, setAccessibility] = useState('');
  const [bestTimeToVisit, setBestTimeToVisit] =
    useState('');
  const [recommendedDuration, setRecommendedDuration] =
    useState('');
  const [selectedAdventureId, setSelectedAdventureId] =
    useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  const userAdventures = useMemo(() => {
    if (!user) {
      return [];
    }

    return adventures.filter(
      (adventure) => adventure.ownerId === user.id
    );
  }, [adventures, user]);

  async function pickImages() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission requise',
        'Fragmenta a besoin de ton autorisation pour accéder aux photos.'
      );

      return;
    }

    const remainingSlots = 10 - images.length;

    if (remainingSlots <= 0) {
      Alert.alert(
        'Maximum atteint',
        'Tu peux ajouter un maximum de 10 photos.'
      );

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.85,
      });

    if (result.canceled) {
      return;
    }

    const selectedImages = result.assets
      .map((asset) => asset.uri)
      .filter(Boolean);

    setImages((currentImages) => [
      ...currentImages,
      ...selectedImages,
    ].slice(0, 10));
  }

  function removeImage(imageIndex: number) {
    setImages((currentImages) =>
      currentImages.filter(
        (_, index) => index !== imageIndex
      )
    );
  }

  function parseCoordinate(value: string) {
    const normalizedValue = value
      .trim()
      .replace(',', '.');

    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number(normalizedValue);

    return Number.isFinite(parsedValue)
      ? parsedValue
      : null;
  }

  async function submitCuriosity(
    status: 'draft' | 'published'
  ) {
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

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle) {
      Alert.alert(
        'Nom manquant',
        'Ajoute le nom de la curiosité.'
      );

      return;
    }

    if (!cleanDescription) {
      Alert.alert(
        'Description manquante',
        'Décris ce qui rend ce lieu intéressant.'
      );

      return;
    }

    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);

    if (
      latitude.trim() &&
      parsedLatitude === null
    ) {
      Alert.alert(
        'Latitude invalide',
        'Entre une latitude valide, par exemple 45.5019.'
      );

      return;
    }

    if (
      longitude.trim() &&
      parsedLongitude === null
    ) {
      Alert.alert(
        'Longitude invalide',
        'Entre une longitude valide, par exemple -73.5674.'
      );

      return;
    }

    if (
      parsedLatitude !== null &&
      (parsedLatitude < -90 || parsedLatitude > 90)
    ) {
      Alert.alert(
        'Latitude invalide',
        'La latitude doit être comprise entre -90 et 90.'
      );

      return;
    }

    if (
      parsedLongitude !== null &&
      (parsedLongitude < -180 ||
        parsedLongitude > 180)
    ) {
      Alert.alert(
        'Longitude invalide',
        'La longitude doit être comprise entre -180 et 180.'
      );

      return;
    }

    setPublishing(true);

    const success = await addCuriosity({
      adventureId: selectedAdventureId,
      title: cleanTitle,
      description: cleanDescription,
      category,
      locationName: locationName.trim(),
      address: address.trim(),
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      accessibility: accessibility.trim(),
      bestTimeToVisit: bestTimeToVisit.trim(),
      recommendedDuration:
        recommendedDuration.trim(),
      images,
      status,
    });

    setPublishing(false);

    if (!success) {
      Alert.alert(
        'Erreur',
        'La curiosité n’a pas pu être enregistrée.'
      );

      return;
    }

    Alert.alert(
      status === 'draft'
        ? 'Brouillon enregistré'
        : 'Curiosité publiée',
      status === 'draft'
        ? 'Ta curiosité a été enregistrée comme brouillon.'
        : 'Ta curiosité est maintenant visible dans Fragmenta.',
      [
        {
          text: 'Continuer',
          onPress: () => router.back(),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                CONTRIBUTION COMMUNAUTAIRE
              </Text>

              <Text style={styles.title}>
                Ajouter une curiosité
              </Text>
            </View>
          </View>

          <Text style={styles.intro}>
            Partage un lieu étrange, méconnu, historique ou
            remarquable que les autres explorateurs devraient
            découvrir.
          </Text>

          {!user ? (
            <Pressable
              style={styles.authCard}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.authIcon}>🔐</Text>

              <View style={styles.authTextArea}>
                <Text style={styles.authTitle}>
                  Connexion requise
                </Text>

                <Text style={styles.authText}>
                  Connecte-toi pour publier une curiosité.
                </Text>
              </View>

              <Text style={styles.authArrow}>›</Text>
            </Pressable>
          ) : null}

          <SectionTitle
            number="01"
            title="Informations principales"
          />

          <FieldLabel
            title="Nom du lieu"
            required
          />

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex. Le tunnel oublié de la montagne"
            placeholderTextColor="#61766D"
            style={styles.input}
            maxLength={120}
          />

          <FieldLabel
            title="Description"
            required
          />

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Explique ce qui rend ce lieu unique, étrange ou intéressant..."
            placeholderTextColor="#61766D"
            style={[
              styles.input,
              styles.textAreaLarge,
            ]}
            multiline
            textAlignVertical="top"
            maxLength={3000}
          />

          <Text style={styles.characterCount}>
            {description.length}/3000
          </Text>

          <FieldLabel title="Catégorie" />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {categories.map((item) => {
              const selected = item === category;

              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryButton,
                    selected &&
                      styles.categoryButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selected &&
                        styles.categoryTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <SectionTitle
            number="02"
            title="Emplacement"
          />

          <FieldLabel title="Nom de l’endroit" />

          <TextInput
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Ex. Montréal, Québec"
            placeholderTextColor="#61766D"
            style={styles.input}
          />

          <FieldLabel title="Adresse ou indication" />

          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Adresse, route, parc ou point de repère"
            placeholderTextColor="#61766D"
            style={styles.input}
          />

          <View style={styles.coordinateRow}>
            <View style={styles.coordinateField}>
              <FieldLabel title="Latitude" />

              <TextInput
                value={latitude}
                onChangeText={setLatitude}
                placeholder="45.5019"
                placeholderTextColor="#61766D"
                style={styles.input}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.coordinateField}>
              <FieldLabel title="Longitude" />

              <TextInput
                value={longitude}
                onChangeText={setLongitude}
                placeholder="-73.5674"
                placeholderTextColor="#61766D"
                style={styles.input}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <LocationPicker
            coordinate={
              parseCoordinate(latitude) !== null && parseCoordinate(longitude) !== null
                ? { latitude: parseCoordinate(latitude) as number, longitude: parseCoordinate(longitude) as number }
                : null
            }
            onSelect={(coordinate) => {
              setLatitude(coordinate.latitude.toFixed(6));
              setLongitude(coordinate.longitude.toFixed(6));
            }}
          />

          <Text style={styles.helperText}>
            Les coordonnées permettront d’afficher la curiosité
            directement sur la carte.
          </Text>

          <SectionTitle
            number="03"
            title="Conseils de visite"
          />

          <FieldLabel title="Accessibilité" />

          <TextInput
            value={accessibility}
            onChangeText={setAccessibility}
            placeholder="Ex. Accessible à pied, stationnement proche..."
            placeholderTextColor="#61766D"
            style={[
              styles.input,
              styles.textArea,
            ]}
            multiline
            textAlignVertical="top"
          />

          <FieldLabel title="Meilleur moment pour visiter" />

          <TextInput
            value={bestTimeToVisit}
            onChangeText={setBestTimeToVisit}
            placeholder="Ex. Au coucher du soleil, en automne..."
            placeholderTextColor="#61766D"
            style={styles.input}
          />

          <FieldLabel title="Durée recommandée" />

          <TextInput
            value={recommendedDuration}
            onChangeText={setRecommendedDuration}
            placeholder="Ex. 30 minutes, 2 heures..."
            placeholderTextColor="#61766D"
            style={styles.input}
          />

          <SectionTitle
            number="04"
            title="Photos"
          />

          <Pressable
            style={styles.imagePicker}
            onPress={pickImages}
          >
            <Text style={styles.imagePickerIcon}>＋</Text>

            <Text style={styles.imagePickerTitle}>
              Ajouter des photos
            </Text>

            <Text style={styles.imagePickerText}>
              Jusqu’à 10 images
            </Text>
          </Pressable>

          {images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesList}
            >
              {images.map((imageUri, index) => (
                <View
                  key={`${imageUri}-${index}`}
                  style={styles.imageWrapper}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                  />

                  <Pressable
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageText}>
                      ×
                    </Text>
                  </Pressable>

                  {index === 0 ? (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>
                        Couverture
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : null}

          <SectionTitle
            number="05"
            title="Aventure liée"
          />

          <Text style={styles.sectionDescription}>
            Tu peux relier cette curiosité à une aventure déjà
            publiée.
          </Text>

          <Pressable
            style={[
              styles.adventureChoice,
              selectedAdventureId === null &&
                styles.adventureChoiceSelected,
            ]}
            onPress={() =>
              setSelectedAdventureId(null)
            }
          >
            <View style={styles.adventureChoiceIcon}>
              <Text style={styles.adventureChoiceEmoji}>
                🧭
              </Text>
            </View>

            <View style={styles.adventureChoiceText}>
              <Text style={styles.adventureChoiceTitle}>
                Aucune aventure liée
              </Text>

              <Text style={styles.adventureChoiceSubtitle}>
                Publier cette curiosité indépendamment
              </Text>
            </View>

            <View
              style={[
                styles.radio,
                selectedAdventureId === null &&
                  styles.radioSelected,
              ]}
            />
          </Pressable>

          {userAdventures.map((adventure) => {
            const selected =
              selectedAdventureId === adventure.id;

            return (
              <Pressable
                key={adventure.id}
                style={[
                  styles.adventureChoice,
                  selected &&
                    styles.adventureChoiceSelected,
                ]}
                onPress={() =>
                  setSelectedAdventureId(adventure.id)
                }
              >
                <View style={styles.adventureChoiceIcon}>
                  <Text style={styles.adventureChoiceEmoji}>
                    {adventure.emoji}
                  </Text>
                </View>

                <View style={styles.adventureChoiceText}>
                  <Text
                    style={styles.adventureChoiceTitle}
                    numberOfLines={1}
                  >
                    {adventure.title}
                  </Text>

                  <Text
                    style={styles.adventureChoiceSubtitle}
                    numberOfLines={1}
                  >
                    {adventure.location}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    selected &&
                      styles.radioSelected,
                  ]}
                />
              </Pressable>
            );
          })}

          <View style={styles.noticeCard}>
            <Text style={styles.noticeIcon}>✓</Text>

            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>
                Information communautaire
              </Text>

              <Text style={styles.noticeText}>
                La curiosité sera publiée avec le statut « à
                vérifier » jusqu’à ce qu’elle soit confirmée par
                la communauté.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              disabled={publishing || !user}
              onPress={() =>
                void submitCuriosity('draft')
              }
              style={[
                styles.draftButton,
                (!user || publishing) &&
                  styles.buttonDisabled,
              ]}
            >
              <Text style={styles.draftButtonText}>
                Enregistrer le brouillon
              </Text>
            </Pressable>

            <Pressable
              disabled={publishing || !user}
              onPress={() =>
                void submitCuriosity('published')
              }
              style={[
                styles.publishButton,
                (!user || publishing) &&
                  styles.buttonDisabled,
              ]}
            >
              {publishing ? (
                <ActivityIndicator
                  color="#071310"
                  size="small"
                />
              ) : (
                <>
                  <Text style={styles.publishButtonText}>
                    Publier
                  </Text>

                  <Text style={styles.publishArrow}>›</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({
  title,
  required = false,
}: {
  title: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.fieldLabel}>
      {title}
      {required ? (
        <Text style={styles.required}> *</Text>
      ) : null}
    </Text>
  );
}

function SectionTitle({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>
          {number}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#071310',
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#0C1C17',
  },

  backIcon: {
    color: '#62E6B1',
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '500',
    marginTop: -3,
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  eyebrow: {
    color: '#62E6B1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  title: {
    color: '#F3FFF9',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 4,
  },

  intro: {
    color: '#8FA69B',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 20,
  },

  authCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#5B4A25',
    backgroundColor: '#211C10',
    padding: 15,
    marginTop: 18,
  },

  authIcon: {
    fontSize: 27,
  },

  authTextArea: {
    flex: 1,
    marginLeft: 12,
  },

  authTitle: {
    color: '#FFF5D8',
    fontSize: 14,
    fontWeight: '900',
  },

  authText: {
    color: '#B7A980',
    fontSize: 11,
    marginTop: 4,
  },

  authArrow: {
    color: '#F0C96B',
    fontSize: 28,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 18,
  },

  sectionNumber: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#173D31',
    marginRight: 10,
  },

  sectionNumberText: {
    color: '#62E6B1',
    fontSize: 11,
    fontWeight: '900',
  },

  sectionTitle: {
    color: '#F3FFF9',
    fontSize: 19,
    fontWeight: '900',
  },

  sectionDescription: {
    color: '#81958C',
    fontSize: 12,
    lineHeight: 18,
    marginTop: -7,
    marginBottom: 14,
  },

  fieldLabel: {
    color: '#CDE4DA',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 14,
  },

  required: {
    color: '#FF6262',
  },

  input: {
    minHeight: 54,
    color: '#F3FFF9',
    fontSize: 14,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#0C1C17',
    paddingHorizontal: 15,
    paddingVertical: 13,
  },

  textArea: {
    minHeight: 100,
  },

  textAreaLarge: {
    minHeight: 145,
  },

  characterCount: {
    alignSelf: 'flex-end',
    color: '#61766D',
    fontSize: 10,
    marginTop: 6,
  },

  categories: {
    gap: 9,
    paddingRight: 16,
  },

  categoryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
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

  coordinateRow: {
    flexDirection: 'row',
    gap: 10,
  },

  coordinateField: {
    flex: 1,
  },

  helperText: {
    color: '#61766D',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
  },

  imagePicker: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2B6552',
    backgroundColor: '#0C1C17',
  },

  imagePickerIcon: {
    color: '#62E6B1',
    fontSize: 34,
    fontWeight: '300',
  },

  imagePickerTitle: {
    color: '#F3FFF9',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 5,
  },

  imagePickerText: {
    color: '#61766D',
    fontSize: 11,
    marginTop: 4,
  },

  imagesList: {
    gap: 11,
    paddingTop: 13,
    paddingRight: 16,
  },

  imageWrapper: {
    width: 130,
    height: 130,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#173D31',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  removeImageButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: 'rgba(7, 19, 16, 0.92)',
  },

  removeImageText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 21,
  },

  coverBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    borderRadius: 0,
    backgroundColor: 'rgba(7, 19, 16, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  coverBadgeText: {
    color: '#62E6B1',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  adventureChoice: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#19392E',
    backgroundColor: '#0C1C17',
    padding: 12,
    marginBottom: 10,
  },

  adventureChoiceSelected: {
    borderColor: '#62E6B1',
    backgroundColor: '#10251E',
  },

  adventureChoiceIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#173D31',
  },

  adventureChoiceEmoji: {
    fontSize: 21,
  },

  adventureChoiceText: {
    flex: 1,
    marginLeft: 12,
  },

  adventureChoiceTitle: {
    color: '#F3FFF9',
    fontSize: 13,
    fontWeight: '900',
  },

  adventureChoiceSubtitle: {
    color: '#70877D',
    fontSize: 10,
    marginTop: 4,
  },

  radio: {
    width: 19,
    height: 19,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#496057',
  },

  radioSelected: {
    borderWidth: 5,
    borderColor: '#62E6B1',
    backgroundColor: '#071310',
  },

  noticeCard: {
    flexDirection: 'row',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#10251E',
    padding: 15,
    marginTop: 22,
  },

  noticeIcon: {
    width: 34,
    height: 34,
    color: '#071310',
    fontSize: 18,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
    borderRadius: 0,
    backgroundColor: '#62E6B1',
    overflow: 'hidden',
  },

  noticeContent: {
    flex: 1,
    marginLeft: 12,
  },

  noticeTitle: {
    color: '#DFFFF2',
    fontSize: 13,
    fontWeight: '900',
  },

  noticeText: {
    color: '#81958C',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
  },

  draftButton: {
    flex: 1,
    minHeight: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#2A5B49',
    backgroundColor: '#10251E',
    paddingHorizontal: 10,
  },

  draftButtonText: {
    color: '#DFFFF2',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  publishButton: {
    flex: 1,
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#62E6B1',
    paddingHorizontal: 16,
  },

  publishButtonText: {
    color: '#071310',
    fontSize: 14,
    fontWeight: '900',
  },

  publishArrow: {
    color: '#071310',
    fontSize: 24,
    fontWeight: '800',
    marginLeft: 6,
  },

  buttonDisabled: {
    opacity: 0.45,
  },
});
