import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type FollowCounts = { followers: number; following: number };
type FollowsContextValue = { followingIds: string[]; loading: boolean; refresh: () => Promise<void>; toggleFollow: (profileId: string) => Promise<boolean>; getCounts: (profileId: string) => Promise<FollowCounts> };
const FollowsContext = createContext<FollowsContextValue | null>(null);

export function FollowsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!user) { setFollowingIds([]); return; }
    setLoading(true);
    const { data, error } = await supabase.from('profile_follows').select('followed_id').eq('follower_id', user.id);
    if (!error) setFollowingIds((data ?? []).map((row) => row.followed_id));
    else console.error('Erreur de chargement des abonnements :', error.message);
    setLoading(false);
  }, [user]);
  useEffect(() => { void refresh(); }, [refresh]);
  const toggleFollow = useCallback(async (profileId: string) => {
    if (!user || profileId === user.id) return false;
    const isFollowing = followingIds.includes(profileId);
    setFollowingIds((current) => isFollowing ? current.filter((id) => id !== profileId) : [...current, profileId]);
    const result = isFollowing
      ? await supabase.from('profile_follows').delete().eq('follower_id', user.id).eq('followed_id', profileId)
      : await supabase.from('profile_follows').insert({ follower_id: user.id, followed_id: profileId });
    if (result.error) {
      setFollowingIds((current) => isFollowing ? [...current, profileId] : current.filter((id) => id !== profileId));
      return false;
    }
    return true;
  }, [followingIds, user]);
  const getCounts = useCallback(async (profileId: string) => {
    const [a, b] = await Promise.all([
      supabase.from('profile_follows').select('*', { count: 'exact', head: true }).eq('followed_id', profileId),
      supabase.from('profile_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
    ]);
    return { followers: a.count ?? 0, following: b.count ?? 0 };
  }, []);
  const value = useMemo(() => ({ followingIds, loading, refresh, toggleFollow, getCounts }), [followingIds, loading, refresh, toggleFollow, getCounts]);
  return <FollowsContext.Provider value={value}>{children}</FollowsContext.Provider>;
}

export function useFollows() {
  const value = useContext(FollowsContext);
  if (!value) throw new Error('useFollows doit être utilisé dans FollowsProvider');
  return value;
}
