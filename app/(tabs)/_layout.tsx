import { Tabs } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const loadUnreadMessages = useCallback(async () => {
    if (!user) { setUnreadMessages(0); return; }
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).neq('sender_id', user.id).is('read_at', null);
    setUnreadMessages(count ?? 0);
  }, [user]);

  useEffect(() => { void loadUnreadMessages(); }, [loadUnreadMessages]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`message-badge-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void loadUnreadMessages()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadUnreadMessages, user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#B86F4B',
        tabBarInactiveTintColor: '#7E9189',

        tabBarStyle: {
          backgroundColor: '#102218',
          borderTopColor: '#2B5546',
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },

        tabBarItemStyle: {
          paddingBottom: 0,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={26}
              name="house.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={26}
              name="safari.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="publish"
        options={{
          title: 'Fragment',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={31}
              name="plus.circle.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={26}
              name="map.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={26}
              name="person.fill"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined,
          tabBarBadgeStyle: { backgroundColor: '#B86F4B', color: '#0B1710', fontSize: 9, fontWeight: '900' },
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="message.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
