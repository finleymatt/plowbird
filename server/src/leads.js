// Waitlist / storm alerts, and where people came from.
//
// - leads: anyone who left an email (landing "storm alerts" signup, the waitlist shown outside
//   the pilot area, customers whose order timed out with no driver). One row per email.
// - users.utm_*: first-touch attribution the web app saved on first load (app lib/attribution.ts),
//   sent with sign-up.
// - /admin/leads.csv and /admin/sources for staff (ADMIN_EMAILS, see admin.js).
import { Router } from 'express';
import { db, nowIso } from './db.js';
import { requireAdmin } from './admin.js';
import { optionalAuth, requireAuth } from './auth.js';
import { zipFromText } from './service-area.js';

db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone        TEXT,
  address      TEXT,
  zip          TEXT,
  lat          REAL,
  lng          REAL,
  source       TEXT NOT NULL DEFAULT 'landing',
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  promo        TEXT,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT
);
CREATE INDEX IF NOT EXISTS leads_zip ON leads(zip);
`);

// db.js has the same helper; kept local so this module stays self-contained.
function addColumn(table, column, type) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column))
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
for (const c of ['utm_source', 'utm_medium', 'utm_campaign', 'promo']) addColumn('users', c, 'TEXT');

const clip = (v, n) => {
  const s = typeof v === 'string' ? v.trim().slice(0, n) : '';
  return s || null;
};

// { utm_source, utm_medium, utm_campaign, promo } from the app, cleaned up.
export function cleanAttribution(a) {
  if (!a || typeof a !== 'object') return {};
  return {
    utm_source: clip(a.utm_source, 100)?.toLowerCase() ?? null,
    utm_medium: clip(a.utm_medium, 100)?.toLowerCase() ?? null,
    utm_campaign: clip(a.utm_campaign, 100) ?? null,
    promo: clip(a.promo, 32)?.toUpperCase().replace(/[^A-Z0-9_-]/g, '') || null,
  };
}

// A new account: keep where it came from. Without any utm from the app, fall back to the
// waitlist row for the same email (they signed up for alerts first, then ordered).
export function recordSignupSource(userId, attribution) {
  const a = cleanAttribution(attribution);
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
  if (!user) return;
  const lead = db.prepare('SELECT * FROM leads WHERE email = ?').get(user.email);
  const pick = (k) => a[k] ?? lead?.[k] ?? null;
  db.prepare(
    'UPDATE users SET utm_source = COALESCE(utm_source, ?), utm_medium = COALESCE(utm_medium, ?), utm_campaign = COALESCE(utm_campaign, ?), promo = COALESCE(promo, ?) WHERE id = ?',
  ).run(pick('utm_source'), pick('utm_medium'), pick('utm_campaign'), pick('promo'), userId);
  if (lead) db.prepare('UPDATE leads SET user_id = COALESCE(user_id, ?) WHERE id = ?').run(userId, lead.id);
}

export const validEmail = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

// Add or update a waitlist entry. Attribution and source stay first-touch; contact details fill in.
export function addLead({ email, phone, address, zip, lat, lng, source = 'landing', attribution, userId = null }) {
  const a = cleanAttribution(attribution);
  const existed = !!db.prepare('SELECT 1 FROM leads WHERE email = ?').get(email.trim());
  db.prepare(
    `INSERT INTO leads (email, phone, address, zip, lat, lng, source, utm_source, utm_medium, utm_campaign, promo, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       phone = COALESCE(excluded.phone, phone), address = COALESCE(excluded.address, address),
       zip = COALESCE(excluded.zip, zip), lat = COALESCE(excluded.lat, lat), lng = COALESCE(excluded.lng, lng),
       user_id = COALESCE(user_id, excluded.user_id), updated_at = ?`,
  ).run(
    email.trim(),
    clip(phone, 40),
    clip(address, 200),
    (typeof zip === 'string' && /^\d{5}$/.test(zip.trim()) ? zip.trim() : null) ?? zipFromText(address),
    Number.isFinite(Number(lat)) && lat !== null && lat !== '' ? Number(lat) : null,
    Number.isFinite(Number(lng)) && lng !== null && lng !== '' ? Number(lng) : null,
    /^[a-z_]{1,32}$/.test(source) ? source : 'other',
    a.utm_source ?? null,
    a.utm_medium ?? null,
    a.utm_campaign ?? null,
    a.promo ?? null,
    userId,
    nowIso(),
  );
  return { created: !existed };
}

// Per-IP limit for the public signup form: 5 per 10 minutes.
const hits = new Map();
function rateLimited(ip, max = 5, windowMs = 10 * 60_000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => t > now - windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.at(-1) < now - windowMs) hits.delete(k);
  return recent.length > max;
}

// Spreadsheet-safe CSV cell: quoted, and formulas (=, +, -, @) defused.
const cell = (v) => {
  if (v == null) return '';
  const s = /^[=+\-@\t\r]/.test(String(v)) ? `'${v}` : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const leadsApi = Router();

leadsApi.post('/leads', optionalAuth, (req, res) => {
  if (rateLimited(req.ip ?? 'unknown')) return res.status(429).json({ error: 'Too many signups from here. Try again in a few minutes.' });
  const { email, phone, address, zip, lat, lng, source, attribution } = req.body ?? {};
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email' });
  const { created } = addLead({ email, phone, address, zip, lat, lng, source: String(source ?? 'landing'), attribution, userId: req.user?.id ?? null });
  res.json({ ok: true, created });
});

const LEAD_COLUMNS = ['id', 'email', 'phone', 'address', 'zip', 'source', 'utm_source', 'utm_medium', 'utm_campaign', 'promo', 'user_id', 'created_at'];

leadsApi.get('/admin/leads.csv', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT ${LEAD_COLUMNS.join(', ')} FROM leads ORDER BY id`).all();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="plowbird-leads-${nowIso().slice(0, 10)}.csv"`);
  res.send([LEAD_COLUMNS.join(','), ...rows.map((r) => LEAD_COLUMNS.map((c) => cell(r[c])).join(','))].join('\n') + '\n');
});

