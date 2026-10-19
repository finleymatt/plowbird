// Address type-ahead without an API key.
//
// Photon (OpenStreetMap) knows nearly every street and city but few house numbers in MN/SD,
// so suggestions are "the house number you typed + streets Photon matched". Picking one runs it
// through the US Census geocoder, which knows house-number ranges and returns the exact spot.

import { searchAddressIndex } from './address-index.js';

const PHOTON = 'https://photon.komoot.io/api/';
const CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const UA = process.env.NWS_USER_AGENT ?? 'Plowbird/1.0 (dev)';

// Service area (MN + SD) plus a little margin, and the state names Photon returns.
const BBOX = '-104.06,42.48,-89.48,49.39';
const STATES = { Minnesota: 'MN', 'South Dakota': 'SD', 'North Dakota': 'ND' };

// Photon matches loosely (and returns businesses that sit on other streets), so keep only
// results where every typed word starts a word of the street, city or state.
const ABBREV = {
  n: 'north', s: 'south', e: 'east', w: 'west', ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest',
  st: 'street', ave: 'avenue', av: 'avenue', dr: 'drive', rd: 'road', ln: 'lane', ct: 'court', pl: 'place',
  blvd: 'boulevard', cir: 'circle', pkwy: 'parkway', hwy: 'highway', trl: 'trail', ter: 'terrace', mn: 'minnesota', sd: 'south dakota', nd: 'north dakota',
};
const words = (s) => s.toLowerCase().replace(/[.,#]/g, ' ').split(/\s+/).filter(Boolean);
const matchesQuery = (query, haystack) => {
  const hay = words(haystack);
  return words(query).every((t) => {
    const full = ABBREV[t];
    return hay.some((h) => h.startsWith(t) || (full && full.split(' ').every((f) => hay.includes(f))));
  });
};
// Bias toward the Twin Cities unless the app knows where the user is.
const DEFAULT_NEAR = { lat: 44.98, lng: -93.27 };

const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && hit.at > Date.now() - ttlMs) return hit.value;
  const value = await fn();
  if (cache.size > 1000) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
  return value;
}

const fetchJson = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
};

// "3400 N 2ND ST, MINNEAPOLIS, MN, 55412" → "3400 N 2nd St, Minneapolis, MN 55412"
export function prettyAddress(census) {
  const parts = census.split(',').map((s) => s.trim());
  const zip = /^\d{5}$/.test(parts.at(-1)) ? parts.pop() : null;
  const state = parts.pop();
  const word = (w) =>
    /^(N|S|E|W|NE|NW|SE|SW)$/.test(w) ? w : /^\d+(ST|ND|RD|TH)$/.test(w) ? w.toLowerCase() : w.charAt(0) + w.slice(1).toLowerCase();
  const nice = parts.map((p) => p.split(/\s+/).map(word).join(' '));
  return `${nice.join(', ')}, ${state}${zip ? ` ${zip}` : ''}`;
}

export async function suggestAddresses(raw, near = DEFAULT_NEAR) {
  // Our own MN/SD address index answers in milliseconds; Photon is the fallback while it builds
  // or for the rare street it doesn't have.
  const local = searchAddressIndex(raw, near);
  if (local?.length) return local;
  const q = String(raw).trim().replace(/\s+/g, ' ');
  const m = q.match(/^(\d+[a-z]?)\s+(.+)$/i);
  const number = m?.[1] ?? null;
  const rest = m ? m[2] : q;
  if (rest.length < 2) return [];

  const out = [];
  const seen = new Set();
  // Near the user and across the whole service area, at the same time; nearby results rank first.
  const urls = [`&lat=${near.lat}&lon=${near.lng}&location_bias_scale=0.15`, ''].map(
    (bias) => `${PHOTON}?q=${encodeURIComponent(rest)}&limit=15&lang=en&bbox=${BBOX}&layer=street&layer=house${bias}`,
  );
  const pages = await Promise.all(urls.map((url) => cached(`p:${url}`, 10 * 60_000, () => fetchJson(url)).catch(() => ({ features: [] }))));
  for (const data of pages) {
    for (const f of data.features ?? []) {
      const p = f.properties;
      const st = STATES[p.state];
      const street = p.street ?? (p.type === 'street' ? p.name : null);
      const city = p.city ?? p.town ?? p.village ?? p.district ?? p.county;
      if (!st || !street || !city) continue;
      if (!matchesQuery(rest, `${street} ${city} ${p.state} ${p.postcode ?? ''}`)) continue;
      // A house Photon knows exactly, but only if it's the number the user typed.
      const exact = p.housenumber && (!number || p.housenumber.toLowerCase() === number.toLowerCase());
      if (p.housenumber && !exact) continue;
      const line1 = exact ? `${p.housenumber} ${street}` : number ? `${number} ${street}` : street;
      const line2 = `${city}, ${st}${p.postcode ? ` ${p.postcode}` : ''}`;
      const key = `${line1}|${city}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const [lng, lat] = f.geometry.coordinates;
      // exact: Photon knows this very house, so it doesn't need a Census check.
      out.push({ line1, line2, text: `${line1}, ${line2}`, lat, lng, needsNumber: !exact && !number, exact: !!exact });
      if (out.length === 5) return out;
    }
  }
  return out;
}

// Confirm a full address with the Census geocoder. Null if it doesn't know that house number.
export async function resolveAddress(text) {
  const url = `${CENSUS}?address=${encodeURIComponent(text)}&benchmark=Public_AR_Current&format=json`;
  const data = await cached(`c:${text.toLowerCase()}`, 60 * 60_000, () => fetchJson(url));
  const match = data.result?.addressMatches?.[0];
  if (!match) return null;
  return { address: prettyAddress(match.matchedAddress), lat: match.coordinates.y, lng: match.coordinates.x };
}
