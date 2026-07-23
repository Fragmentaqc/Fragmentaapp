import { useAdventures } from '@/context/adventures-context';
import { useFragments } from '@/context/fragments-context';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const { isOffline: adventuresOffline } = useAdventures();
  const { isOffline: fragmentsOffline } = useFragments();
  const insets = useSafeAreaInsets();

  if (!adventuresOffline && !fragmentsOffline) return null;

  return (
    <View style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]} pointerEvents="none">
      <Text style={styles.text}>Mode hors ligne · dernière version enregistrée</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', zIndex: 100, top: 0, left: 0, right: 0, alignItems: 'center', backgroundColor: '#C58A62', paddingBottom: 7, paddingHorizontal: 12 },
  text: { color: '#0B1710', fontSize: 10, fontWeight: '900' },
});
