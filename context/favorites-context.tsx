import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type FavoriteRow = { id: string; adventure_id: string | null; curiosity_id: string | null };
type FavoriteTarget = { type: 'adventure' | 'curiosity'; id: string };

type FavoritesContextValue = {
  adventureIds: string[];
  curiosityIds: string[];
  loading: boolean;
  isFavorite: (target: FavoriteTarget) => boolean;
  toggleFavorite: (target: FavoriteTarget) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshFavorites = useCallback(async () => {
    if (!user) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('favorites').select('id, adventure_id, curiosity_id').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (error) console.error('Erreur de chargement des favoris :', error.message);
    else setRows((data ?? []) as FavoriteRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refreshFavorites(); }, [refreshFavorites]);

  const isFavorite = useCallback((target: FavoriteTarget) => rows.some((row) => target.type === 'adventure' ? row.adventure_id === target.id : row.curiosity_id === target.id), [rows]);

  const toggleFavorite = useCallback(async (target: FavoriteTarget) => {
    if (!user) return false;
    const existing = rows.find((row) => target.type === 'adventure' ? row.adventure_id === target.id : row.curiosity_id === target.id);
    if (existing) {
      const { error } = await supabase.from('favorites').delete().eq('id', existing.id).eq('owner_id', user.id);
      if (error) return false;
      setRows((current) => current.filter((row) => row.id !== existing.id));
      return true;
    }
    const { data, error } = await supabase.from('favorites').insert({ owner_id: user.id, adventure_id: target.type === 'adventure' ? target.id : null, curiosity_id: target.type === 'curiosity' ? target.id : null }).select('id, adventure_id, curiosity_id').single();
    if (error || !data) return false;
    setRows((current) => [data as FavoriteRow, ...current]);
    return true;
  }, [rows, user]);

  const adventureIds = useMemo(() => rows.map((row) => row.adventure_id).filter((id): id is string => Boolean(id)), [rows]);
  const curiosityIds = useMemo(() => rows.map((row) => row.curiosity_id).filter((id): id is string => Boolean(id)), [rows]);
  const value = useMemo(() => ({ adventureIds, curiosityIds, loading, isFavorite, toggleFavorite, refreshFavorites }), [adventureIds, curiosityIds, loading, isFavorite, toggleFavorite, refreshFavorites]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites doit être utilisé dans FavoritesProvider.');
  return context;
}
