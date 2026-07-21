import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AdventuresProvider } from '@/context/adventures-context';
import { AuthProvider } from '@/context/auth-context';
import { CuriositiesProvider } from '@/context/curiosities-context';
import { FragmentsProvider } from '@/context/fragments-context';
import { OfflineBanner } from '@/components/offline-banner';
import { ConnectionSync } from '@/components/connection-sync';
import { FavoritesProvider } from '@/context/favorites-context';
import { BlocksProvider } from '@/context/blocks-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <BlocksProvider>
      <AdventuresProvider>
        <CuriositiesProvider>
          <FragmentsProvider>
          <FavoritesProvider>
          <ThemeProvider
            value={
              colorScheme === 'dark'
                ? DarkTheme
                : DefaultTheme
            }
          >
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#071310',
                },
              }}
            >
              <Stack.Screen name="(tabs)" />

              <Stack.Screen name="auth" />

              <Stack.Screen name="forgot-password" />

              <Stack.Screen name="reset-password" />

              <Stack.Screen name="edit-profile" />

              <Stack.Screen name="add-curiosity" />

              <Stack.Screen name="curiosity/[id]" />

              <Stack.Screen name="edit-curiosity/[id]" />

              <Stack.Screen name="adventure/[id]" />

              <Stack.Screen name="edit-adventure/[id]" />

              <Stack.Screen name="add-fragment/[adventureId]" />

              <Stack.Screen name="edit-fragment/[id]" />

              <Stack.Screen name="user/[id]" />

              <Stack.Screen name="report" />

              <Stack.Screen name="moderation" />

              <Stack.Screen name="delete-account" />

              <Stack.Screen name="blocked-users" />

              <Stack.Screen name="export-data" />

              <Stack.Screen name="legal/[document]" />

            </Stack>

            <StatusBar
              style="light"
              backgroundColor="#071310"
            />
            <OfflineBanner />
            <ConnectionSync />
          </ThemeProvider>
          </FavoritesProvider>
          </FragmentsProvider>
        </CuriositiesProvider>
      </AdventuresProvider>
      </BlocksProvider>
    </AuthProvider>
  );
}
