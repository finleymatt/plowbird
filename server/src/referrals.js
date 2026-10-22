// Referrals: "Give $10, get $10", plus Snow Ranks for people who keep sharing.
//
// - Every customer has a code (MATT7K2). It works like a promo code for a new neighbor: $10 off
//   their first plow, new customers only, one per household (promos.js checks it). Share links
//   are plowbird.app/?promo=CODE&utm_source=referral, so the existing promo/attribution flow
//   applies it at checkout automatically.
// - A referral *qualifies* when the neighbor's first paid plow is completed. The referrer then
//   gets $10 in Plowbird credit, and milestone rewards at 3, 5 and 10 qualified referrals.
// - Credit comes off the next plow automatically (the driver is still paid in full; like promos,
//   Plowbird absorbs it). A cancelled plow gives its credit back.
import { randomInt } from 'node:crypto';
import { db, nowIso } from './db.js';
import { notify } from './jobs.js';

db.exec(`
CREATE TABLE IF NOT EXISTS referrals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id  INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up','qualified')),
  job_id       INTEGER,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  qualified_at TEXT
);
CREATE INDEX IF NOT EXISTS referrals_referrer ON referrals(referrer_id, status);

-- Plowbird credit ledger: + earned, − spent on a plow. Balance = SUM(amount_cents).
CREATE TABLE IF NOT EXISTS credits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  reason       TEXT NOT NULL,
  job_id       INTEGER,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS credits_user ON credits(user_id);

-- Non-cash rewards, e.g. a free month of Storm Pass, claimed when the customer picks a driveway.
CREATE TABLE IF NOT EXISTS rewards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('storm_pass_month')),
  milestone   INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','redeemed')),
  redeemed_at TEXT,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, milestone)
);
`);

function addColumn(table, column, type) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column))
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
addColumn('users', 'referral_code', 'TEXT');
addColumn('jobs', 'credit_cents', 'INTEGER NOT NULL DEFAULT 0'); // already taken off price_cents
addColumn('subscriptions', 'comp', 'INTEGER NOT NULL DEFAULT 0'); // a free month from a reward, no billing
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code ON users(referral_code)');

export const REFERRAL = {
  friendCents: 1000, // the neighbor's first plow
  referrerCents: 1000, // per qualified referral
  maxRewardedPerYear: 25, // fraud cap: credit stops after this many in 12 months (ranks keep counting)
  minChargeCents: 100, // credit never takes a plow below $1 (card processors need a real charge)
};

// Snow Ranks. `bonusCents` is credit on top of the per-referral $10; `reward` is a non-cash reward.
export const RANKS = [
  { at: 0, name: 'Snowflake', perk: 'Share your link to start earning.' },
  { at: 1, name: 'Flurry', perk: '$10 credit for every neighbor who books.' },
  { at: 3, name: 'Snowplow Scout', perk: '+$15 bonus credit.', bonusCents: 1500 },
  { at: 5, name: 'Storm Chaser', perk: 'A free month of Storm Pass.', reward: 'storm_pass_month' },
  { at: 10, name: 'Blizzard Boss', perk: 'Another free month of Storm Pass, and the Blizzard Boss badge.', reward: 'storm_pass_month' },
];

/* ---------------- codes ---------------- */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

