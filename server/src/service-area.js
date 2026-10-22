// Pilot service area: SERVICE_ZIPS="55406,55407,55417" limits orders to those ZIP codes, and
// SERVICE_AREA_LABEL names them for customers ("Plymouth, Wayzata and Hopkins").
// Empty (the default) means everywhere. Outside the area, quotes and new orders get a
// 400 with code 'outside_area' and the app offers the waitlist instead (leads.js).
const UA = process.env.NWS_USER_AGENT ?? 'Plowbird/1.0 (dev)';

export const SERVICE_ZIPS = new Set(
  String(process.env.SERVICE_ZIPS ?? '')
    .split(',')
    .map((z) => z.trim())
    .filter((z) => /^\d{5}$/.test(z)),
);
export const serviceAreaLimited = () => SERVICE_ZIPS.size > 0;
// How the app names the pilot area, e.g. "Plymouth, Wayzata, Hopkins and Minnetonka". Optional.
export const SERVICE_AREA_LABEL = String(process.env.SERVICE_AREA_LABEL ?? '').trim().slice(0, 120) || null;

export const OUTSIDE_AREA = "We're not plowing here yet. Join the waitlist and we'll let you know when we are.";

// Picked addresses end in the ZIP: "3400 N 2nd St, Minneapolis, MN 55412".
export function zipFromText(text) {
  return String(text ?? '').match(/\b(\d{5})(?:-\d{4})?\s*(?:,\s*(?:USA|United States))?\s*$/i)?.[1] ?? null;
}

// No ZIP in the text (a bare street pick): ask Photon which ZIP the point is in.
const reverseCache = new Map();
async function zipFromPoint(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseCache.has(key)) return reverseCache.get(key);
  const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`photon reverse ${res.status}`);
  const zip = (await res.json()).features?.[0]?.properties?.postcode?.match(/\d{5}/)?.[0] ?? null;
  if (reverseCache.size > 2000) reverseCache.delete(reverseCache.keys().next().value);
  reverseCache.set(key, zip);
  return zip;
}

export async function zipFor({ address, lat, lng }) {
  return zipFromText(address) ?? (await zipFromPoint(Number(lat), Number(lng)).catch(() => null));
}

// The ZIP when the place is outside the pilot area, else null. If the ZIP can't be worked out
// (no ZIP in the text and the lookup failed) the order goes through: an order nobody accepts
// just times out (timeouts.js), which beats turning away a neighbor during a geocoder outage.
export async function outsideArea(place) {
  if (!serviceAreaLimited()) return null;
  const zip = await zipFor(place);
  return zip && !SERVICE_ZIPS.has(zip) ? zip : null;
}

// Same check without a network lookup, for the background storm checks.
export function outsideAreaSync(address) {
  if (!serviceAreaLimited()) return false;
  const zip = zipFromText(address);
  return !!zip && !SERVICE_ZIPS.has(zip);
}

export const sendOutsideArea = (res, zip) => res.status(400).json({ error: OUTSIDE_AREA, code: 'outside_area', zip });
