import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@fragmenta/offline/v1';

export async function readOfflineCache<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(`${PREFIX}/${key}`);
    return value ? JSON.parse(value) as T : null;
  } catch (error) {
    console.error('Lecture du cache hors ligne impossible :', error);
    return null;
  }
}

export async function writeOfflineCache(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(`${PREFIX}/${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Écriture du cache hors ligne impossible :', error);
  }
}