// Sign-ups, leads and jobs per utm_source (or ?by=medium / campaign). "(direct)" = no utm.
leadsApi.get('/admin/sources', requireAuth, requireAdmin, (req, res) => {
  const col = { medium: 'utm_medium', campaign: 'utm_campaign' }[req.query.by] ?? 'utm_source';
  const key = (alias) => `COALESCE(${alias}.${col}, '(direct)')`;
  const out = new Map();
  const row = (k) => {
    if (!out.has(k)) out.set(k, { [col]: k, customers: 0, drivers: 0, leads: 0, jobs: 0, completedJobs: 0, revenueCents: 0 });
    return out.get(k);
  };
  for (const r of db.prepare(`SELECT ${key('u')} k, role, COUNT(*) n FROM users u GROUP BY k, role`).all())
    row(r.k)[r.role === 'driver' ? 'drivers' : 'customers'] = r.n;
  for (const r of db.prepare(`SELECT ${key('l')} k, COUNT(*) n FROM leads l GROUP BY k`).all()) row(r.k).leads = r.n;
  for (const r of db
    .prepare(
      `SELECT ${key('u')} k, COUNT(*) n, SUM(j.status = 'completed') done, SUM(CASE WHEN j.status = 'completed' THEN j.price_cents ELSE 0 END) cents
       FROM jobs j JOIN users u ON u.id = j.customer_id WHERE j.status != 'cancelled' GROUP BY k`,
    )
    .all())
    Object.assign(row(r.k), { jobs: r.n, completedJobs: r.done ?? 0, revenueCents: r.cents ?? 0 });
  res.json([...out.values()].sort((a, b) => b.customers + b.leads + b.jobs - (a.customers + a.leads + a.jobs)));
});
