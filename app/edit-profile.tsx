import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

type ProfileForm = {
  displayName: string;
  username: string;
  bio: string;
  country: string;
  avatarUrl: string | null;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    displayName: '',
    username: '',
    bio: '',
    country: '',
    avatarUrl: null,
  });

  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, username, bio, country, avatar_url')
     .eq('id', user.id)
.maybeSingle();

    if (error) {
  Alert.alert('Erreur', error.message);
  setLoading(false);
  return;
}

if (data) {
  setForm({
    displayName: data.display_name ?? '',
    username: data.username ?? '',
    bio: data.bio ?? '',
    country: data.country ?? '',
    avatarUrl: data.avatar_url ?? null,
  });
}

    setLoading(false);
  }

  async function selectAvatar() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission requise',
        'Autorise Fragmenta à accéder à tes photos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedAvatar(result.assets[0].uri);
    }
  }

  async function uploadAvatar(uri: string): Promise<string> {
    if (!user) {
      throw new Error('Utilisateur non connecté.');
    }

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const extension =
      uri.split('.').pop()?.toLowerCase().split('?')[0] || 'jpg';

    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function saveProfile() {
    if (!user) {
      Alert.alert('Connexion requise');
      return;
    }

    const cleanUsername = form.username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');

    if (!form.displayName.trim()) {
      Alert.alert('Nom requis', 'Ajoute ton nom affiché.');
      return;
    }

    if (cleanUsername.length < 3) {
      Alert.alert(
        'Pseudo invalide',
        'Le nom d’utilisateur doit contenir au moins 3 caractères.'
      );
      return;
    }

    setSaving(true);

    try {
      let avatarUrl = form.avatarUrl;

      if (selectedAvatar) {
        avatarUrl = await uploadAvatar(selectedAvatar);
      }

      const { error } = await supabase
  .from('profiles')
  .upsert(
    {
      id: user.id,
      display_name: form.displayName.trim(),
      username: cleanUsername,
      bio: form.bio.trim(),
      country: form.country.trim(),
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  );

      if (error) {
        throw error;
      }

      Alert.alert('Profil enregistré', 'Tes modifications sont en ligne.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer le profil.';

      Alert.alert('Erreur', message);
    } finally {
      setSaving(false);
    }
  }

  const displayedAvatar = selectedAvatar || form.avatarUrl;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#62E6B1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backButton}>‹ Retour</Text>
            </Pressable>

            <Text style={styles.headerTitle}>Modifier le profil</Text>
          </View>

          <Pressable style={styles.avatarButton} onPress={selectAvatar}>
            {displayedAvatar ? (
              <Image
                source={{ uri: displayedAvatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarPlaceholder}>
                {form.displayName.charAt(0).toUpperCase() || '?'}
              </Text>
            )}

            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeText}>📷</Text>
            </View>
          </Pressable>

          <Text style={styles.changePhotoText}>Modifier la photo</Text>

          <Text style={styles.label}>Nom affiché</Text>

          <TextInput
            value={form.displayName}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                displayName: value,
              }))
            }
            placeholder="Ton nom"
            placeholderTextColor="#63766D"
            style={styles.input}
            maxLength={60}
          />

          <Text style={styles.label}>Nom d’utilisateur</Text>

          <View style={styles.usernameInput}>
            <Text style={styles.atSymbol}>@</Text>

            <TextInput
              value={form.username}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  username: value,
                }))
              }
              placeholder="aventurier"
              placeholderTextColor="#63766D"
              style={styles.usernameTextInput}
              autoCapitalize="none"
              maxLength={30}
            />
          </View>

          <Text style={styles.label}>Bio</Text>

          <TextInput
            value={form.bio}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                bio: value,
              }))
            }
            placeholder="Raconte les aventures qui t’inspirent."
            placeholderTextColor="#63766D"
            style={[styles.input, styles.bioInput]}
            multiline
            textAlignVertical="top"
            maxLength={240}
          />

          <Text style={styles.characterCount}>
            {form.bio.length}/240
          </Text>

          <Text style={styles.label}>Pays</Text>

          <TextInput
            value={form.country}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                country: value,
              }))
            }
            placeholder="Canada"
            placeholderTextColor="#63766D"
            style={styles.input}
            maxLength={60}
          />

          <Pressable
            onPress={saveProfile}
            disabled={saving}
            style={[
              styles.saveButton,
              saving && styles.disabledButton,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#071310" />
            ) : (
              <Text style={styles.saveButtonText}>
                Enregistrer le profil
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#071310',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 70,
  },

  header: {
    minHeight: 46,
    justifyContent: 'center',
    marginBottom: 24,
  },

  backButton: {
    color: '#62E6B1',
    fontSize: 15,
    fontWeight: '800',
  },

  headerTitle: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#F3FFF9',
    fontSize: 18,
    fontWeight: '900',
  },

  avatarButton: {
    width: 112,
    height: 112,
    alignSelf: 'center',
    borderRadius: 56,
    borderWidth: 2,
    borderColor: '#62E6B1',
    backgroundColor: '#174B3B',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 54,
  },

  avatarPlaceholder: {
    flex: 1,
    color: '#F3FFF9',
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
  },

  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#62E6B1',
    borderWidth: 3,
    borderColor: '#071310',
  },

  cameraBadgeText: {
    fontSize: 15,
  },

  changePhotoText: {
    color: '#62E6B1',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },

  label: {
    color: '#DFFFF2',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 8,
  },

  input: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#0C1C17',
    color: '#F3FFF9',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  usernameInput: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1D4538',
    backgroundColor: '#0C1C17',
    paddingHorizontal: 16,
  },

  atSymbol: {
    color: '#62E6B1',
    fontSize: 16,
    fontWeight: '900',
    marginRight: 3,
  },

  usernameTextInput: {
    flex: 1,
    color: '#F3FFF9',
    fontSize: 15,
  },

  bioInput: {
    minHeight: 130,
  },

  characterCount: {
    color: '#63766D',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 5,
  },

  saveButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#62E6B1',
    marginTop: 30,
  },

  saveButtonText: {
    color: '#071310',
    fontSize: 16,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.65,
  },
});