import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#E9576F',
        tabBarInactiveTintColor: '#7E9189',

        tabBarStyle: {
          backgroundColor: '#1D4A2E',
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
    </Tabs>
  );
}
