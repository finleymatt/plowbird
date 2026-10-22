// Outreach tracker for staff (/admin → Outreach): the people and places we're working on, in four
// lists, each with its own pipeline. Seeded on boot from seed-data/outreach.json (built from the
// CSVs in marketing/outreach/ by scripts/build-outreach-seed.js); rows are keyed by list + name, so
// a new seed only adds rows and never overwrites edits made in /admin.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { requireAdmin } from './admin.js';
import { requireAuth } from './auth.js';
import { db, nowIso } from './db.js';

export const LISTS = {
  driver: {
    label: 'Drivers',
    hint: 'Plow operators and landscapers to recruit',
    statuses: ['new', 'contacted', 'interested', 'applied', 'approved', 'not_interested'],
  },
  partner: {
    label: 'Partners',
    hint: 'HOAs, neighborhood groups and chambers that can reach homeowners',
    statuses: ['new', 'contacted', 'in_talks', 'running', 'declined'],
  },
  flyer: {
    label: 'Flyers & events',
    hint: 'Boards, libraries, schools and events to post or show up at',
    statuses: ['to_do', 'posted', 'refresh_due', 'not_allowed', 'done'],
  },
  commercial: {
    label: 'Commercial lots',
    hint: 'Small business parking lots: offices, clinics, daycares, churches',
    statuses: ['new', 'contacted', 'site_visit', 'quoted', 'won', 'lost'],
  },
};
// Statuses that end the pipeline: hidden from "due" follow-ups.
const CLOSED = new Set(['approved', 'not_interested', 'declined', 'not_allowed', 'done', 'won', 'lost']);

db.exec(`
CREATE TABLE IF NOT EXISTS outreach (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  list              TEXT NOT NULL,
  seed_key          TEXT UNIQUE,
  name              TEXT NOT NULL,
  category          TEXT,
  city              TEXT,
  area              TEXT,
  address           TEXT,
  contact           TEXT,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  status            TEXT NOT NULL,
  owner             TEXT,
  follow_up         TEXT,
  last_contacted_at TEXT,
  notes             TEXT,
  details           TEXT,
  source            TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at        TEXT,
  updated_by        TEXT
);
CREATE INDEX IF NOT EXISTS outreach_list ON outreach(list, status);

CREATE TABLE IF NOT EXISTS outreach_activity (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  outreach_id INTEGER NOT NULL REFERENCES outreach(id) ON DELETE CASCADE,
  author      TEXT,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS outreach_activity_row ON outreach_activity(outreach_id);
`);

const keyOf = (list, name) => `${list}:${String(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;

// Load the seed (once per new row).
export function seedOutreach() {
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '../seed-data/outreach.json');
  if (!existsSync(file)) return 0;
  const insert = db.prepare(
    `INSERT OR IGNORE INTO outreach (list, seed_key, name, category, city, area, address, contact, phone, email, website, status, notes, details, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  let added = 0;
  for (const r of JSON.parse(readFileSync(file, 'utf8'))) {
    if (!LISTS[r.list] || !r.name) continue;
    added += insert.run(
      r.list, keyOf(r.list, r.name), r.name, r.category ?? null, r.city ?? null, r.area ?? null, r.address ?? null, r.contact ?? null,
      r.phone ?? null, r.email ?? null, r.website ?? null, LISTS[r.list].statuses[0], r.notes ?? null,
      r.details ? JSON.stringify(r.details) : null, r.source ?? null,
    ).changes;
  }
  return added;
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD

const rowOut = (r) => ({
  id: r.id,
  list: r.list,
  name: r.name,
  category: r.category,
  city: r.city,
  area: r.area,
  address: r.address,
  contact: r.contact,
  phone: r.phone,
  email: r.email,
  website: r.website,
  status: r.status,
  owner: r.owner,
  followUp: r.follow_up,
  lastContactedAt: r.last_contacted_at,
  notes: r.notes,
  details: r.details ? JSON.parse(r.details) : {},
  source: r.source,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  updatedBy: r.updated_by,
  activityCount: r.activity_count ?? 0,
});

const staffName = (req) => db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id)?.name?.split(/\s+/)[0] ?? 'Staff';

const FIELDS = ['name', 'category', 'city', 'area', 'address', 'contact', 'phone', 'email', 'website', 'owner', 'notes'];
const text = (v, n = 500) => (v == null ? null : String(v).trim().slice(0, n) || null);

export const outreachApi = Router();

outreachApi.get('/admin/outreach/meta', requireAuth, requireAdmin, (req, res) => {
  const counts = db.prepare('SELECT list, status, COUNT(*) n FROM outreach GROUP BY list, status').all();
  const due = db
    .prepare(`SELECT list, COUNT(*) n FROM outreach WHERE follow_up IS NOT NULL AND follow_up <= ? AND status NOT IN (${[...CLOSED].map(() => '?').join(',')}) GROUP BY list`)
    .all(today(), ...CLOSED);
  res.json({
    lists: Object.entries(LISTS).map(([key, l]) => ({
      key,
      ...l,
      total: counts.filter((c) => c.list === key).reduce((s, c) => s + c.n, 0),
      byStatus: Object.fromEntries(l.statuses.map((s) => [s, counts.find((c) => c.list === key && c.status === s)?.n ?? 0])),
      due: due.find((d) => d.list === key)?.n ?? 0,
    })),
    today: today(),
  });
});

