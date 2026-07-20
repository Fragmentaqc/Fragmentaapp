import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type Coordinate = { latitude: number; longitude: number };

export function LocationPicker({
  coordinate,
  onSelect,
}: {
  coordinate: Coordinate | null;
  onSelect: (coordinate: Coordinate) => void;
}) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: coordinate?.latitude ?? 45.5019,
          longitude: coordinate?.longitude ?? -73.5674,
          latitudeDelta: coordinate ? 0.08 : 5,
          longitudeDelta: coordinate ? 0.08 : 5,
        }}
        onPress={(event) => onSelect(event.nativeEvent.coordinate)}
      >
        {coordinate ? <Marker coordinate={coordinate} pinColor="#62E6B1" /> : null}
      </MapView>
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
});
