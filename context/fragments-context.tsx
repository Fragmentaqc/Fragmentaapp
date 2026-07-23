import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { resolvePrivateImageUrls } from '@/lib/storage-urls';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { readOfflineCache, writeOfflineCache } from '@/lib/offline-cache';
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

export type Fragment = {
  id: string;
  adventureId: string;
  ownerId: string;
  title: string;
  body: string;
  occurredAt: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'draft' | 'published';
  images: string[];
};

type NewFragment = {
  adventureId: string;
  title: string;
  body: string;
  occurredAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: 'draft' | 'published';
  images: string[];
};

export type FragmentUpdate = Pick<NewFragment, 'title' | 'body' | 'occurredAt' | 'latitude' | 'longitude' | 'status'>;

type FragmentsContextValue = {
  fragmentsByAdventure: Record<string, Fragment[]>;
  loadingAdventureId: string | null;
  isOffline: boolean;
  loadFragments: (adventureId: string) => Promise<void>;
  refreshLoadedFragments: () => Promise<void>;
  addFragment: (fragment: NewFragment) => Promise<boolean>;
  updateFragment: (fragmentId: string, adventureId: string, update: FragmentUpdate) => Promise<boolean>;
  deleteFragment: (fragmentId: string, adventureId: string) => Promise<boolean>;
};

const FragmentsContext = createContext<FragmentsContextValue | undefined>(undefined);
const STORAGE_BUCKET = 'fragment-images';

function fileDetails(uri: string) {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(extension ?? '')
    ? extension as string
    : 'jpg';
  const types: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
  };
  return { extension: safeExtension, contentType: types[safeExtension] };
}

