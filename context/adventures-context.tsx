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

export type Adventure = {
  id: string;
  ownerId: string;
  user: string;
  handle: string;
  title: string;
  location: string;
  startLocation: string;
  destination: string;
  day: string;
  distance: string;
  detail: string;
  description: string;
  emoji: string;
  category: string;
  images: string[];
  latitude: number | null;
  longitude: number | null;
  status: string;
  publicationStatus: 'draft' | 'published';
  createdAt: string | null;
};

export type NewAdventure = {
  title: string;
  description: string;
  startLocation: string;
  destination: string;
  category: string;
  images: string[];
  latitude?: number | null;
  longitude?: number | null;
  publicationStatus?: 'draft' | 'published';
};

type AdventuresContextValue = {
  adventures: Adventure[];
  loading: boolean;
  addAdventure: (
    adventure: NewAdventure
  ) => Promise<boolean>;
  refreshAdventures: () => Promise<void>;
};

type AdventureRow = {
  id: string;
  owner_id: string;
  title: string | null;
  description: string | null;
  start_location: string | null;
  destination: string | null;
  category: string | null;
  status: string | null;
  publication_status: 'draft' | 'published' | null;
  created_at: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

type AdventureImageRow = {
  adventure_id: string;
  image_url: string;
  position: number | null;
};

const STORAGE_BUCKET = 'adventure-images';

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

async function uploadAdventureImage({
  localUri,
  userId,
  adventureId,
  position,
}: {
  localUri: string;
  userId: string;
  adventureId: string;
  position: number;
}) {
  if (
    localUri.startsWith('https://') ||
    localUri.startsWith('http://')
  ) {
    return { publicUrl: localUri, storagePath: null };
  }

  const extension = getFileExtension(localUri);
  const contentType = getContentType(extension);
  const fileName = `${Date.now()}-${position}.${extension}`;
  const storagePath = `${userId}/${adventureId}/${fileName}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

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
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    throw new Error(
      'Impossible de générer l’adresse publique de la photo.'
    );
  }

  return { publicUrl: data.publicUrl, storagePath };
}

const AdventuresContext = createContext<
  AdventuresContextValue | undefined
>(undefined);

function getCategoryEmoji(category: string) {
  const emojis: Record<string, string> = {
    Vélo: '🚲',
    'Road trip': '🚐',
    'À pied': '🥾',
    Camping: '⛺',
    Urbain: '🏙️',
    Défi: '🔥',
    Autre: '🧭',
  };

  return emojis[category] ?? '🧭';
}

function formatAdventureDate(createdAt: string | null) {
  if (!createdAt) {
    return 'Nouvelle aventure';
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return 'Nouvelle aventure';
  }

  return date.toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getAdventureLocation(
  destination: string | null,
  startLocation: string | null
) {
  return (
    destination?.trim() ||
    startLocation?.trim() ||
    'Destination à venir'
  );
}

export function AdventuresProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const [adventures, setAdventures] = useState<Adventure[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const refreshAdventures = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: adventureRows,
        error: adventuresError,
      } = await supabase
        .from('adventures')
        .select(`
          id,
          owner_id,
          title,
          description,
          start_location,
          destination,
          category,
          status,
          publication_status,
          created_at,
          latitude,
          longitude
        `)
        .order('created_at', {
          ascending: false,
        });

      if (adventuresError) {
        console.error(
          'Erreur de chargement des aventures :',
          adventuresError.message
        );

        setAdventures([]);
        return;
      }

      const rows =
        (adventureRows ?? []) as AdventureRow[];

      if (rows.length === 0) {
        setAdventures([]);
        return;
      }

      const ownerIds = [
        ...new Set(
          rows
            .map((adventure) => adventure.owner_id)
            .filter(Boolean)
        ),
      ];

      const adventureIds = rows.map(
        (adventure) => adventure.id
      );

      const [
        profileResult,
        imageResult,
      ] = await Promise.all([
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

        adventureIds.length > 0
          ? supabase
              .from('adventure_images')
              .select(
                'adventure_id, image_url, position'
              )
              .in('adventure_id', adventureIds)
              .order('position', {
                ascending: true,
              })
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

      if (profileResult.error) {
        console.error(
          'Erreur de chargement des profils :',
          profileResult.error.message
        );
      }

      if (imageResult.error) {
        console.error(
          'Erreur de chargement des images :',
          imageResult.error.message
        );
      }

      const profiles =
        (profileResult.data ?? []) as ProfileRow[];

      const images =
        (imageResult.data ??
          []) as AdventureImageRow[];

      const formattedAdventures: Adventure[] =
        rows.map((adventure) => {
          const profile = profiles.find(
            (item) =>
              item.id === adventure.owner_id
          );

          const adventureImages = images
            .filter(
              (image) =>
                image.adventure_id === adventure.id
            )
            .sort(
              (a, b) =>
                (a.position ?? 0) -
                (b.position ?? 0)
            )
            .map((image) => image.image_url)
            .filter(Boolean);

          const category =
            adventure.category?.trim() || 'Autre';

          const startLocation =
            adventure.start_location?.trim() || '';

          const destination =
            adventure.destination?.trim() || '';

          return {
            id: adventure.id,
            ownerId: adventure.owner_id,
            user:
              profile?.display_name?.trim() ||
              'Aventurier Fragmenta',
            handle: profile?.username?.trim()
              ? `@${profile.username.trim()}`
              : '@fragmenta',
            title:
              adventure.title?.trim() ||
              'Aventure sans titre',
            location: getAdventureLocation(
              adventure.destination,
              adventure.start_location
            ),
            startLocation,
            destination,
            day: formatAdventureDate(
              adventure.created_at
            ),
            distance: '0 km',
            detail: category,
            description:
              adventure.description?.trim() ||
              'Aucune description.',
            emoji: getCategoryEmoji(category),
            category,
            images: adventureImages,
            latitude:
              typeof adventure.latitude === 'number'
                ? adventure.latitude
                : null,
            longitude:
              typeof adventure.longitude === 'number'
                ? adventure.longitude
                : null,
            status:
              adventure.status?.trim() || 'active',
            publicationStatus:
              adventure.publication_status === 'draft'
                ? 'draft'
                : 'published',
            createdAt: adventure.created_at,
          };
        });

      setAdventures(formattedAdventures);
    } catch (error) {
      console.error(
        'Erreur inattendue pendant le chargement :',
        error
      );

      setAdventures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAdventures();
  }, [refreshAdventures]);

  const addAdventure = useCallback(
    async (
      newAdventure: NewAdventure
    ): Promise<boolean> => {
      if (!user) {
        console.error(
          'Impossible de créer une aventure sans utilisateur connecté.'
        );

        return false;
      }

      const title = newAdventure.title.trim();
      const description =
        newAdventure.description.trim();
      const startLocation =
        newAdventure.startLocation.trim();
      const destination =
        newAdventure.destination.trim();
      const category =
        newAdventure.category.trim() || 'Autre';

      if (!title || !description) {
        return false;
      }

      let createdAdventureId: string | null = null;
      const uploadedStoragePaths: string[] = [];

      try {
        const {
          data: createdAdventure,
          error: insertError,
        } = await supabase
          .from('adventures')
          .insert({
            owner_id: user.id,
            title,
            description,
            start_location:
              startLocation || null,
            destination:
              destination || null,
            category,
            status: 'active',
            publication_status:
              newAdventure.publicationStatus || 'published',
            latitude:
              typeof newAdventure.latitude ===
              'number'
                ? newAdventure.latitude
                : null,
            longitude:
              typeof newAdventure.longitude ===
              'number'
                ? newAdventure.longitude
                : null,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(
            'Erreur de création de l’aventure :',
            insertError.message
          );

          return false;
        }

        createdAdventureId = createdAdventure?.id ?? null;

        if (!createdAdventureId) {
          console.error(
            'Aucun identifiant reçu après la création.'
          );

          return false;
        }

        const validImages =
          newAdventure.images.filter(
            (imageUrl) =>
              typeof imageUrl === 'string' &&
              imageUrl.trim().length > 0
          );

        if (validImages.length > 0) {
          const uploadedImages: {
            publicUrl: string;
            storagePath: string;
          }[] = [];

          for (
            let index = 0;
            index < validImages.length;
            index += 1
          ) {
            const { publicUrl, storagePath } =
              await uploadAdventureImage({
                localUri: validImages[index],
                userId: user.id,
                adventureId: createdAdventureId,
                position: index,
              });

            if (!storagePath) {
              throw new Error(
                'Le chemin Storage de la photo est absent.'
              );
            }

            uploadedImages.push({
              publicUrl,
              storagePath,
            });

            uploadedStoragePaths.push(storagePath);
          }

          const imageRows = uploadedImages.map(
            (image, index) => ({
              adventure_id: createdAdventureId,
              owner_id: user.id,
              image_url: image.publicUrl,
              storage_path: image.storagePath,
              position: index,
            })
          );

          const {
            error: imagesInsertError,
          } = await supabase
            .from('adventure_images')
            .insert(imageRows);

          if (imagesInsertError) {
            throw new Error(imagesInsertError.message);
          }
        }

        await refreshAdventures();

        return true;
      } catch (error) {
        console.error(
          'Erreur inattendue pendant la création :',
          error
        );

        if (uploadedStoragePaths.length > 0) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove(uploadedStoragePaths);
        }

        if (createdAdventureId) {
          await supabase
            .from('adventures')
            .delete()
            .eq('id', createdAdventureId);
        }

        return false;
      }
    },
    [refreshAdventures, user]
  );

  const value = useMemo(
    () => ({
      adventures,
      loading,
      addAdventure,
      refreshAdventures,
    }),
    [
      adventures,
      loading,
      addAdventure,
      refreshAdventures,
    ]
  );

  return (
    <AdventuresContext.Provider value={value}>
      {children}
    </AdventuresContext.Provider>
  );
}

export function useAdventures() {
  const context = useContext(AdventuresContext);

  if (!context) {
    throw new Error(
      'useAdventures doit être utilisé dans AdventuresProvider.'
    );
  }

  return context;
}
