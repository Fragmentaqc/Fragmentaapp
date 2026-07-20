import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export type Curiosity = {
  id: string;
  ownerId: string;
  adventureId: string | null;
  title: string;
  description: string;
  category: string;
  locationName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  accessibility: string;
  bestTimeToVisit: string;
  recommendedDuration: string;
  status: string;
  verificationStatus: string;
  createdAt: string | null;
  images: string[];
  authorName: string;
  authorHandle: string;
};

export type NewCuriosity = {
  adventureId?: string | null;
  title: string;
  description: string;
  category: string;
  locationName: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  accessibility: string;
  bestTimeToVisit: string;
  recommendedDuration: string;
  images: string[];
  status?: 'draft' | 'published';
};

export type CuriosityUpdate = Omit<NewCuriosity, 'images'>;

type CuriositiesContextValue = {
  curiosities: Curiosity[];
  loading: boolean;
  uploading: boolean;
  addCuriosity: (
    curiosity: NewCuriosity
  ) => Promise<boolean>;
  deleteCuriosity: (curiosityId: string) => Promise<boolean>;
  updateCuriosity: (curiosityId: string, update: CuriosityUpdate) => Promise<boolean>;
  refreshCuriosities: () => Promise<void>;
};

type CuriosityRow = {
  id: string;
  owner_id: string;
  adventure_id: string | null;
  title: string;
  description: string;
  category: string;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  accessibility: string | null;
  best_time_to_visit: string | null;
  recommended_duration: string | null;
  status: string;
  verification_status: string;
  created_at: string | null;
};

type CuriosityImageRow = {
  curiosity_id: string;
  image_url: string;
  position: number | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

const STORAGE_BUCKET = 'curiosity-images';

const CuriositiesContext = createContext<
  CuriositiesContextValue | undefined
>(undefined);

function getFileExtension(uri: string) {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.split('.').pop()?.toLowerCase();

  if (
    extension === 'jpg' ||
    extension === 'jpeg' ||
    extension === 'png' ||
    extension === 'webp' ||
    extension === 'heic'
  ) {
    return extension;
  }

  return 'jpg';
}

function getContentType(extension: string) {
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
  };

  return contentTypes[extension] ?? 'image/jpeg';
}

