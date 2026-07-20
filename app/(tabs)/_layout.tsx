import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#62E6B1',
        tabBarInactiveTintColor: '#7E9189',

        tabBarStyle: {
          backgroundColor: '#071310',
          borderTopColor: '#19392E',
          height: 115,
          paddingTop: 10,
          paddingBottom: 32,
        },

        tabBarItemStyle: {
          paddingBottom: 5,
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