// Weather ticker for the top of the site: current temp, 24-hour snow and winter alerts across the
// service area, like a stock ticker. Refreshed in the background so requests never wait on NWS.
import { getConditions } from './weather.js';

const CITIES = [
  { name: 'Minneapolis', lat: 44.9778, lng: -93.265 },
  { name: 'St. Paul', lat: 44.9537, lng: -93.09 },
  { name: 'Duluth', lat: 46.7867, lng: -92.1005 },
  { name: 'Rochester', lat: 44.0121, lng: -92.4802 },
  { name: 'St. Cloud', lat: 45.5579, lng: -94.1632 },
  { name: 'Bemidji', lat: 47.4716, lng: -94.8827 },
  { name: 'Sioux Falls', lat: 43.5446, lng: -96.7311 },
  { name: 'Rapid City', lat: 44.0805, lng: -103.231 },
  { name: 'Brookings', lat: 44.3114, lng: -96.7984 },
  { name: 'Fargo', lat: 46.8772, lng: -96.7898 },
];

let items = [];
let updatedAt = null;
let refreshing = null;

async function refresh() {
  const results = await Promise.allSettled(CITIES.map((c) => getConditions(c.lat, c.lng)));
  const next = [];
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const wx = r.value;
    next.push({
      city: CITIES[i].name,
      tempF: wx.current?.tempF ?? null,
      sky: wx.current?.description ?? null,
      snowIn: wx.snowfall?.next24h?.inches ?? 0,
      alert: wx.alerts?.[0]?.event ?? null,
    });
  });
  // Keep the last good ticker if NWS is having a bad minute.
  if (next.length) {
    items = next;
    updatedAt = new Date().toISOString();
  }
}

export function getTicker() {
  if (!refreshing && (!updatedAt || Date.parse(updatedAt) < Date.now() - 10 * 60_000)) {
    refreshing = refresh()
      .catch((e) => console.error('ticker refresh failed', e.message))
      .finally(() => (refreshing = null));
  }
  return { items, updatedAt };
}

// Warm up at boot and keep fresh.
export function startTicker() {
  getTicker();
  setInterval(getTicker, 10 * 60_000).unref?.();
}