// A customer's code, made on first use: up to 6 letters of their first name + 3 random characters.
export function referralCodeFor(userId) {
  const u = db.prepare('SELECT name, referral_code FROM users WHERE id = ?').get(userId);
  if (!u) return null;
  if (u.referral_code) return u.referral_code;
  const stem = (u.name.split(/\s+/)[0] ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'PLOW';
  for (let i = 0; i < 20; i++) {
    const code = stem + Array.from({ length: 3 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    if (db.prepare('SELECT 1 FROM promo_codes WHERE code = ?').get(code)) continue;
    const ok = db.prepare('UPDATE users SET referral_code = ? WHERE id = ? AND referral_code IS NULL').run(code, userId).changes;
    if (ok) return code;
    if (db.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId).referral_code) break; // raced
  }
  return db.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId).referral_code;
}

const ownerOf = (code) =>
  code ? db.prepare("SELECT id, name FROM users WHERE referral_code = ? COLLATE NOCASE AND role = 'customer'").get(String(code).trim()) : null;

// For promos.js: a referral code dressed as a promo row, or null when it isn't one.
// Throws (with the message to show) when it's the customer's own code.
export function referralPromo(code, customerId) {
  const owner = ownerOf(code);
  if (!owner) return null;
  if (customerId != null && owner.id === customerId) throw new Error('That’s your own referral code. Share it with a neighbor instead.');
  return {
    code: String(code).trim().toUpperCase(),
    amount_cents: REFERRAL.friendCents,
    label: `$10 off from ${owner.name.split(/\s+/)[0]}`,
    new_customers_only: 1,
    expires_at: null,
    active: 1,
    referrerId: owner.id,
  };
}

// A new customer arrived with a referral code (sign-up attribution, or their first order).
export function linkReferral(referredId, code) {
  const owner = ownerOf(code);
  if (!owner || owner.id === referredId) return false;
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(referredId);
  if (u?.role !== 'customer') return false;
  return !!db.prepare('INSERT OR IGNORE INTO referrals (referrer_id, referred_id, code) VALUES (?, ?, ?)').run(owner.id, referredId, String(code).trim().toUpperCase()).changes;
}

/* ---------------- credit ---------------- */

export const creditBalance = (userId) => db.prepare('SELECT COALESCE(SUM(amount_cents), 0) n FROM credits WHERE user_id = ?').get(userId).n;

// The quote with the customer's credit taken off (preview or for real). Never below $1.
export function applyCredit(quote, userId) {
  const room = Math.max(0, quote.total - REFERRAL.minChargeCents);
  const cents = Math.min(creditBalance(userId), room);
  if (cents <= 0) return quote;
  return {
    ...quote,
    lines: [...quote.lines, { label: 'Plowbird credit', cents: -cents }],
    total: quote.total - cents,
    credit: { cents },
  };
}

// Book the credit a new job used. Call right after inserting the job.
export function spendCredit(userId, jobId, cents) {
  if (cents > 0) db.prepare("INSERT INTO credits (user_id, amount_cents, reason, job_id) VALUES (?, ?, 'plow', ?)").run(userId, -cents, jobId);
}

// A cancelled job gives its credit back (once).
export function refundCredit(jobId) {
  const spent = db.prepare("SELECT user_id, -SUM(amount_cents) n FROM credits WHERE job_id = ? AND reason IN ('plow','refund') GROUP BY user_id").get(jobId);
  if (spent?.n > 0) db.prepare("INSERT INTO credits (user_id, amount_cents, reason, job_id) VALUES (?, ?, 'refund', ?)").run(spent.user_id, spent.n, jobId);
}

/* ---------------- qualifying + ranks ---------------- */

const qualifiedCount = (userId) => db.prepare("SELECT COUNT(*) n FROM referrals WHERE referrer_id = ? AND status = 'qualified'").get(userId).n;
export const rankFor = (n) => [...RANKS].reverse().find((r) => n >= r.at);
const firstName = (userId) => (db.prepare('SELECT name FROM users WHERE id = ?').get(userId)?.name ?? 'A neighbor').split(/\s+/)[0];

// Called when a job is completed. If it's a referred customer's first paid plow, the referral
// qualifies: $10 to the referrer, plus any milestone reward they just reached.
export function onJobCompleted(jobId) {
  const job = db.prepare('SELECT id, customer_id, covered, price_cents, promo_code, payment_status FROM jobs WHERE id = ?').get(jobId);
  // Only real, paid plows count: not Storm Pass plows, and not free card-less demo orders.
  if (!job || job.covered || job.price_cents <= 0 || job.payment_status !== 'captured') return;
  // Someone who already had an account and orders with a code for the first time.
  if (job.promo_code) linkReferral(job.customer_id, job.promo_code);
  const ref = db.prepare("SELECT * FROM referrals WHERE referred_id = ? AND status = 'signed_up'").get(job.customer_id);
  if (!ref) return;
  // Household check: a referrer can't earn from a plow at one of their own addresses.
  const sameHouse = db
    .prepare(
      `SELECT 1 FROM jobs j JOIN properties p ON p.id = j.property_id JOIN properties mine ON lower(trim(mine.address)) = lower(trim(p.address))
       WHERE j.id = ? AND mine.user_id = ?`,
    )
    .get(jobId, ref.referrer_id);
  if (sameHouse) return;
  const moved = db.prepare("UPDATE referrals SET status = 'qualified', job_id = ?, qualified_at = ? WHERE id = ? AND status = 'signed_up'").run(jobId, nowIso(), ref.id);
  if (!moved.changes) return;

  const yearAgo = new Date(Date.now() - 365 * 86400_000).toISOString();
  const rewardedThisYear = db.prepare("SELECT COUNT(*) n FROM credits WHERE user_id = ? AND reason = 'referral' AND created_at >= ?").get(ref.referrer_id, yearAgo).n;
  const neighbor = firstName(job.customer_id);
  if (rewardedThisYear < REFERRAL.maxRewardedPerYear) {
    db.prepare("INSERT INTO credits (user_id, amount_cents, reason, job_id) VALUES (?, ?, 'referral', ?)").run(ref.referrer_id, REFERRAL.referrerCents, jobId);
    notify(ref.referrer_id, 'You earned $10 ❄️', `${neighbor} just had their first plow with your code. $10 is on your account for your next plow.`);
  }

  const n = qualifiedCount(ref.referrer_id);
  const rank = RANKS.find((r) => r.at === n);
  if (!rank || rank.at === 0) return;
  if (rank.bonusCents)
    db.prepare("INSERT INTO credits (user_id, amount_cents, reason) VALUES (?, ?, 'milestone')").run(ref.referrer_id, rank.bonusCents);
  if (rank.reward) db.prepare('INSERT OR IGNORE INTO rewards (user_id, kind, milestone) VALUES (?, ?, ?)').run(ref.referrer_id, rank.reward, rank.at);
  if (rank.at > 1) notify(ref.referrer_id, `You’re a ${rank.name} 🏆`, `${n} neighbors have booked with your code. Unlocked: ${rank.perk}`);
}

/* ---------------- what the app shows ---------------- */

export function referralSummary(userId) {
  const code = referralCodeFor(userId);
  const rows = db
    .prepare(
      `SELECT r.status, r.created_at, r.qualified_at, u.name FROM referrals r JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = ? ORDER BY r.created_at DESC LIMIT 50`,
    )
    .all(userId);
  const qualified = rows.filter((r) => r.status === 'qualified').length;
  const rank = rankFor(qualified);
  const next = RANKS.find((r) => r.at > qualified) ?? null;
  return {
    code,
    friendCents: REFERRAL.friendCents,
    referrerCents: REFERRAL.referrerCents,
    creditCents: creditBalance(userId),
    earnedCents: db.prepare("SELECT COALESCE(SUM(amount_cents), 0) n FROM credits WHERE user_id = ? AND reason IN ('referral','milestone')").get(userId).n,
    qualified,
    pending: rows.length - qualified,
    rank: { name: rank.name, at: rank.at },
    next: next && { name: next.name, at: next.at, perk: next.perk, remaining: next.at - qualified },
    ranks: RANKS.map(({ at, name, perk }) => ({ at, name, perk })),
    // First name + last initial only: neighbors see who joined, not their details.
    neighbors: rows.map((r) => {
      const [first, last] = r.name.split(/\s+/);
      return { name: `${first}${last ? ` ${last[0]}.` : ''}`, status: r.status, at: r.qualified_at ?? r.created_at };
    }),
    rewards: db
      .prepare('SELECT id, kind, milestone, status, redeemed_at, note FROM rewards WHERE user_id = ? ORDER BY milestone')
      .all(userId)
      .map((r) => ({ id: r.id, kind: r.kind, milestone: r.milestone, status: r.status, redeemedAt: r.redeemed_at, note: r.note })),
  };
}

// "Which town is winning?": qualified referrals by the referrer's city, last 12 months. Public,
// aggregate only. The city is the second-to-last part of the first saved address.
export function cityLeaderboard() {
  const rows = db
    .prepare(
      `SELECT (SELECT address FROM properties p WHERE p.user_id = r.referrer_id ORDER BY p.id LIMIT 1) address
       FROM referrals r WHERE r.status = 'qualified' AND r.qualified_at >= ?`,
    )
    .all(new Date(Date.now() - 365 * 86400_000).toISOString());
  const counts = new Map();
  for (const { address } of rows) {
    const parts = String(address ?? '').split(',').map((s) => s.trim());
    const city = parts.length >= 3 ? parts[parts.length - 2].replace(/\s+(MN|SD)(\s+\d{5})?$/i, '') : null;
    if (city && !/^\d/.test(city)) counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts].map(([city, referrals]) => ({ city, referrals })).sort((a, b) => b.referrals - a.referrals).slice(0, 8);
}
