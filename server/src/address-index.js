// Instant address type-ahead from our own index of every addressable street segment in
// Minnesota and South Dakota (US Census TIGER/Line "address features": street names, house-number
// ranges and ZIP codes, the same data the Census geocoder uses). Lookups are a local SQLite query,
// a few milliseconds, instead of a round trip to a geocoding service on every keystroke.
//
// Built once in the background on first boot (~78 MB of downloads, a minute or two) into
// ADDRESS_DB_PATH (default: next to the main database). Until it's ready, geo.js falls back to Photon.
// ZIP → city names come from GeoNames (CC BY 4.0).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const here = dirname(fileURLToPath(import.meta.url));
const mainDb = process.env.DB_PATH ?? resolve(here, '../data/plow.db');
const dbPath = process.env.ADDRESS_DB_PATH ?? resolve(dirname(mainDb), 'addresses.db');
const TIGER = 'https://www2.census.gov/geo/tiger/TIGER2024/ADDRFEAT/';
const STATES = { 27: 'MN', 46: 'SD' };
const GEONAMES = 'https://download.geonames.org/export/zip/US.zip';
const UA = process.env.NWS_USER_AGENT ?? 'Plowbird/1.0 (dev)';

mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS seg (
  core TEXT NOT NULL,   -- street name without directions/type, e.g. LYNDALE, 2ND
  full TEXT NOT NULL,   -- as written, e.g. Lyndale Ave S
  zip  TEXT NOT NULL,
  lo   INTEGER NOT NULL,
  hi   INTEGER NOT NULL,
  parity TEXT,          -- O odd, E even, B both
  from_hn INTEGER NOT NULL, to_hn INTEGER NOT NULL,  -- in drawing order, for placing a house
  x1 REAL, y1 REAL, x2 REAL, y2 REAL
);
CREATE INDEX IF NOT EXISTS seg_core ON seg(core);
CREATE TABLE IF NOT EXISTS zips (zip TEXT PRIMARY KEY, city TEXT NOT NULL, state TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
`);

let ready = !!db.prepare("SELECT v FROM meta WHERE k = 'built'").get();
export const addressIndexReady = () => ready;

/* ---------------- street-name normalization ---------------- */

const DIRS = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW', 'NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTHEAST', 'NORTHWEST', 'SOUTHEAST', 'SOUTHWEST']);
const TYPES = new Set([
  'ST', 'STREET', 'AVE', 'AV', 'AVENUE', 'RD', 'ROAD', 'DR', 'DRIVE', 'LN', 'LANE', 'CT', 'COURT', 'PL', 'PLACE', 'BLVD', 'BOULEVARD',
  'PKWY', 'PARKWAY', 'CIR', 'CIRCLE', 'TRL', 'TRAIL', 'WAY', 'TER', 'TERRACE', 'HWY', 'HIGHWAY', 'LOOP', 'PATH', 'ROW', 'XING', 'SQ', 'PT', 'ALY', 'BND', 'CV', 'RUN',
]);
const words = (s) => s.toUpperCase().replace(/[.,#']/g, ' ').split(/\s+/).filter(Boolean);

// "N 2nd St" → "2ND", "Lyndale Ave S" → "LYNDALE", "County Rd 81" stays "COUNTY RD 81".
export function coreName(full) {
  const w = words(full);
  let a = 0;
  let b = w.length;
  if (b - a > 1 && DIRS.has(w[a])) a++;
  if (b - a > 1 && DIRS.has(w[b - 1])) b--;
  if (b - a > 1 && TYPES.has(w[b - 1]) && !/^\d+$/.test(w[b - 2] ?? '')) b--;
  return w.slice(a, b).join(' ');
}

/* ---------------- building the index ---------------- */

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function readDbf(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const count = v.getUint32(4, true);
  const headerLen = v.getUint16(8, true);
  const recLen = v.getUint16(10, true);
  const fields = [];
  for (let o = 32; buf[o] !== 0x0d; o += 32) {
    let name = '';
    for (let i = 0; i < 11 && buf[o + i]; i++) name += String.fromCharCode(buf[o + i]);
    fields.push({ name, len: buf[o + 16] });
  }
  const dec = new TextDecoder('latin1');
  return {
    count,
    get(i, want) {
      const out = {};
      let p = headerLen + i * recLen + 1;
      for (const f of fields) {
        if (want.has(f.name)) out[f.name] = dec.decode(buf.subarray(p, p + f.len)).trim();
        p += f.len;
      }
      return out;
    },
  };
}

// First and last point of each polyline, in record order.
function readShpEnds(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const ends = [];
  let o = 100;
  while (o + 8 <= buf.byteLength) {
    const len = v.getInt32(o + 4) * 2; // big-endian, 16-bit words
    const c = o + 8;
    const type = v.getInt32(c, true);
    if (type === 0) ends.push(null);
    else {
      const parts = v.getInt32(c + 36, true);
      const points = v.getInt32(c + 40, true);
      const pts = c + 44 + parts * 4;
      const last = pts + (points - 1) * 16;
      ends.push([v.getFloat64(pts, true), v.getFloat64(pts + 8, true), v.getFloat64(last, true), v.getFloat64(last + 8, true)]);
    }
    o = c + len;
  }
  return ends;
}

const WANT = new Set(['FULLNAME', 'LFROMHN', 'LTOHN', 'RFROMHN', 'RTOHN', 'ZIPL', 'ZIPR', 'PARITYL', 'PARITYR']);
const insertSeg = db.prepare('INSERT INTO seg (core, full, zip, lo, hi, parity, from_hn, to_hn, x1, y1, x2, y2) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');

function loadCounty(zipBytes) {
  const files = unzipSync(zipBytes, { filter: (f) => f.name.endsWith('.dbf') || f.name.endsWith('.shp') });
  const dbf = readDbf(files[Object.keys(files).find((n) => n.endsWith('.dbf'))]);
  const ends = readShpEnds(files[Object.keys(files).find((n) => n.endsWith('.shp'))]);
  let rows = 0;
  db.exec('BEGIN');
  try {
    for (let i = 0; i < dbf.count; i++) {
      const r = dbf.get(i, WANT);
      const e = ends[i];
      if (!r.FULLNAME || !e) continue;
      const core = coreName(r.FULLNAME);
      for (const [from, to, zip, parity] of [
        [r.LFROMHN, r.LTOHN, r.ZIPL, r.PARITYL],
        [r.RFROMHN, r.RTOHN, r.ZIPR, r.PARITYR],
      ]) {
        const a = Number(from);
        const b = Number(to);
        // Skip sides with no numbers, or with letters/fractions (rare; the fallback handles them).
        if (!zip || !from || !to || !Number.isInteger(a) || !Number.isInteger(b)) continue;
        insertSeg.run(core, r.FULLNAME, zip, Math.min(a, b), Math.max(a, b), parity || 'B', a, b, e[0], e[1], e[2], e[3]);
        rows++;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return rows;
}

function loadZips(zipBytes) {
  const files = unzipSync(zipBytes, { filter: (f) => f.name === 'US.txt' });
  const text = new TextDecoder().decode(files['US.txt']);
  const ins = db.prepare('INSERT OR REPLACE INTO zips (zip, city, state) VALUES (?, ?, ?)');
  db.exec('BEGIN');
  for (const line of text.split('\n')) {
    const c = line.split('\t');
    // country, zip, place, state name, state code, … (neighbors too: border towns use their ZIPs)
    if (c.length > 4 && ['MN', 'SD', 'ND', 'IA', 'WI', 'NE'].includes(c[4])) ins.run(c[1], c[2], c[4]);
  }
  db.exec('COMMIT');
}

let building = null;
export function buildAddressIndex() {
  if (ready || building) return building;
  building = (async () => {
    const started = Date.now();
    db.exec('DELETE FROM seg; DELETE FROM zips;');
    loadZips(await download(GEONAMES));
    const listing = new TextDecoder().decode(await download(TIGER));
    const names = [...new Set(listing.match(/tl_2024_(27|46)\d{3}_addrfeat\.zip/g))];
    let rows = 0;
    for (const [i, name] of names.entries()) {
      rows += loadCounty(await download(TIGER + name));
      if (i % 20 === 19) console.log(`address index: ${i + 1}/${names.length} counties, ${rows} ranges`);
      await new Promise((r) => setImmediate(r)); // let requests through between counties
    }
    db.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('built', ?)").run(new Date().toISOString());
    ready = true;
    console.log(`address index ready: ${names.length} counties, ${rows} ranges in ${Math.round((Date.now() - started) / 1000)} s`);
  })()
    .catch((e) => console.error('address index build failed (Photon stays in use):', e.message))
    .finally(() => (building = null));
  return building;
}

/* ---------------- lookups ---------------- */

const ABBREV = {
  N: 'NORTH', S: 'SOUTH', E: 'EAST', W: 'WEST', NE: 'NORTHEAST', NW: 'NORTHWEST', SE: 'SOUTHEAST', SW: 'SOUTHWEST',
  ST: 'STREET', AVE: 'AVENUE', RD: 'ROAD', DR: 'DRIVE', LN: 'LANE', CT: 'COURT', PL: 'PLACE', BLVD: 'BOULEVARD', PKWY: 'PARKWAY', CIR: 'CIRCLE', HWY: 'HIGHWAY', TRL: 'TRAIL',
};
// Every typed word must start some word of the candidate ("lyn" ~ Lyndale, "s" ~ S, "minn" ~ Minneapolis).
function matches(typed, hay) {
  const h = words(hay);
  const long = h.map((x) => ABBREV[x] ?? x);
  return typed.every((t) => h.some((x) => x.startsWith(t)) || long.some((x) => x.startsWith(ABBREV[t] ?? t)));
}

const byCore = db.prepare(`
  SELECT s.*, z.city, z.state FROM seg s LEFT JOIN zips z ON z.zip = s.zip
  WHERE s.core >= ? AND s.core < ? AND (? IS NULL OR (s.lo <= ? AND s.hi >= ?))
  LIMIT 3000`);
// Same, closest first, so a short prefix ("350 S…") still finds the streets near the user.
const byCoreNear = db.prepare(`
  SELECT s.*, z.city, z.state FROM seg s LEFT JOIN zips z ON z.zip = s.zip
  WHERE s.core >= ? AND s.core < ? AND (? IS NULL OR (s.lo <= ? AND s.hi >= ?))
  ORDER BY (s.y1 - ?) * (s.y1 - ?) * 1.9 + (s.x1 - ?) * (s.x1 - ?)
  LIMIT 3000`);

const pretty = (s) => s.replace(/\b(\d+)(ST|ND|RD|TH)\b/gi, (_, n, x) => n + x.toLowerCase());
const miles2 = (a, b) => ((a.lat - b.lat) * 69) ** 2 + ((a.lng - b.lng) * 49) ** 2;

// Suggestions for "4100 lyndale ave s minn" (or just "lyndale"). Null while the index isn't built.
export function searchAddressIndex(raw, near) {
  if (!ready) return null;
  const q = String(raw).trim().replace(/\s+/g, ' ');
  const m = q.match(/^(\d+)[a-z]?\s+(.+)$/i);
  const number = m ? Number(m[1]) : null;
  const typed = words(m ? m[2] : q);
  // The street's own name is the first word that isn't a direction ("n 2nd" → 2ND). Mid-typing
  // ("350 s", "1234 l") the only word may be a letter or a direction: use it as the start of the name.
  const lead = typed.find((t) => !DIRS.has(t)) ?? typed.at(-1);
  if (!lead || (lead.length < 2 && number == null)) return [];

  const range = [lead, `${lead}￿`, number, number, number];
  const rows = near ? byCoreNear.all(...range, near.lat, near.lat, near.lng, near.lng) : byCore.all(...range);
  const out = new Map();
  for (const r of rows) {
    if (number != null && ((r.parity === 'O' && number % 2 === 0) || (r.parity === 'E' && number % 2 === 1))) continue;
    if (!matches(typed, `${r.full} ${r.city ?? ''} ${r.state ?? ''} ${r.zip}`)) continue;
    const t = number == null || r.from_hn === r.to_hn ? 0.5 : (number - r.from_hn) / (r.to_hn - r.from_hn);
    const lng = r.x1 + (r.x2 - r.x1) * t;
    const lat = r.y1 + (r.y2 - r.y1) * t;
    // One row per house (number typed) or per street per town (no number yet).
    const key = number != null ? `${r.full}|${r.zip}` : `${r.full}|${r.city ?? r.zip}`;
    const prev = out.get(key);
    const score = (r.core === lead ? 0 : 1000) + (near ? miles2({ lat, lng }, near) : 0);
    if (prev && prev.score <= score) continue;
    const line1 = pretty(number != null ? `${number} ${r.full}` : r.full);
    const line2 = `${r.city ?? 'MN'}, ${r.state ?? ''} ${r.zip}`.replace(' ,', ',').replace(/\s+/g, ' ').trim();
    out.set(key, { score, line1, line2, text: `${line1}, ${line2}`, lat, lng, needsNumber: number == null, exact: number != null });
  }
  return [...out.values()].sort((a, b) => a.score - b.score).slice(0, 6).map(({ score, ...s }) => s);
}
