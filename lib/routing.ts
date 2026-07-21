export type RouteProfile = 'driving' | 'cycling' | 'walking';

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type AdventureRoute = {
  coordinates: RouteCoordinate[];
  distanceKm: number;
  source: 'mapbox' | 'direct';
};

const MAX_WAYPOINTS = 25;

export function splitRouteCoordinates(
  coordinates: RouteCoordinate[],
  maximum = MAX_WAYPOINTS
) {
  if (coordinates.length <= maximum) return [coordinates];

  const chunks: RouteCoordinate[][] = [];
  let start = 0;
  while (start < coordinates.length - 1) {
    const chunk = coordinates.slice(start, start + maximum);
    chunks.push(chunk);
    start += chunk.length - 1;
  }
  return chunks;
}

export function distanceBetween(
  first: RouteCoordinate,
  second: RouteCoordinate
) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude)
    * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function createDirectRoute(coordinates: RouteCoordinate[]): AdventureRoute {
  const distanceKm = coordinates.slice(1).reduce(
    (total, coordinate, index) => total + distanceBetween(coordinates[index], coordinate),
    0
  );
  return { coordinates, distanceKm, source: 'direct' };
}

type MapboxRoute = {
  distance?: number;
  geometry?: { coordinates?: [number, number][] };
};

export async function fetchAdventureRoute(
  coordinates: RouteCoordinate[],
  profile: RouteProfile,
  accessToken: string,
  signal?: AbortSignal
): Promise<AdventureRoute> {
  if (coordinates.length < 2) return createDirectRoute(coordinates);
  if (!accessToken.trim()) return createDirectRoute(coordinates);

  const routeCoordinates: RouteCoordinate[] = [];
  let distanceMeters = 0;

  for (const chunk of splitRouteCoordinates(coordinates)) {
    const waypointString = chunk
      .map(({ longitude, latitude }) => `${longitude},${latitude}`)
      .join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${waypointString}?geometries=geojson&overview=full&steps=false&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Itinéraire indisponible (${response.status}).`);

    const payload = await response.json() as { routes?: MapboxRoute[] };
    const route = payload.routes?.[0];
    const geometry = route?.geometry?.coordinates;
    if (!route || !geometry?.length || typeof route.distance !== 'number') {
      throw new Error('Aucun itinéraire trouvé entre ces points.');
    }

    const converted = geometry.map(([longitude, latitude]) => ({ latitude, longitude }));
    routeCoordinates.push(...(routeCoordinates.length ? converted.slice(1) : converted));
    distanceMeters += route.distance;
  }

  return {
    coordinates: routeCoordinates,
    distanceKm: distanceMeters / 1000,
    source: 'mapbox',
  };
}
