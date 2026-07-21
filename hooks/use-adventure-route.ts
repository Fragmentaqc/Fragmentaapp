import {
  createDirectRoute,
  fetchAdventureRoute,
  type RouteCoordinate,
  type RouteProfile,
} from '@/lib/routing';
import { useEffect, useMemo, useState } from 'react';

export function useAdventureRoute(
  coordinates: RouteCoordinate[],
  profile: RouteProfile
) {
  const coordinateKey = coordinates
    .map(({ latitude, longitude }) => `${latitude},${longitude}`)
    .join(';');
  const stableCoordinates = useMemo<RouteCoordinate[]>(() => coordinateKey
    ? coordinateKey.split(';').map((pair) => {
        const [latitude, longitude] = pair.split(',').map(Number);
        return { latitude, longitude };
      })
    : [], [coordinateKey]);
  const [route, setRoute] = useState(() => createDirectRoute(stableCoordinates));
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    const directRoute = createDirectRoute(stableCoordinates);
    setRoute(directRoute);
    setUsedFallback(false);
    if (stableCoordinates.length < 2) return;

    const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? '';
    if (!accessToken) {
      setUsedFallback(true);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    void fetchAdventureRoute(stableCoordinates, profile, accessToken, controller.signal)
      .then((result) => {
        setRoute(result);
        setUsedFallback(result.source === 'direct');
      })
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') {
          console.error('Erreur de calcul de l’itinéraire :', error);
          setRoute(directRoute);
          setUsedFallback(true);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [profile, stableCoordinates]);

  return { route, loading, usedFallback };
}
