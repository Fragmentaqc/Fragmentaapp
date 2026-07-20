import { useRef, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
    if (Platform.OS === 'android') {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Utiliser ma position',
          message: 'Fragmenta utilisera ta position pour placer ce point sur la carte.',
          buttonPositive: 'Autoriser',
          buttonNegative: 'Annuler',
        }
      );
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission refusée', 'Tu peux toujours placer le point manuellement sur la carte.');
        return;
      }
    }

    setLocating(true);
    setLocationEnabled(true);
    setTimeout(() => setLocating(false), 10000);
  }

  function receiveLocation(event: { nativeEvent: { coordinate?: Coordinate } }) {
    const current = event.nativeEvent.coordinate;
    if (!current) return;
    setLocating(false);
    onSelect(current);
    mapRef.current?.animateToRegion({
      ...current,
      latitudeDelta: 0.025,
      longitudeDelta: 0.025,
    }, 500);
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
        onUserLocationChange={receiveLocation}
      >
        {coordinate ? <Marker coordinate={coordinate} pinColor="#62E6B1" /> : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 230, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: '#285345', marginTop: 10 },
  map: { flex: 1 },
  hint: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'center' },
  hintText: { color: '#F3FFF9', fontSize: 11, fontWeight: '800', borderRadius: 13, backgroundColor: 'rgba(7, 19, 16, 0.84)', paddingHorizontal: 12, paddingVertical: 8 },
  gpsButton: { position: 'absolute', top: 12, right: 12, borderRadius: 14, backgroundColor: '#62E6B1', paddingHorizontal: 12, paddingVertical: 9 },
  gpsButtonText: { color: '#071310', fontSize: 11, fontWeight: '900' },
});
