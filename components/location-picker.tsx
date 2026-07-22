import { useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

type Coordinate = { latitude: number; longitude: number };

const geocodeCache = new Map<string, Coordinate>();
let lastGeocodeRequest = 0;

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
  const [addressQuery, setAddressQuery] = useState('');
  const [searching, setSearching] = useState(false);

  async function searchAddress() {
    const query = addressQuery.trim();
    if (query.length < 3 || searching) return;

    const cacheKey = query.toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      onSelect(cached);
      mapRef.current?.animateToRegion({ ...cached, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
      return;
    }

    setSearching(true);
    try {
      const delay = Math.max(0, 1000 - (Date.now() - lastGeocodeRequest));
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      lastGeocodeRequest = Date.now();

      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.7',
          'User-Agent': 'Fragmenta/1.0 (github.com/Fragmentaqc/Fragmentaapp)',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const results = await response.json() as { lat: string; lon: string }[];
      const first = results[0];
      if (!first) {
        Alert.alert('Adresse introuvable', 'Essaie une adresse plus complète avec la ville et le pays.');
        return;
      }
      const found = { latitude: Number(first.lat), longitude: Number(first.lon) };
      if (!Number.isFinite(found.latitude) || !Number.isFinite(found.longitude)) throw new Error('Coordonnées invalides');
      geocodeCache.set(cacheKey, found);
      onSelect(found);
      mapRef.current?.animateToRegion({ ...found, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
    } catch {
      Alert.alert('Recherche indisponible', "Impossible de rechercher l'adresse pour le moment.");
    } finally {
      setSearching(false);
    }
  }

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
      <View style={styles.searchRow}>
        <TextInput
          value={addressQuery}
          onChangeText={setAddressQuery}
          placeholder="Rechercher une adresse"
          placeholderTextColor="#73877E"
          returnKeyType="search"
          onSubmitEditing={() => void searchAddress()}
          style={styles.searchInput}
        />
        <Pressable style={styles.searchButton} onPress={() => void searchAddress()} disabled={searching}>
          <Text style={styles.searchButtonText}>{searching ? '…' : '⌕'}</Text>
        </Pressable>
      </View>
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
  searchRow: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 7 },
  searchInput: { flex: 1, minHeight: 42, borderRadius: 0, backgroundColor: 'rgba(7, 19, 16, 0.92)', color: '#F4EBD8', fontSize: 12, paddingHorizontal: 13 },
  searchButton: { width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#C99A2E' },
  searchButtonText: { color: '#071A1C', fontSize: 21, fontWeight: '900' },
  gpsButton: { position: 'absolute', top: 62, right: 12, borderRadius: 0, backgroundColor: '#C99A2E', paddingHorizontal: 12, paddingVertical: 9 },
  gpsButtonText: { color: '#071A1C', fontSize: 11, fontWeight: '900' },
});
