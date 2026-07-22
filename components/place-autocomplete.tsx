import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export type SelectedPlace = {
  label: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

type MapboxFeature = {
  id: string;
  geometry: { coordinates: [number, number] };
  properties: {
    feature_type?: string;
    name?: string;
    name_preferred?: string;
    full_address?: string;
    place_formatted?: string;
    context?: {
      country?: { name?: string };
      place?: { name?: string };
      locality?: { name?: string };
    };
  };
};

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

function normalizePlace(feature: MapboxFeature): SelectedPlace {
  const { properties } = feature;
  const name = properties.name_preferred || properties.name || '';
  const type = properties.feature_type || '';
  return {
    label: properties.full_address || [name, properties.place_formatted].filter(Boolean).join(', '),
    city: type === 'place' || type === 'locality' ? name : properties.context?.place?.name || properties.context?.locality?.name || name,
    country: type === 'country' ? name : properties.context?.country?.name || '',
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
  };
}

export function PlaceAutocomplete({ value, onChangeText, onSelect, placeholder = 'Commence à écrire une ville ou une adresse', types = 'place,locality,address', selected }: {
  value: string;
  onChangeText: (value: string) => void;
  onSelect: (place: SelectedPlace) => void;
  placeholder?: string;
  types?: string;
  selected: boolean;
}) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const query = value.trim();
    if (selected || query.length < 2 || !MAPBOX_TOKEN) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const currentRequest = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, access_token: MAPBOX_TOKEN, autocomplete: 'true', permanent: 'true', limit: '6', types, language: 'fr,en,pt,es' });
        const url = `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`;
        const response = await fetch(url);
        const json = await response.json() as { features?: MapboxFeature[] };
        if (currentRequest === requestId.current) setSuggestions(json.features ?? []);
      } catch {
        if (currentRequest === requestId.current) setSuggestions([]);
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selected, types, value]);

  return <View style={styles.wrapper}>
    <View style={[styles.inputRow, selected && styles.inputRowSelected]}>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A8B3A4" style={styles.input} autoCorrect={false} autoCapitalize="words" />
      {loading ? <ActivityIndicator color="#B86F4B" /> : <Text style={[styles.status, selected && styles.statusSelected]}>{selected ? '✓' : '⌕'}</Text>}
    </View>
    {!selected && value.trim().length >= 2 ? <Text style={styles.helper}>Choisis obligatoirement une suggestion ci-dessous.</Text> : null}
    {!MAPBOX_TOKEN ? <Text style={styles.error}>La recherche de lieux nécessite le jeton Mapbox.</Text> : null}
    {suggestions.length ? <View style={styles.suggestions}>{suggestions.map((feature) => { const place = normalizePlace(feature); return <Pressable key={feature.id} style={styles.suggestion} onPress={() => { onSelect(place); setSuggestions([]); }}><Text style={styles.suggestionTitle}>{feature.properties.name_preferred || feature.properties.name}</Text><Text style={styles.suggestionAddress} numberOfLines={2}>{place.label}</Text></Pressable>; })}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', zIndex: 20 },
  inputRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#3D6648', backgroundColor: '#173523', paddingHorizontal: 14 },
  inputRowSelected: { borderColor: '#B86F4B' },
  input: { flex: 1, color: '#F4E9D6', fontSize: 14, paddingVertical: 13 },
  status: { width: 28, color: '#A8B3A4', fontSize: 19, textAlign: 'center' },
  statusSelected: { color: '#B86F4B' },
  helper: { color: '#C58A62', fontSize: 10, lineHeight: 15, marginTop: 6 },
  error: { color: '#E7A29A', fontSize: 10, lineHeight: 15, marginTop: 6 },
  suggestions: { borderWidth: 1, borderTopWidth: 0, borderColor: '#6F8D6C', backgroundColor: '#102218' },
  suggestion: { minHeight: 58, justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#35563E', paddingHorizontal: 14, paddingVertical: 9 },
  suggestionTitle: { color: '#F4E9D6', fontSize: 13, fontWeight: '900' },
  suggestionAddress: { color: '#AEBBAA', fontSize: 10, lineHeight: 14, marginTop: 3 },
});
