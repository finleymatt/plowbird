// Public driver demo (/driver-demo in the app): what a driver's day looks like, with real pricing and
// real road routing over a sample set of west-metro stops. Nothing here touches real jobs or users.
//
// - Storm day: an 8" storm under a Winter Storm Warning. Storm Pass driveways are booked
//   automatically; we add a few on-demand orders, then optimize the order of stops (OSRM trip
//   service, falling back to nearest-neighbor) and total up pay, miles and hours.
// - Open jobs: ad hoc orders a driver could accept right now, on a normal snowy evening.
import { Router } from 'express';
import { adminIds } from './admin.js';
import { notify } from './jobs.js';
import { rateLimited } from './leads.js';
import { addRecommendedDriver } from './outreach.js';
import { quote, SIZE_LABELS, surgeMultiplier } from './pricing.js';

const OSRM = (process.env.OSRM_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '');
const UA = process.env.NWS_USER_AGENT ?? 'Plowbird/1.0 (dev)';
const WINTER_FACTOR = 1.3; // plow trucks on snowy streets vs. OSRM's clear-road times (routing.js)

// Example assumptions, shown on the page so nobody mistakes them for promises.
export const ASSUMPTIONS = {
  stormInches: 8,
  alert: 'Winter Storm Warning',
  plowMinutes: { single: 10, double: 14, triple: 18, large: 30 },
  sidewalkMinutes: 6,
  deepSnowExtraMinutes: 4, // over 6"
  mpg: 12,
  gasPerGallonCents: 325,
};

const BASE = { label: 'Your truck (Plymouth)', lat: 45.0218, lng: -93.4552 };

// Sample driveways around Plymouth, Wayzata and Minnetonka. Street names only; no real homes.
const STORM_STOPS = [
  { street: 'Fernbrook Ln N', city: 'Plymouth', lat: 45.0322, lng: -93.4706, size: 'double', pass: true },
  { street: 'Vicksburg Ln N', city: 'Plymouth', lat: 45.0409, lng: -93.4838, size: 'triple', pass: true, sidewalk: true },
  { street: 'Annapolis Ln N', city: 'Plymouth', lat: 45.0261, lng: -93.4448, size: 'single', pass: false },
  { street: 'Harbor Ln N', city: 'Plymouth', lat: 45.0134, lng: -93.4612, size: 'double', pass: true },
  { street: 'Niagara Ln N', city: 'Plymouth', lat: 45.0028, lng: -93.4471, size: 'double', pass: false },
  { street: 'Ferndale Rd N', city: 'Wayzata', lat: 44.9834, lng: -93.5098, size: 'triple', pass: true, length: 'long' },
  { street: 'Bushaway Rd', city: 'Wayzata', lat: 44.9662, lng: -93.4983, size: 'double', pass: true },
  { street: 'Gleason Lake Rd', city: 'Wayzata', lat: 44.9924, lng: -93.4927, size: 'single', pass: false },
  { street: 'Ridgemount Ave', city: 'Minnetonka', lat: 44.9814, lng: -93.4766, size: 'double', pass: true, sidewalk: true },
  { street: 'Crosby Rd', city: 'Minnetonka', lat: 44.9725, lng: -93.4855, size: 'double', pass: false },
  { street: 'Shelard Pkwy', city: 'Minnetonka', lat: 44.9688, lng: -93.4105, size: 'single', pass: true },
  { street: 'Sunset Trl', city: 'Plymouth', lat: 45.0106, lng: -93.4889, size: 'double', pass: false },
];

const OPEN_JOBS = [
  { street: 'Larch Ln N', city: 'Plymouth', lat: 45.0298, lng: -93.4602, size: 'double', depth: 4, tip: 500, minutesAgo: 1 },
  { street: 'Lake St E', city: 'Wayzata', lat: 44.9706, lng: -93.5069, size: 'single', depth: 4, tip: 0, minutesAgo: 3, scheduled: '6:00 am' },
  { street: 'Peony Ln N', city: 'Plymouth', lat: 45.0437, lng: -93.4975, size: 'triple', depth: 6, tip: 1000, minutesAgo: 4, sidewalk: true },
  { street: 'Hillside Ln', city: 'Minnetonka', lat: 44.9585, lng: -93.4627, size: 'double', depth: 5, tip: 300, minutesAgo: 7 },
];

const toRad = (d) => (d * Math.PI) / 180;
function haversineMiles(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

const plowMinutes = (s, depth) =>
  ASSUMPTIONS.plowMinutes[s.size] + (s.sidewalk ? ASSUMPTIONS.sidewalkMinutes : 0) + (depth > 6 ? ASSUMPTIONS.deepSnowExtraMinutes : 0) + (s.length === 'long' ? 6 : 0);

// Best stop order from the base. OSRM's trip service solves it on real roads; without it,
// nearest-neighbor on straight-line distance with a road factor.
async function optimize(stops) {
  const coords = [BASE, ...stops].map((p) => `${p.lng},${p.lat}`).join(';');
  try {
    const url = `${OSRM}/trip/v1/driving/${coords}?source=first&roundtrip=false&overview=full&geometries=geojson&annotations=false`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.code !== 'Ok' || !data.trips?.[0]) throw new Error(data.code);
    const trip = data.trips[0];
    // waypoints[i].waypoint_index = position of input i in the trip.
    const order = data.waypoints
      .map((w, i) => ({ i, at: w.waypoint_index }))
      .filter((x) => x.i > 0)
      .sort((a, b) => a.at - b.at)
      .map((x) => x.i - 1);
    return {
      order,
      legs: trip.legs.map((l) => ({ miles: l.distance / 1609.34, minutes: (l.duration / 60) * WINTER_FACTOR })),
      coords: trip.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      source: 'roads',
    };
  } catch {
    const left = stops.map((_, i) => i);
    const order = [];
    let at = BASE;
    while (left.length) {
      left.sort((a, b) => haversineMiles(at, stops[a]) - haversineMiles(at, stops[b]));
      order.push(left.shift());
      at = stops[order.at(-1)];
    }
    const pts = [BASE, ...order.map((i) => stops[i])];
    const legs = pts.slice(1).map((p, k) => {
      const miles = haversineMiles(pts[k], p) * 1.35;
      return { miles, minutes: (miles / 25) * 60 * WINTER_FACTOR };
    });
    return { order, legs, coords: pts.map((p) => [p.lat, p.lng]), source: 'estimate' };
  }
}

