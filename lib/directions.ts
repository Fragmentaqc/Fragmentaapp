import { Alert, Linking, Platform } from 'react-native';

export async function openDirections(
  latitude: number,
  longitude: number,
  label?: string
) {
  const destination = `${latitude},${longitude}`;
  const url = Platform.OS === 'ios'
    ? `https://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(label || 'Destination')}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'Itinéraire indisponible',
      "Impossible d'ouvrir l'application de navigation."
    );
  }
}
