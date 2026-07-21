import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type BlocksContextValue = {
  blockedUserIds: string[];
  hiddenUserIds: string[];
  loading: boolean;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  refreshBlocks: () => Promise<void>;
};

const BlocksContext = createContext<BlocksContextValue | undefined>(undefined);

export function BlocksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshBlocks = useCallback(async () => {
    if (!user) {
      setBlockedUserIds([]);
      setHiddenUserIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [outgoing, hidden] = await Promise.all([
      supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id),
      supabase.rpc('hidden_user_ids'),
    ]);
    if (outgoing.error || hidden.error) {
      console.error('Chargement des blocages impossible :', outgoing.error?.message || hidden.error?.message);
    } else {
      setBlockedUserIds((outgoing.data ?? []).map((row: { blocked_id: string }) => row.blocked_id));
      setHiddenUserIds((hidden.data ?? []).map((row: { user_id: string }) => row.user_id));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void refreshBlocks(); }, [refreshBlocks]);

  const blockUser = useCallback(async (userId: string) => {
    if (!user || userId === user.id) return false;
    const { error } = await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: userId });
    if (error && error.code !== '23505') return false;
    await refreshBlocks();
    return true;
  }, [refreshBlocks, user]);

  const unblockUser = useCallback(async (userId: string) => {
    if (!user) return false;
    const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', userId);
    if (error) return false;
    await refreshBlocks();
    return true;
  }, [refreshBlocks, user]);

  const value = useMemo(() => ({ blockedUserIds, hiddenUserIds, loading, blockUser, unblockUser, refreshBlocks }), [blockedUserIds, hiddenUserIds, loading, blockUser, unblockUser, refreshBlocks]);
  return <BlocksContext.Provider value={value}>{children}</BlocksContext.Provider>;
}

export function useBlocks() {
  const context = useContext(BlocksContext);
  if (!context) throw new Error('useBlocks doit être utilisé dans BlocksProvider.');
  return context;
}