let cached = null;

async function buildDemo() {
  const surge = surgeMultiplier({ alerts: [{ event: ASSUMPTIONS.alert }] });
  const depth = ASSUMPTIONS.stormInches;
  const priced = STORM_STOPS.map((s) => {
    const q = quote({ size: s.size, length: s.length ?? 'standard', sidewalk: !!s.sidewalk }, { depthIn: depth, surge });
    return { ...s, payoutCents: q.driverPayout, minutes: plowMinutes(s, depth) };
  });
  const trip = await optimize(priced);

  let clock = 5 * 60; // the storm stops at 5:00 am; first stop on the way
  const stops = trip.order.map((i, k) => {
    const s = priced[i];
    const leg = trip.legs[k];
    clock += leg.minutes;
    const arrive = clock;
    clock += s.minutes;
    return {
      n: k + 1,
      label: `${s.street}, ${s.city}`,
      city: s.city,
      lat: s.lat,
      lng: s.lng,
      size: SIZE_LABELS[s.size],
      sidewalk: !!s.sidewalk,
      longDrive: s.length === 'long',
      kind: s.pass ? 'storm_pass' : 'on_demand',
      payoutCents: s.payoutCents,
      driveMiles: Math.round(leg.miles * 10) / 10,
      driveMinutes: Math.round(leg.minutes),
      plowMinutes: s.minutes,
      arriveAt: arrive,
    };
  });
  const miles = trip.legs.reduce((s, l) => s + l.miles, 0);
  const driveMin = trip.legs.reduce((s, l) => s + l.minutes, 0);
  const plowMin = stops.reduce((s, x) => s + x.plowMinutes, 0);
  const gross = stops.reduce((s, x) => s + x.payoutCents, 0);
  const fuel = Math.round((miles / ASSUMPTIONS.mpg) * ASSUMPTIONS.gasPerGallonCents);
  const hours = (driveMin + plowMin) / 60;

  const open = OPEN_JOBS.map((j, k) => {
    const q = quote({ size: j.size, length: 'standard', sidewalk: !!j.sidewalk }, { depthIn: j.depth, surge: 1 });
    return {
      id: `demo-${k + 1}`,
      label: `${j.street}, ${j.city}`,
      lat: j.lat,
      lng: j.lng,
      size: SIZE_LABELS[j.size],
      sidewalk: !!j.sidewalk,
      depthIn: j.depth,
      payoutCents: q.driverPayout,
      tipCents: j.tip,
      miles: Math.round(haversineMiles(BASE, j) * 1.3 * 10) / 10,
      minutesAgo: j.minutesAgo,
      scheduled: j.scheduled ?? null,
    };
  });

  return {
    base: BASE,
    assumptions: { ...ASSUMPTIONS, surge },
    storm: {
      stops,
      route: trip.coords,
      routeSource: trip.source,
      totals: {
        stops: stops.length,
        stormPass: stops.filter((s) => s.kind === 'storm_pass').length,
        grossCents: gross,
        miles: Math.round(miles * 10) / 10,
        driveMinutes: Math.round(driveMin),
        plowMinutes: plowMin,
        hours: Math.round(hours * 10) / 10,
        perHourCents: Math.round(gross / hours),
        fuelCents: fuel,
        netCents: gross - fuel,
        finishAt: Math.round(clock),
      },
    },
    open,
  };
}

export const driverDemoApi = Router();

driverDemoApi.get('/drive/demo', async (req, res, next) => {
  try {
    // Routing only changes if the sample changes; cache road results for a day.
    if (!cached || cached.at < Date.now() - (cached.value.storm.routeSource === 'roads' ? 86400_000 : 600_000))
      cached = { at: Date.now(), value: await buildDemo() };
    res.json(cached.value);
  } catch (e) {
    next(e);
  }
});

const field = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '') || null;

// Someone recommends a plow driver. Staff follow up from /admin → Outreach → Drivers.
driverDemoApi.post('/drive/recommend', (req, res) => {
  if (rateLimited(req.ip ?? 'unknown')) return res.status(429).json({ error: 'Too many from here. Try again in a few minutes.' });
  const b = req.body ?? {};
  const driverName = field(b.driverName, 120);
  const phone = field(b.phone, 40);
  const email = field(b.email, 200);
  if (!driverName) return res.status(400).json({ error: 'Enter the driver’s name or business' });
  if (!phone && !email) return res.status(400).json({ error: 'Add a phone number or email so we can reach them' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'That email doesn’t look right' });
  addRecommendedDriver({
    driverName,
    phone,
    email,
    area: field(b.area, 120),
    notes: field(b.notes, 1000),
    byName: field(b.yourName, 120),
    byContact: field(b.yourContact, 200),
  });
  for (const id of adminIds()) notify(id, 'Driver recommended', `${driverName} was recommended as a driver. See /admin → Outreach → Drivers.`);
  res.json({ ok: true });
});
