import { supabase } from '@/lib/supabase';

export async function openDirectConversation(profileId: string) {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', { other_profile_id: profileId });
  if (error || !data) return { id: null, error: error?.message || 'Impossible d’ouvrir la conversation.' };
  return { id: data as string, error: null };
}
