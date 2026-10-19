import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH ?? resolve(here, '../data/plow.db');
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  role          TEXT NOT NULL CHECK (role IN ('customer','driver')),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  vehicle       TEXT,
  online        INTEGER NOT NULL DEFAULT 0,
  lat           REAL,
  lng           REAL,
  location_at   TEXT,
  rating_sum    INTEGER NOT NULL DEFAULT 0,
  rating_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS properties (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Home',
  address     TEXT NOT NULL,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  size        TEXT NOT NULL DEFAULT 'double' CHECK (size IN ('single','double','triple','large')),
  length      TEXT NOT NULL DEFAULT 'standard' CHECK (length IN ('short','standard','long')),
  sidewalk    INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id    INTEGER NOT NULL REFERENCES users(id),
  property_id    INTEGER NOT NULL REFERENCES properties(id),
  driver_id      INTEGER REFERENCES users(id),
  status         TEXT NOT NULL CHECK (status IN ('scheduled','requested','accepted','en_route','in_progress','completed','cancelled')),
  kind           TEXT NOT NULL DEFAULT 'asap' CHECK (kind IN ('asap','scheduled','storm_auto')),
  scheduled_for  TEXT,
  snow_depth_in  REAL NOT NULL DEFAULT 4,
  quote_json     TEXT NOT NULL,
  price_cents    INTEGER NOT NULL,
  tip_cents      INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'authorized',
  rating         INTEGER,
  review         TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  accepted_at    TEXT,
  started_at     TEXT,
  completed_at   TEXT,
  cancelled_at   TEXT
);
CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS jobs_driver ON jobs(driver_id);

CREATE TABLE IF NOT EXISTS storm_plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id       INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  threshold_in      REAL NOT NULL DEFAULT 2,
  active            INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (property_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  job_id     INTEGER,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Stripe charges against a job: the authorized job charge, plus any extra tip charges.
CREATE TABLE IF NOT EXISTS payments (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id            INTEGER NOT NULL REFERENCES jobs(id),
  kind              TEXT NOT NULL CHECK (kind IN ('job','tip')),
  payment_intent_id TEXT NOT NULL,
  charge_id         TEXT,
  amount_cents      INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('authorized','captured','voided','failed')),
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS payments_job ON payments(job_id);

-- Stripe Connect transfers owed to drivers. 'pending' until the driver finishes payout setup.
CREATE TABLE IF NOT EXISTS payouts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id       INTEGER NOT NULL REFERENCES jobs(id),
  driver_id    INTEGER NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  charge_id    TEXT NOT NULL,
  transfer_id  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  error        TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS payouts_driver ON payouts(driver_id, status);
`);

// Columns added after the first release. SQLite has no ADD COLUMN IF NOT EXISTS.
function addColumn(table, column, type) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column))
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
addColumn('users', 'stripe_customer_id', 'TEXT');
addColumn('users', 'stripe_account_id', 'TEXT');
addColumn('users', 'google_sub', 'TEXT');
addColumn('users', 'apple_sub', 'TEXT');
addColumn('jobs', 'card_label', 'TEXT');

export const nowIso = () => new Date().toISOString();
