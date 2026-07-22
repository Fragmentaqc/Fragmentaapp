import { useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

type Coordinate = { latitude: number; longitude: number };

export function LocationPicker({
  coordinate,
  onSelect,
}: {
  coordinate: Coordinate | null;
  onSelect: (coordinate: Coordinate) => void;
}) {
  const mapRef = useRef<MapView | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locating, setLocating] = useState(false);
  async function handleCurrentLocation() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission refusée', 'Autorise la localisation dans les réglages du téléphone ou place le point manuellement.');
        return;
      }

      setLocationEnabled(true);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      onSelect(current);
      mapRef.current?.animateToRegion({
        ...current,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      }, 500);
    } catch {
      Alert.alert('GPS indisponible', 'Vérifie que la localisation du téléphone est activée, puis réessaie.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: coordinate?.latitude ?? 45.5019,
          longitude: coordinate?.longitude ?? -73.5674,
          latitudeDelta: coordinate ? 0.08 : 5,
          longitudeDelta: coordinate ? 0.08 : 5,
        }}
        onPress={(event) => onSelect(event.nativeEvent.coordinate)}
        showsUserLocation={locationEnabled}
        showsMyLocationButton={false}
      >
        {coordinate ? <Marker coordinate={coordinate} pinColor="#C99A2E" /> : null}
      </MapView>
      <Pressable
        style={styles.gpsButton}
        onPress={() => void handleCurrentLocation()}
        disabled={locating}
      >
        <Text style={styles.gpsButtonText}>
          {locating ? 'Localisation…' : '◎ Ma position'}
        </Text>
      </Pressable>
      <View style={styles.hint} pointerEvents="none">
        <Text style={styles.hintText}>
          {coordinate ? 'Touchez ailleurs pour déplacer le point' : 'Touchez la carte pour placer le point'}
        </Text>
      </View>
      <Text style={styles.attribution} pointerEvents="none">© OpenStreetMap</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 230, overflow: 'hidden', borderRadius: 0, borderWidth: 1, borderColor: '#3C7475', marginTop: 10 },
  map: { flex: 1 },
  hint: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'center' },
  hintText: { color: '#F4EBD8', fontSize: 11, fontWeight: '800', borderRadius: 0, backgroundColor: 'rgba(7, 19, 16, 0.84)', paddingHorizontal: 12, paddingVertical: 8 },
  attribution: { position: 'absolute', left: 7, bottom: 5, color: '#50645B', fontSize: 8 },
  gpsButton: { position: 'absolute', top: 12, right: 12, borderRadius: 0, backgroundColor: '#C99A2E', paddingHorizontal: 12, paddingVertical: 9 },
  gpsButtonText: { color: '#071A1C', fontSize: 11, fontWeight: '900' },
});