async function uploadCuriosityImage({
  localUri,
  userId,
  curiosityId,
  position,
}: {
  localUri: string;
  userId: string;
  curiosityId: string;
  position: number;
}) {
  if (
    localUri.startsWith('https://') ||
    localUri.startsWith('http://')
  ) {
    return localUri;
  }

  const extension = getFileExtension(localUri);
  const contentType = getContentType(extension);

  const fileName = `${Date.now()}-${position}.${extension}`;
  const storagePath =
    `${userId}/${curiosityId}/${fileName}`;

  const base64 = await FileSystem.readAsStringAsync(
    localUri,
    {
      encoding: FileSystem.EncodingType.Base64,
    }
  );

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, decode(base64), {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Téléversement impossible : ${uploadError.message}`
    );
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  if (!data.publicUrl) {
    throw new Error(
      'Impossible de générer l’adresse publique de la photo.'
    );
  }

  return data.publicUrl;
}

export function CuriositiesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const [curiosities, setCuriosities] = useState<
    Curiosity[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const refreshCuriosities = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: curiosityRows,
        error: curiositiesError,
      } = await supabase
        .from('curiosities')
        .select(`
          id,
          owner_id,
          adventure_id,
          title,
          description,
          category,
          location_name,
          address,
          latitude,
          longitude,
          accessibility,
          best_time_to_visit,
          recommended_duration,
          status,
          verification_status,
          created_at
        `)
        .order('created_at', {
          ascending: false,
        });

      if (curiositiesError) {
        console.error(
          'Erreur de chargement des curiosités :',
          curiositiesError.message
        );

        setCuriosities([]);
        return;
      }

      const rows =
        (curiosityRows ?? []) as CuriosityRow[];

      if (rows.length === 0) {
        setCuriosities([]);
        return;
      }

      const curiosityIds = rows.map(
        (curiosity) => curiosity.id
      );

      const ownerIds = [
        ...new Set(
          rows
            .map((curiosity) => curiosity.owner_id)
            .filter(Boolean)
        ),
      ];

      const [imagesResult, profilesResult] =
        await Promise.all([
          supabase
            .from('curiosity_images')
            .select(
              'curiosity_id, image_url, position'
            )
            .in('curiosity_id', curiosityIds)
            .order('position', {
              ascending: true,
            }),

          ownerIds.length > 0
            ? supabase
                .from('profiles')
                .select(
                  'id, display_name, username'
                )
                .in('id', ownerIds)
            : Promise.resolve({
                data: [],
                error: null,
              }),
        ]);

      if (imagesResult.error) {
        console.error(
          'Erreur de chargement des images :',
          imagesResult.error.message
        );
      }

      if (profilesResult.error) {
        console.error(
          'Erreur de chargement des auteurs :',
          profilesResult.error.message
        );
      }

      const images =
        (imagesResult.data ??
          []) as CuriosityImageRow[];

      const profiles =
        (profilesResult.data ?? []) as ProfileRow[];

      const formattedCuriosities: Curiosity[] =
        rows.map((curiosity) => {
          const profile = profiles.find(
            (item) =>
              item.id === curiosity.owner_id
          );

          const curiosityImages = images
            .filter(
              (image) =>
                image.curiosity_id === curiosity.id
            )
            .sort(
              (a, b) =>
                (a.position ?? 0) -
                (b.position ?? 0)
            )
            .map((image) => image.image_url)
            .filter(Boolean);

          return {
            id: curiosity.id,
            ownerId: curiosity.owner_id,
            adventureId: curiosity.adventure_id,
            title:
              curiosity.title?.trim() ||
              'Curiosité sans titre',
            description:
              curiosity.description?.trim() ||
              'Aucune description.',
            category:
              curiosity.category?.trim() ||
              'Lieu insolite',
            locationName:
              curiosity.location_name?.trim() || '',
            address:
              curiosity.address?.trim() || '',
            latitude:
              typeof curiosity.latitude === 'number'
                ? curiosity.latitude
                : null,
            longitude:
              typeof curiosity.longitude === 'number'
                ? curiosity.longitude
                : null,
            accessibility:
              curiosity.accessibility?.trim() || '',
            bestTimeToVisit:
              curiosity.best_time_to_visit?.trim() ||
              '',
            recommendedDuration:
              curiosity.recommended_duration?.trim() ||
              '',
            status:
              curiosity.status?.trim() ||
              'published',
            verificationStatus:
              curiosity.verification_status?.trim() ||
              'unverified',
            createdAt: curiosity.created_at,
            images: curiosityImages,
            authorName:
              profile?.display_name?.trim() ||
              'Explorateur Fragmenta',
            authorHandle:
              profile?.username?.trim()
                ? `@${profile.username.trim()}`
                : '@fragmenta',
          };
        });

      setCuriosities(formattedCuriosities);
    } catch (error) {
      console.error(
        'Erreur inattendue pendant le chargement :',
        error
      );

      setCuriosities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCuriosities();
  }, [refreshCuriosities]);

  const addCuriosity = useCallback(
    async (
      newCuriosity: NewCuriosity
    ): Promise<boolean> => {
      if (!user) {
        console.error(
          'Utilisateur non connecté.'
        );

        return false;
      }

      const title = newCuriosity.title.trim();
      const description =
        newCuriosity.description.trim();

      if (!title || !description) {
        return false;
      }

      setUploading(true);

      let createdCuriosityId: string | null = null;

      try {
        const {
          data: createdCuriosity,
          error: insertError,
        } = await supabase
          .from('curiosities')
          .insert({
            owner_id: user.id,
            adventure_id:
              newCuriosity.adventureId || null,
            title,
            description,
            category:
              newCuriosity.category.trim() ||
              'Lieu insolite',
            location_name:
              newCuriosity.locationName.trim() ||
              null,
            address:
              newCuriosity.address.trim() || null,
            latitude:
              typeof newCuriosity.latitude ===
              'number'
                ? newCuriosity.latitude
                : null,
            longitude:
              typeof newCuriosity.longitude ===
              'number'
                ? newCuriosity.longitude
                : null,
            accessibility:
              newCuriosity.accessibility.trim() ||
              null,
            best_time_to_visit:
              newCuriosity.bestTimeToVisit.trim() ||
              null,
            recommended_duration:
              newCuriosity.recommendedDuration.trim() ||
              null,
            status:
              newCuriosity.status || 'published',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(
            'Erreur de création :',
            insertError.message
          );

          return false;
        }

        createdCuriosityId =
          createdCuriosity?.id ?? null;

        if (!createdCuriosityId) {
          return false;
        }

        const validImages =
          newCuriosity.images.filter(
            (uri) =>
              typeof uri === 'string' &&
              uri.trim().length > 0
          );

        const uploadedUrls: string[] = [];

        for (
          let index = 0;
          index < validImages.length;
          index += 1
        ) {
          const publicUrl =
            await uploadCuriosityImage({
              localUri: validImages[index],
              userId: user.id,
              curiosityId: createdCuriosityId,
              position: index,
            });

          uploadedUrls.push(publicUrl);
        }

        if (uploadedUrls.length > 0) {
          const imageRows = uploadedUrls.map(
            (imageUrl, index) => ({
              curiosity_id: createdCuriosityId,
              image_url: imageUrl,
              position: index,
            })
          );

          const { error: imagesInsertError } =
            await supabase
              .from('curiosity_images')
              .insert(imageRows);

          if (imagesInsertError) {
            throw new Error(
              imagesInsertError.message
            );
          }
        }

        await refreshCuriosities();

        return true;
      } catch (error) {
        console.error(
          'Erreur pendant la publication :',
          error
        );

        if (createdCuriosityId) {
          await supabase
            .from('curiosities')
            .delete()
            .eq('id', createdCuriosityId);
        }

        return false;
      } finally {
        setUploading(false);
      }
    },
    [refreshCuriosities, user]
  );

  const updateCuriosity = useCallback(async (
    curiosityId: string,
    update: CuriosityUpdate
  ) => {
    if (!user || !update.title.trim() || !update.description.trim()) return false;
    const { error } = await supabase
      .from('curiosities')
      .update({
        adventure_id: update.adventureId || null,
        title: update.title.trim(),
        description: update.description.trim(),
        category: update.category.trim() || 'Autre',
        location_name: update.locationName.trim() || null,
        address: update.address.trim() || null,
        accessibility: update.accessibility.trim() || null,
        best_time_to_visit: update.bestTimeToVisit.trim() || null,
        recommended_duration: update.recommendedDuration.trim() || null,
        status: update.status || 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', curiosityId)
      .eq('owner_id', user.id);
    if (error) {
      console.error('Erreur de modification de la curiosité :', error.message);
      return false;
    }
    await refreshCuriosities();
    return true;
  }, [refreshCuriosities, user]);

  const deleteCuriosity = useCallback(async (curiosityId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('curiosities')
      .delete()
      .eq('id', curiosityId)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Erreur de suppression de la curiosité :', error.message);
      return false;
    }

    const folder = `${user.id}/${curiosityId}`;
    const { data: files } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folder);
    if (files && files.length > 0) {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(files.map((file) => `${folder}/${file.name}`));
    }

    await refreshCuriosities();
    return true;
  }, [refreshCuriosities, user]);

  const value = useMemo(
    () => ({
      curiosities,
      loading,
      uploading,
      addCuriosity,
      deleteCuriosity,
      updateCuriosity,
      refreshCuriosities,
    }),
    [
      curiosities,
      loading,
      uploading,
      addCuriosity,
      deleteCuriosity,
      updateCuriosity,
      refreshCuriosities,
    ]
  );

  return (
    <CuriositiesContext.Provider value={value}>
      {children}
    </CuriositiesContext.Provider>
  );
}

export function useCuriosities() {
  const context = useContext(CuriositiesContext);

  if (!context) {
    throw new Error(
      'useCuriosities doit être utilisé dans CuriositiesProvider.'
    );
  }

  return context;
}