export function FragmentsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [fragmentsByAdventure, setFragmentsByAdventure] = useState<Record<string, Fragment[]>>({});
  const [loadingAdventureId, setLoadingAdventureId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const loadFragments = useCallback(async (adventureId: string) => {
    setLoadingAdventureId(adventureId);
    try {
      const { data: rows, error } = await supabase
        .from('fragments')
        .select('id, adventure_id, owner_id, title, body, occurred_at, latitude, longitude, status, position, created_at')
        .eq('adventure_id', adventureId)
        .order('position', { ascending: true })
        .order('occurred_at', { ascending: true, nullsFirst: false });
      if (error) throw error;

      const ids = (rows ?? []).map((row) => row.id as string);
      const imageResult = ids.length
        ? await supabase.from('fragment_images').select('fragment_id, image_url, storage_path, position').in('fragment_id', ids).order('position')
        : { data: [], error: null };
      if (imageResult.error) throw imageResult.error;

      const resolvedImages = await resolvePrivateImageUrls('fragment-images', imageResult.data ?? []);
      const fragments: Fragment[] = (rows ?? []).map((row) => ({
        id: row.id,
        adventureId: row.adventure_id,
        ownerId: row.owner_id,
        title: row.title,
        body: row.body ?? '',
        occurredAt: row.occurred_at,
        latitude: row.latitude,
        longitude: row.longitude,
        status: row.status === 'draft' ? 'draft' : 'published',
        images: resolvedImages
          .filter((image) => image.fragment_id === row.id)
          .map((image) => image.image_url),
      }));
      setFragmentsByAdventure((current) => ({ ...current, [adventureId]: fragments }));
      setIsOffline(false);
      await writeOfflineCache(`fragments/${adventureId}`, fragments);
    } catch (error) {
      console.error('Erreur de chargement des fragments :', error);
      const cached = await readOfflineCache<Fragment[]>(`fragments/${adventureId}`);
      if (cached) setFragmentsByAdventure((current) => ({ ...current, [adventureId]: cached }));
      setIsOffline(true);
    } finally {
      setLoadingAdventureId(null);
    }
  }, []);

  const addFragment = useCallback(async (input: NewFragment) => {
    if (!user || !input.title.trim() || !input.body.trim()) return false;
    let fragmentId: string | null = null;
    const uploadedPaths: string[] = [];
    try {
      const current = fragmentsByAdventure[input.adventureId] ?? [];
      const { data, error } = await supabase.from('fragments').insert({
        adventure_id: input.adventureId,
        owner_id: user.id,
        title: input.title.trim(),
        body: input.body.trim(),
        occurred_at: input.occurredAt || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        position: current.length,
        status: input.status,
      }).select('id').single();
      if (error || !data?.id) throw error ?? new Error('Identifiant de fragment absent.');
      fragmentId = data.id;

      const imageRows = [];
      for (let index = 0; index < input.images.length; index += 1) {
        const { extension, contentType } = fileDetails(input.images[index]);
        const storagePath = `${user.id}/${fragmentId}/${Date.now()}-${index}.${extension}`;
        const base64 = await FileSystem.readAsStringAsync(input.images[index], { encoding: FileSystem.EncodingType.Base64 });
        const upload = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, decode(base64), { contentType, cacheControl: '3600' });
        if (upload.error) throw upload.error;
        uploadedPaths.push(storagePath);
        const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
        imageRows.push({ fragment_id: fragmentId, owner_id: user.id, image_url: publicData.publicUrl, storage_path: storagePath, position: index });
      }
      if (imageRows.length) {
        const insertImages = await supabase.from('fragment_images').insert(imageRows);
        if (insertImages.error) throw insertImages.error;
      }
      await loadFragments(input.adventureId);
      return true;
    } catch (error) {
      console.error('Erreur de création du fragment :', error);
      if (uploadedPaths.length) await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
      if (fragmentId) await supabase.from('fragments').delete().eq('id', fragmentId);
      return false;
    }
  }, [fragmentsByAdventure, loadFragments, user]);

  const updateFragment = useCallback(async (fragmentId: string, adventureId: string, update: FragmentUpdate) => {
    if (!user || !update.title.trim() || !update.body.trim()) return false;
    const { error } = await supabase.from('fragments').update({
      title: update.title.trim(),
      body: update.body.trim(),
      occurred_at: update.occurredAt || null,
      latitude: update.latitude ?? null,
      longitude: update.longitude ?? null,
      status: update.status,
      updated_at: new Date().toISOString(),
    }).eq('id', fragmentId).eq('owner_id', user.id);
    if (error) {
      console.error('Erreur de modification du fragment :', error.message);
      return false;
    }
    await loadFragments(adventureId);
    return true;
  }, [loadFragments, user]);

  const deleteFragment = useCallback(async (fragmentId: string, adventureId: string) => {
    if (!user) return false;
    const imageResult = await supabase.from('fragment_images').select('storage_path').eq('fragment_id', fragmentId).eq('owner_id', user.id);
    if (imageResult.error) return false;
    const paths = (imageResult.data ?? []).map((row) => row.storage_path as string).filter(Boolean);
    if (paths.length) {
      const storageResult = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
      if (storageResult.error) {
        console.error('Nettoyage incomplet des photos :', storageResult.error.message);
        return false;
      }
    }
    const { error } = await supabase.from('fragments').delete().eq('id', fragmentId).eq('owner_id', user.id);
    if (error) {
      console.error('Erreur de suppression du fragment :', error.message);
      return false;
    }
    await loadFragments(adventureId);
    return true;
  }, [loadFragments, user]);

  const refreshLoadedFragments = useCallback(async () => {
    const adventureIds = Object.keys(fragmentsByAdventure);
    await Promise.all(adventureIds.map((adventureId) => loadFragments(adventureId)));
    if (adventureIds.length === 0) setIsOffline(false);
  }, [fragmentsByAdventure, loadFragments]);

  const value = useMemo(() => ({ fragmentsByAdventure, loadingAdventureId, isOffline, loadFragments, refreshLoadedFragments, addFragment, updateFragment, deleteFragment }), [fragmentsByAdventure, loadingAdventureId, isOffline, loadFragments, refreshLoadedFragments, addFragment, updateFragment, deleteFragment]);
  return <FragmentsContext.Provider value={value}>{children}</FragmentsContext.Provider>;
}

export function useFragments() {
  const context = useContext(FragmentsContext);
  if (!context) throw new Error('useFragments doit être utilisé dans FragmentsProvider.');
  return context;
}