// ?list=driver&status=contacted&q=text&due=1
outreachApi.get('/admin/outreach', requireAuth, requireAdmin, (req, res) => {
  const list = LISTS[req.query.list] ? req.query.list : 'driver';
  const status = LISTS[list].statuses.includes(req.query.status) ? req.query.status : null;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const like = `%${q}%`;
  const rows = db
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM outreach_activity a WHERE a.outreach_id = o.id) activity_count FROM outreach o
       WHERE list = ? AND (? IS NULL OR status = ?)
         AND (? = '' OR name LIKE ? OR city LIKE ? OR area LIKE ? OR category LIKE ? OR notes LIKE ? OR contact LIKE ?)
         AND (? = 0 OR (follow_up IS NOT NULL AND follow_up <= ?))
       ORDER BY CASE WHEN follow_up IS NOT NULL AND follow_up <= ? THEN 0 ELSE 1 END, follow_up IS NULL, follow_up, updated_at IS NULL, updated_at DESC, name
       LIMIT 1000`,
    )
    .all(list, status, status, q, like, like, like, like, like, like, req.query.due === '1' ? 1 : 0, today(), today());
  res.json(rows.map(rowOut));
});

outreachApi.post('/admin/outreach', requireAuth, requireAdmin, (req, res) => {
  const b = req.body ?? {};
  const list = LISTS[b.list] ? b.list : null;
  if (!list) return res.status(400).json({ error: 'Pick a list' });
  if (!text(b.name)) return res.status(400).json({ error: 'Name is required' });
  const status = LISTS[list].statuses.includes(b.status) ? b.status : LISTS[list].statuses[0];
  const info = db
    .prepare(
      `INSERT INTO outreach (list, name, category, city, area, address, contact, phone, email, website, owner, notes, status, follow_up, source, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'added in admin', ?, ?)`,
    )
    .run(list, ...FIELDS.map((f) => text(b[f], f === 'notes' ? 4000 : 300)), status, /^\d{4}-\d{2}-\d{2}$/.test(b.followUp ?? '') ? b.followUp : null, nowIso(), staffName(req));
  res.json(rowOut(db.prepare('SELECT * FROM outreach WHERE id = ?').get(info.lastInsertRowid)));
});

// Save edits. Only the fields sent change. A status change is logged in the activity.
outreachApi.patch('/admin/outreach/:id', requireAuth, requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM outreach WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const b = req.body ?? {};
  const sets = [];
  const vals = [];
  for (const f of FIELDS)
    if (f in b) {
      if (f === 'name' && !text(b.name)) return res.status(400).json({ error: 'Name is required' });
      sets.push(`${f} = ?`), vals.push(text(b[f], f === 'notes' ? 4000 : 300));
    }
  if ('followUp' in b) {
    if (b.followUp && !/^\d{4}-\d{2}-\d{2}$/.test(b.followUp)) return res.status(400).json({ error: 'Follow-up date must be YYYY-MM-DD' });
    sets.push('follow_up = ?'), vals.push(b.followUp || null);
  }
  const who = staffName(req);
  if ('status' in b && b.status !== row.status) {
    if (!LISTS[row.list].statuses.includes(b.status)) return res.status(400).json({ error: 'Unknown status' });
    sets.push('status = ?'), vals.push(b.status);
    if (b.status !== LISTS[row.list].statuses[0]) sets.push('last_contacted_at = ?'), vals.push(nowIso());
    db.prepare('INSERT INTO outreach_activity (outreach_id, author, body) VALUES (?, ?, ?)').run(row.id, who, `Status: ${row.status.replace(/_/g, ' ')} → ${b.status.replace(/_/g, ' ')}`);
  }
  if (sets.length) db.prepare(`UPDATE outreach SET ${sets.join(', ')}, updated_at = ?, updated_by = ? WHERE id = ?`).run(...vals, nowIso(), who, row.id);
  res.json(rowOut(db.prepare('SELECT o.*, (SELECT COUNT(*) FROM outreach_activity a WHERE a.outreach_id = o.id) activity_count FROM outreach o WHERE id = ?').get(row.id)));
});

outreachApi.delete('/admin/outreach/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM outreach WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

outreachApi.get('/admin/outreach/:id/activity', requireAuth, requireAdmin, (req, res) => {
  res.json(
    db
      .prepare('SELECT id, author, body, created_at createdAt FROM outreach_activity WHERE outreach_id = ? ORDER BY id DESC LIMIT 200')
      .all(req.params.id),
  );
});

// Log a call, email or note. Logging counts as contact.
outreachApi.post('/admin/outreach/:id/activity', requireAuth, requireAdmin, (req, res) => {
  const body = text(req.body?.body, 2000);
  if (!body) return res.status(400).json({ error: 'Write a note' });
  const row = db.prepare('SELECT id FROM outreach WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const who = staffName(req);
  db.prepare('INSERT INTO outreach_activity (outreach_id, author, body) VALUES (?, ?, ?)').run(row.id, who, body);
  db.prepare('UPDATE outreach SET last_contacted_at = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(nowIso(), nowIso(), who, row.id);
  res.json({ ok: true });
});

// Public "recommend a driver" form (/driver-demo, /drive): lands in the Drivers list as new.
export function addRecommendedDriver({ driverName, phone, email, area, notes, byName, byContact }) {
  const info = db
    .prepare(
      `INSERT INTO outreach (list, name, category, area, phone, email, status, notes, source, updated_at, updated_by)
       VALUES ('driver', ?, 'recommended', ?, ?, ?, 'new', ?, 'recommended on site', ?, 'Website')`,
    )
    .run(driverName, area, phone, email, notes, nowIso());
  const id = Number(info.lastInsertRowid);
  db.prepare('INSERT INTO outreach_activity (outreach_id, author, body) VALUES (?, ?, ?)').run(
    id,
    'Website',
    `Recommended by ${byName || 'someone who didn’t leave a name'}${byContact ? ` (${byContact})` : ''}`,
  );
  return id;
}
