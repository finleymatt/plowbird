// National Weather Service (api.weather.gov) client. Free, no key, great
// coverage for MN/SD. NWS asks for a descriptive User-Agent with contact info.

const UA = process.env.NWS_USER_AGENT ?? 'PlowNow/1.0 (dev; contact: admin@plownow.local)';
const cache = new Map();

async function nws(url, ttlMs = 10 * 60_000) {
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.data;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/geo+json' } });
  if (!res.ok) throw new Error(`NWS ${res.status} for ${url}`);
  const data = await res.json();
  cache.set(url, { data, expires: Date.now() + ttlMs });
  return data;
}

// Demo mode lets you see storm UX in the off-season. Responses carry `simulated: true`.
let demoStorm = process.env.DEMO_STORM === '1';
export const setDemoStorm = (on) => (demoStorm = !!on);
export const isDemoStorm = () => demoStorm;

const cToF = (c) => (c == null ? null : Math.round((c * 9) / 5 + 32));
const kmhToMph = (k) => (k == null ? null : Math.round(k * 0.621371));
const mmToIn = (mm) => mm / 25.4;

function parseDuration(iso) {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?/.exec(iso);
  return ((Number(m?.[1] ?? 0) * 24) + Number(m?.[2] ?? 0)) * 3600_000;
}

// Sum gridpoint snowfall between now and now + hours, prorating partial periods.
function snowfallSummary(values, hoursAhead) {
  const now = Date.now();
  const end = now + hoursAhead * 3600_000;
  let mm = 0;
  let lastSnowEnd = null;
  let firstSnowStart = null;
  for (const v of values ?? []) {
    const [startStr, dur] = v.validTime.split('/');
    const s = Date.parse(startStr);
    const e = s + parseDuration(dur);
    const overlap = Math.max(0, Math.min(e, end) - Math.max(s, now));
    if (!overlap || !v.value) continue;
    mm += v.value * (overlap / (e - s));
    if (v.value > 0.5) {
      firstSnowStart ??= Math.max(s, now);
      lastSnowEnd = Math.min(e, end);
    }
  }
  return {
    inches: Math.round(mmToIn(mm) * 10) / 10,
    startsAt: firstSnowStart ? new Date(firstSnowStart).toISOString() : null,
    endsAt: lastSnowEnd ? new Date(lastSnowEnd).toISOString() : null,
  };
}

const WINTER_EVENTS = /Blizzard|Winter|Snow|Ice|Freez|Wind Chill|Cold/i;

function stormLevel(alerts, next24) {
  const ev = alerts.map((a) => a.event).join('|');
  if (/Blizzard Warning|Ice Storm Warning/.test(ev) || next24 >= 10) return 'major';
  if (/Winter Storm Warning/.test(ev) || next24 >= 6) return 'significant';
  if (/Watch|Advisory/.test(ev) || next24 >= 2) return 'moderate';
  if (next24 > 0) return 'light';
  return 'none';
}

function simulatedOverlay(base) {
  const start = Date.now() + 2 * 3600_000;
  const end = start + 14 * 3600_000;
  return {
    ...base,
    simulated: true,
    current: { ...base.current, tempF: 18, windChillF: 4, windMph: 22, description: 'Snow and blowing snow' },
    alerts: [
      {
        id: 'demo-wsw',
        event: 'Winter Storm Warning',
        severity: 'Severe',
        headline: 'Winter Storm Warning in effect from this evening through tomorrow morning (simulated)',
        description:
          'Heavy snow expected. Total snow accumulations of 8 to 12 inches. Winds gusting as high as 35 mph will cause areas of blowing and drifting snow.',
        instruction: 'If you must travel, keep an extra flashlight, food, and water in your vehicle.',
        ends: new Date(end).toISOString(),
      },
      ...base.alerts,
    ],
    snowfall: {
      next24h: { inches: 9.5, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() },
      next48h: { inches: 10.5, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() },
    },
    forecast: base.forecast.map((f, i) =>
      i < 3 ? { ...f, tempF: [22, 17, 24][i], short: ['Heavy Snow', 'Snow and Blowing Snow', 'Snow Likely'][i], precipChance: [90, 100, 70][i] } : f,
    ),
    stormLevel: 'significant',
  };
}

export async function getConditions(lat, lng) {
  const la = Number(lat).toFixed(4);
  const ln = Number(lng).toFixed(4);
  const point = await nws(`https://api.weather.gov/points/${la},${ln}`, 24 * 3600_000);
  const p = point.properties;

  const [forecast, grid, stations, alertsRes] = await Promise.all([
    nws(p.forecast),
    nws(p.forecastGridData),
    nws(p.observationStations, 24 * 3600_000),
    nws(`https://api.weather.gov/alerts/active?point=${la},${ln}`, 5 * 60_000),
  ]);

  let current = null;
  const stationId = stations.features?.[0]?.properties?.stationIdentifier;
  if (stationId) {
    try {
      const obs = (await nws(`https://api.weather.gov/stations/${stationId}/observations/latest`, 10 * 60_000)).properties;
      current = {
        station: stations.features[0].properties.name,
        observedAt: obs.timestamp,
        description: obs.textDescription,
        tempF: cToF(obs.temperature?.value),
        windChillF: cToF(obs.windChill?.value),
        windMph: kmhToMph(obs.windSpeed?.value),
        gustMph: kmhToMph(obs.windGust?.value),
        icon: obs.icon,
      };
    } catch {
      // Station outages are common; forecast still works without it.
    }
  }
  if (!current || current.tempF == null) {
    const first = forecast.properties.periods[0];
    current = { ...(current ?? {}), description: first.shortForecast, tempF: first.temperature, windMph: parseInt(first.windSpeed) || null, icon: first.icon };
  }

  const alerts = (alertsRes.features ?? [])
    .map((f) => f.properties)
    .filter((a) => WINTER_EVENTS.test(a.event))
    .map((a) => ({
      id: a.id,
      event: a.event,
      severity: a.severity,
      headline: a.headline,
      description: a.description,
      instruction: a.instruction,
      ends: a.ends ?? a.expires,
    }));

  const next24h = snowfallSummary(grid.properties.snowfallAmount?.values, 24);
  const next48h = snowfallSummary(grid.properties.snowfallAmount?.values, 48);

  const result = {
    simulated: false,
    location: `${p.relativeLocation.properties.city}, ${p.relativeLocation.properties.state}`,
    timeZone: p.timeZone,
    current,
    alerts,
    snowfall: { next24h, next48h },
    forecast: forecast.properties.periods.slice(0, 8).map((f) => ({
      name: f.name,
      startTime: f.startTime,
      isDaytime: f.isDaytime,
      tempF: f.temperature,
      wind: `${f.windSpeed} ${f.windDirection}`,
      short: f.shortForecast,
      detailed: f.detailedForecast,
      precipChance: f.probabilityOfPrecipitation?.value ?? 0,
      icon: f.icon,
    })),
    stormLevel: stormLevel(alerts, next24h.inches),
  };
  return demoStorm ? simulatedOverlay(result) : result;
}

// Lightweight version used for pricing — never throws.
export async function getAlertsSafe(lat, lng) {
  try {
    return (await getConditions(lat, lng)).alerts;
  } catch {
    return demoStorm ? [{ event: 'Winter Storm Warning' }] : [];
  }
}

// US Census geocoder: free, no key, matches US street addresses.
export async function geocode(address) {
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoder unavailable');
  const data = await res.json();
  return (data.result?.addressMatches ?? []).slice(0, 5).map((m) => ({
    address: m.matchedAddress,
    lat: m.coordinates.y,
    lng: m.coordinates.x,
  }));
}
