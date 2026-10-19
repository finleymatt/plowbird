// Driving route and ETA from the driver to the driveway, via OSRM (OpenStreetMap routing).
// The public demo server needs no key; set OSRM_URL to point at your own instance in production.

const OSRM = (process.env.OSRM_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '');
const UA = process.env.NWS_USER_AGENT ?? 'Plowbird/1.0 (dev)';

// Plow trucks on snowy residential streets run slower than OSRM's clear-road times, and need a
// couple of minutes to drop the blade once they arrive.
const WINTER_FACTOR = 1.3;
const SETUP_MIN = 2;

const cache = new Map();

// Route from `from` to `to` ({lat, lng}). Positions are rounded to ~10 m so a truck idling at a
// light reuses the last route instead of hitting OSRM every GPS fix.
export async function drivingRoute(from, to) {
  const r = (n) => n.toFixed(4);
  const key = `${r(from.lat)},${r(from.lng)}>${r(to.lat)},${r(to.lng)}`;
  const hit = cache.get(key);
  if (hit && hit.at > Date.now() - 5 * 60_000) return hit.value;

  const url = `${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`routing ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route) throw new Error(`routing ${data.code}`);

  const seconds = Math.max(60, Math.round(route.duration * WINTER_FACTOR + SETUP_MIN * 60));
  const minutes = Math.round(seconds / 60);
  const value = {
    seconds,
    // [lat, lng] pairs, the order both map libraries want.
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    miles: Math.round((route.distance / 1609.34) * 10) / 10,
    minutes,
  };
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
  return value;
}
