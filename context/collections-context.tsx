import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Collection = {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  adventureIds: string[];
  curiosityIds: string[];
  createdAt: string;
};

type CollectionRow = { id: string; name: string; description: string | null; is_public: boolean; created_at: string };
type CollectionItemRow = { collection_id: string; adventure_id: string | null; curiosity_id: string | null };

type CollectionsContextValue = {
  collections: Collection[];
  loading: boolean;
  createCollection: (name: string, description?: string) => Promise<string | null>;
  deleteCollection: (collectionId: string) => Promise<boolean>;
  toggleItem: (collectionId: string, target: { type: 'adventure' | 'curiosity'; id: string }) => Promise<boolean>;
  refreshCollections: () => Promise<void>;
};

const CollectionsContext = createContext<CollectionsContextValue | undefined>(undefined);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCollections = useCallback(async () => {
    if (!user) {
      setCollections([]);
      return;
    }
    setLoading(true);
    const collectionResult = await supabase.from('collections').select('id, name, description, is_public, created_at').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (collectionResult.error) {
      console.error('Erreur de chargement des collections :', collectionResult.error.message);
      setLoading(false);
      return;
    }
    const rows = (collectionResult.data ?? []) as CollectionRow[];
    const ids = rows.map((row) => row.id);
    const itemResult = ids.length
      ? await supabase.from('collection_items').select('collection_id, adventure_id, curiosity_id').in('collection_id', ids)
      : { data: [], error: null };
    if (itemResult.error) console.error('Erreur de chargement des éléments de collection :', itemResult.error.message);
    const items = (itemResult.data ?? []) as CollectionItemRow[];
    setCollections(rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      isPublic: row.is_public,
      adventureIds: items.filter((item) => item.collection_id === row.id && item.adventure_id).map((item) => item.adventure_id as string),
      curiosityIds: items.filter((item) => item.collection_id === row.id && item.curiosity_id).map((item) => item.curiosity_id as string),
      createdAt: row.created_at,
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { void refreshCollections(); }, [refreshCollections]);

  const createCollection = useCallback(async (name: string, description = '') => {
    const cleanName = name.trim();
    if (!user || !cleanName) return null;
    const { data, error } = await supabase.from('collections').insert({ owner_id: user.id, name: cleanName, description: description.trim() || null }).select('id').single();
    if (error || !data) return null;
    await refreshCollections();
    return data.id as string;
  }, [refreshCollections, user]);

  const deleteCollection = useCallback(async (collectionId: string) => {
    if (!user) return false;
    const { error } = await supabase.from('collections').delete().eq('id', collectionId).eq('owner_id', user.id);
    if (error) return false;
    setCollections((current) => current.filter((collection) => collection.id !== collectionId));
    return true;
  }, [user]);

  const toggleItem = useCallback(async (collectionId: string, target: { type: 'adventure' | 'curiosity'; id: string }) => {
    if (!user) return false;
    const collection = collections.find((item) => item.id === collectionId);
    const column = target.type === 'adventure' ? 'adventure_id' : 'curiosity_id';
    const selected = target.type === 'adventure' ? collection?.adventureIds.includes(target.id) : collection?.curiosityIds.includes(target.id);
    if (selected) {
      const { error } = await supabase.from('collection_items').delete().eq('collection_id', collectionId).eq(column, target.id);
      if (error) return false;
    } else {
      const { error } = await supabase.from('collection_items').insert({ collection_id: collectionId, [column]: target.id });
      if (error) return false;
    }
    await refreshCollections();
    return true;
  }, [collections, refreshCollections, user]);

  const value = useMemo(() => ({ collections, loading, createCollection, deleteCollection, toggleItem, refreshCollections }), [collections, loading, createCollection, deleteCollection, toggleItem, refreshCollections]);
  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
}

export function useCollections() {
  const context = useContext(CollectionsContext);
  if (!context) throw new Error('useCollections doit être utilisé dans CollectionsProvider.');
  return context;
}
