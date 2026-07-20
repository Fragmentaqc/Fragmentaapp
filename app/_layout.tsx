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
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <AdventuresProvider>
        <CuriositiesProvider>
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

              <Stack.Screen name="edit-profile" />

              <Stack.Screen name="add-curiosity" />

              <Stack.Screen name="curiosity/[id]" />

              <Stack.Screen name="adventure/[id]" />

              <Stack.Screen
                name="modal"
                options={{
                  headerShown: true,
                  presentation: 'modal',
                  title: 'Modal',
                }}
              />
            </Stack>

            <StatusBar
              style="light"
              backgroundColor="#071310"
            />
          </ThemeProvider>
        </CuriositiesProvider>
      </AdventuresProvider>
    </AuthProvider>
  );
}
