import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export function NotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!user) { setCount(0); return; }
    const { count: unread } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).is('read_at', null);
    setCount(unread ?? 0);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`notification-bell-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, user]);
  if (!user) return null;
  return <Pressable style={styles.button} onPress={() => router.push('/notifications' as never)} accessibilityLabel={`${count} notification${count === 1 ? '' : 's'} non lue${count === 1 ? '' : 's'}`}><Text style={styles.icon}>♢</Text>{count > 0 ? <Text style={styles.badge}>{count > 99 ? '99+' : count}</Text> : null}</Pressable>;
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#55775B', backgroundColor: '#173523' },
  icon: { color: '#F4E9D6', fontSize: 26, lineHeight: 29, transform: [{ rotate: '180deg' }] },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 21, height: 21, color: '#0B1710', backgroundColor: '#B86F4B', textAlign: 'center', lineHeight: 21, fontSize: 8, fontWeight: '900', overflow: 'hidden' },
});
