import { useAdventures } from '@/context/adventures-context';
import { useAuth } from '@/context/auth-context';
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

export default function PublishScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addAdventure } = useAdventures();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [category, setCategory] = useState('Vélo');
  const [images, setImages] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

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

  async function publishAdventure() {
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
        images,
      });

      if (!success) {
        Alert.alert(
          'Erreur',
          'Impossible de publier cette aventure.'
        );
        return;
      }

      setTitle('');
      setDescription('');
      setStartLocation('');
      setDestination('');
      setCategory('Vélo');
      setImages([]);

      Alert.alert(
        'Aventure publiée',
        'Ton aventure est maintenant dans le fil.',
        [
          {
            text: 'Voir le fil',
            onPress: () => router.replace('/'),
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
            placeholderTextColor="#63766D"
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
            placeholderTextColor="#63766D"
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
                  onPress={() => setCategory(item)}
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

          <Text style={styles.label}>
            Point de départ
          </Text>

          <TextInput
            value={startLocation}
            onChangeText={setStartLocation}
            placeholder="Ex. Montréal, Québec"
            placeholderTextColor="#63766D"
            style={styles.input}
            maxLength={100}
            editable={!publishing}
          />

          <Text style={styles.label}>Destination</Text>

          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="Ex. Ushuaïa, Argentine"
            placeholderTextColor="#63766D"
            style={styles.input}
            maxLength={100}
            editable={!publishing}
          />

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
                  color="#071310"
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
    backgroundColor: '#071310',
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
    color: '#62E6B1',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  title: {
    color: '#F3FFF9',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },

  subtitle: {
    color: '#8FA69B',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  coverButton: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#386B59',
    backgroundColor: '#0C1C17',
    marginBottom: 20,
  },

  coverIcon: {
    color: '#62E6B1',
    fontSize: 42,
  },

  coverTitle: {
    color: '#F3FFF9',
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
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0C1C17',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  coverBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: '#62E6B1',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  coverBadgeText: {
    color: '#071310',
    fontSize: 10,
    fontWeight: '900',
  },

  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
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
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#386B59',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C1C17',
  },

  addMoreIcon: {
    color: '#62E6B1',
    fontSize: 32,
  },

  addMoreText: {
    color: '#A4B8AF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },

  label: {
    color: '#DFFFF2',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 9,
    marginTop: 8,
  },

  input: {
    minHeight: 55,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#0C1C17',
    color: '#F3FFF9',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  textArea: {
    minHeight: 140,
  },

  characterCount: {
    color: '#63766D',
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
    borderRadius: 999,
    backgroundColor: '#10251E',
    borderWidth: 1,
    borderColor: '#1D4538',
  },

  categoryButtonActive: {
    backgroundColor: '#62E6B1',
    borderColor: '#62E6B1',
  },

  categoryText: {
    color: '#A4B8AF',
    fontSize: 13,
    fontWeight: '700',
  },

  categoryTextActive: {
    color: '#071310',
    fontWeight: '900',
  },

  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#0C1C17',
    borderWidth: 1,
    borderColor: '#19392E',
    padding: 16,
    marginTop: 22,
    marginBottom: 22,
  },

  visibilityIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#173D31',
  },

  visibilityEmoji: {
    fontSize: 22,
  },

  visibilityContent: {
    flex: 1,
    marginLeft: 13,
  },

  visibilityTitle: {
    color: '#F3FFF9',
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
    borderRadius: 18,
    backgroundColor: '#62E6B1',
  },

  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  publishButtonText: {
    color: '#071310',
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