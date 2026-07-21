import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { SOCIAL_PLATFORMS, normalizeSocialUrl, parseSocialLinks, type SocialLink } from '@/lib/social-links';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
  coverUrl: string | null;
  socialLinks: SocialLink[];
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
    coverUrl: null,
    socialLinks: [],
  });

  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, username, bio, country, avatar_url, cover_url, social_links')
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
    coverUrl: data.cover_url ?? null,
    socialLinks: parseSocialLinks(data.social_links),
  });
}

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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

  async function selectCover() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorise Fragmenta à accéder à tes photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setSelectedCover(result.assets[0].uri);
  }
  async function uploadProfileImage(uri: string, kind: 'avatar' | 'cover'): Promise<string> {
    if (!user) {
      throw new Error('Utilisateur non connecté.');
    }

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const extension =
      uri.split('.').pop()?.toLowerCase().split('?')[0] || 'jpg';

    const filePath = `${user.id}/${kind}-${Date.now()}.${extension}`;

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
      let coverUrl = form.coverUrl;

      if (selectedAvatar) {
        avatarUrl = await uploadProfileImage(selectedAvatar, 'avatar');
      }
      if (selectedCover) coverUrl = await uploadProfileImage(selectedCover, 'cover');

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
      cover_url: coverUrl,
      social_links: form.socialLinks
        .map((link) => ({
          platform: link.platform.trim() || 'Autre',
          url: normalizeSocialUrl(link.url),
        }))
        .filter((link) => link.url),
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
  const displayedCover = selectedCover || form.coverUrl;

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

          <View style={styles.socialHeader}>
            <View>
              <Text style={styles.label}>Réseaux sociaux</Text>
              <Text style={styles.socialHint}>Ajoute un lien complet ou un nom de domaine.</Text>
            </View>
            <Pressable
              style={styles.addSocialButton}
              onPress={() => setForm((current) => ({
                ...current,
                socialLinks: [...current.socialLinks, { platform: 'Instagram', url: '' }],
              }))}
            >
              <Text style={styles.addSocialText}>+ Ajouter</Text>
            </Pressable>
          </View>

          <Pressable style={styles.coverButton} onPress={selectCover}>
            {displayedCover ? <Image source={{ uri: displayedCover }} style={styles.coverImage} /> : <View style={styles.coverPlaceholder}><Text style={styles.coverPlaceholderIcon}>⌁</Text><Text style={styles.coverPlaceholderText}>Ajouter une image de couverture</Text></View>}
            <View style={styles.coverCameraBadge}><Text style={styles.coverCameraText}>📷 Modifier la couverture</Text></View>
          </Pressable>

          {form.socialLinks.map((link, index) => (
            <View key={`${index}-${link.platform}`} style={styles.socialEditor}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.platforms}>
                {SOCIAL_PLATFORMS.map((platform) => (
                  <Pressable
                    key={platform}
                    style={[styles.platformChip, link.platform === platform && styles.platformChipActive]}
                    onPress={() => setForm((current) => ({
                      ...current,
                      socialLinks: current.socialLinks.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, platform } : item
                      ),
                    }))}
                  >
                    <Text style={styles.platformChipText}>{platform}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                value={link.platform}
                onChangeText={(platform) => setForm((current) => ({
                  ...current,
                  socialLinks: current.socialLinks.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, platform } : item
                  ),
                }))}
                placeholder="Nom du réseau"
                placeholderTextColor="#63766D"
                maxLength={40}
                style={[styles.input, styles.platformInput]}
              />
              <View style={styles.socialUrlRow}>
                <TextInput
                  value={link.url}
                  onChangeText={(url) => setForm((current) => ({
                    ...current,
                    socialLinks: current.socialLinks.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, url } : item
                    ),
                  }))}
                  placeholder="instagram.com/tonprofil"
                  placeholderTextColor="#63766D"
                  autoCapitalize="none"
                  keyboardType="url"
                  maxLength={300}
                  style={[styles.input, styles.socialUrlInput]}
                />
                <Pressable
                  style={styles.removeSocialButton}
                  onPress={() => setForm((current) => ({
                    ...current,
                    socialLinks: current.socialLinks.filter((_, itemIndex) => itemIndex !== index),
                  }))}
                >
                  <Text style={styles.removeSocialText}>×</Text>
                </Pressable>
              </View>
            </View>
          ))}

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
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#62E6B1',
    backgroundColor: '#174B3B',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
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
    borderRadius: 0,
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
    borderRadius: 0,
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
    borderRadius: 0,
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

  coverButton: { height: 190, overflow: 'hidden', borderRadius: 0, borderWidth: 1, borderColor: '#285345', backgroundColor: '#10251E', marginBottom: -48 },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderIcon: { color: '#62E6B1', fontSize: 34 },
  coverPlaceholderText: { color: '#8FA69B', fontSize: 12, fontWeight: '800', marginTop: 6 },
  coverCameraBadge: { position: 'absolute', right: 10, top: 10, borderRadius: 0, backgroundColor: 'rgba(7,19,16,0.88)', paddingHorizontal: 12, paddingVertical: 8 },
  coverCameraText: { color: '#E4FFF4', fontSize: 10, fontWeight: '900' },
  socialHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  socialHint: { color: '#63766D', fontSize: 11, marginTop: -4 },
  addSocialButton: { borderRadius: 0, backgroundColor: '#173D31', paddingHorizontal: 13, paddingVertical: 10 },
  addSocialText: { color: '#62E6B1', fontSize: 12, fontWeight: '900' },
  socialEditor: { borderRadius: 0, borderWidth: 1, borderColor: '#1D4538', backgroundColor: '#0C1C17', padding: 10, marginTop: 10 },
  platforms: { marginBottom: 9 },
  platformInput: { minHeight: 46, marginBottom: 8 },
  platformChip: { borderRadius: 0, backgroundColor: '#10251E', paddingHorizontal: 11, paddingVertical: 8, marginRight: 7 },
  platformChipActive: { backgroundColor: '#28634F' },
  platformChipText: { color: '#DFFFF2', fontSize: 11, fontWeight: '800' },
  socialUrlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialUrlInput: { flex: 1, minHeight: 48 },
  removeSocialButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#351919' },
  removeSocialText: { color: '#FFB8B8', fontSize: 24, fontWeight: '700' },

  saveButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
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
