const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createDirectRoute,
  distanceBetween,
  splitRouteCoordinates,
} = require('../node_modules/.cache/fragmenta-tests/routing.js');

test('calcule une distance directe réaliste', () => {
  const distance = distanceBetween(
    { latitude: 45.5019, longitude: -73.5674 },
    { latitude: 46.8139, longitude: -71.2080 }
  );
  assert.ok(distance > 230 && distance < 260);
});

test('additionne les segments du trajet de secours', () => {
  const route = createDirectRoute([
    { latitude: 45, longitude: -73 },
    { latitude: 45.1, longitude: -73 },
    { latitude: 45.2, longitude: -73 },
  ]);
  assert.equal(route.source, 'direct');
  assert.ok(route.distanceKm > 22 && route.distanceKm < 23);
});

test('découpe les longs trajets avec un point commun', () => {
  const coordinates = Array.from({ length: 30 }, (_, index) => ({
    latitude: 45 + index / 100,
    longitude: -73,
  }));
  const chunks = splitRouteCoordinates(coordinates);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].length, 25);
  assert.deepEqual(chunks[0][24], chunks[1][0]);
  assert.equal(chunks[1].length, 6);
});
