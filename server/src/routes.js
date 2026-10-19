import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { db, nowIso } from './db.js';
import { hashPassword, verifyPassword, signToken, requireAuth, requireRole } from './auth.js';
import { quote, surgeMultiplier } from './pricing.js';
import { getConditions, getAlertsSafe, geocode, setDemoStorm, isDemoStorm } from './weather.js';
import { checkStormPlans } from './scheduler.js';
import { resolveAddress, suggestAddresses } from './geo.js';
import { drivingRoute } from './routing.js';
import { getTicker } from './ticker.js';
import { SocialError, socialConfig, verifySocialToken } from './social.js';
import {
  ACTIVE_STATUSES,
  DISPATCH_LEAD_MIN,
  broadcastJob,
  getIo,
  getJob,
  listJobs,
  marketPressure,
  milesBetween,
  notify,
} from './jobs.js';
import {
  authorizeJob,
  chargeExtraTip,
  createCardSetup,
  finishCardSetup,
  paymentsMode,
  payoutDashboardLink,
  payoutOnboardingLink,
  payoutStatus,
  savedCard,
  settleJob,
  voidJob,
} from './payments.js';

export const api = Router();

const SIZES = ['single', 'double', 'triple', 'large'];
const LENGTHS = ['short', 'standard', 'long'];

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

function publicUser(u) {
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    phone: u.phone,
    vehicle: u.vehicle,
    online: !!u.online,
    lat: u.lat,
    lng: u.lng,
    rating: u.rating_count ? Math.round((u.rating_sum / u.rating_count) * 10) / 10 : null,
    ratingCount: u.rating_count,
  };
}

const serializeProperty = (p) => ({ ...p, sidewalk: !!p.sidewalk, user_id: undefined, userId: p.user_id });

async function priceFor(property, depthIn) {
  const alerts = await getAlertsSafe(property.lat, property.lng);
  const surge = surgeMultiplier({ alerts, ...marketPressure() });
  return quote(property, { depthIn, surge });
}

/* ---------------- auth ---------------- */

api.post('/auth/register', (req, res) => {
  const { role, name, email, password, phone, vehicle } = req.body ?? {};
  if (!['customer', 'driver'].includes(role)) return bad(res, 'Choose customer or driver');
  if (!name?.trim() || !email?.includes('@')) return bad(res, 'Name and a valid email are required');
  if (!password || password.length < 8) return bad(res, 'Password must be at least 8 characters');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return bad(res, 'That email already has an account', 409);
  const info = db
    .prepare('INSERT INTO users (role, name, email, phone, password_hash, vehicle) VALUES (?, ?, ?, ?, ?, ?)')
    .run(role, name.trim(), email.trim(), phone ?? null, hashPassword(password), role === 'driver' ? vehicle ?? null : null);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ token: signToken(user), user: publicUser(user) });
});

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = email && db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim());
  if (!user || !verifyPassword(password ?? '', user.password_hash)) {
    if (user && (user.google_sub || user.apple_sub))
      return bad(res, `This account signs in with ${user.google_sub ? 'Google' : 'Apple'}. Use that button instead.`, 401);
    return bad(res, 'Wrong email or password', 401);
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

// "Continue with Google / Apple": sign in, link to an existing account with the same verified
// email, or create a new account (customers by default).
api.post('/auth/social', wrap(async (req, res) => {
  const { provider, idToken, name, role } = req.body ?? {};
  let id;
  try {
    id = await verifySocialToken(provider, idToken);
  } catch (e) {
    if (e instanceof SocialError) return bad(res, e.message, 401);
    throw e;
  }
  const col = provider === 'google' ? 'google_sub' : 'apple_sub';
  let user = db.prepare(`SELECT * FROM users WHERE ${col} = ?`).get(id.sub);
  let created = false;
  if (!user && id.email && id.emailVerified) {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(id.email);
    if (user) db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(id.sub, user.id);
  }
  if (!user) {
    if (!id.email) return bad(res, 'We need an email address to create your account');
    const displayName = String(name ?? id.name ?? '').trim() || id.email.split('@')[0];
    // No password: the random hash can never match, so this account signs in with the provider only.
    const info = db
      .prepare(`INSERT INTO users (role, name, email, password_hash, ${col}) VALUES (?, ?, ?, ?, ?)`)
      .run(role === 'driver' ? 'driver' : 'customer', displayName, id.email, hashPassword(randomBytes(32).toString('hex')), id.sub);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    created = true;
  }
  user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ token: signToken(user), user: publicUser(user), created });
}));

api.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return bad(res, 'Account not found', 404);
  res.json(publicUser(user));
});

api.patch('/me', requireAuth, (req, res) => {
  const { name, phone, vehicle } = req.body ?? {};
  db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), vehicle = COALESCE(?, vehicle) WHERE id = ?').run(
    name ?? null,
    phone ?? null,
    vehicle ?? null,
    req.user.id,
  );
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)));
});

api.get('/notifications', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(req.user.id));
});

/* ---------------- weather & geocoding ---------------- */

api.get('/weather', wrap(async (req, res) => {
  const { lat, lng } = req.query;
  if (lat == null || lng == null) return bad(res, 'lat and lng are required');
  try {
    res.json(await getConditions(lat, lng));
  } catch (e) {
    bad(res, `Weather is unavailable right now (${e.message})`, 502);
  }
}));

// Address type-ahead for the order form. Public, so visitors can price a plow before signing up.
const nearFrom = (q) => (Number.isFinite(Number(q.lat)) && Number.isFinite(Number(q.lng)) && q.lat !== '' ? { lat: Number(q.lat), lng: Number(q.lng) } : undefined);

api.get('/places/suggest', wrap(async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 3) return res.json([]);
  try {
    res.json(await suggestAddresses(q, nearFrom(req.query)));
  } catch (e) {
    bad(res, `Address search is unavailable right now (${e.message})`, 502);
  }
}));

// Pin down a picked suggestion. `verified: false` means the Census doesn't know that house
// number, so the app asks the customer to double-check before using the street location.
api.post('/places/resolve', wrap(async (req, res) => {
  const { text, lat, lng } = req.body ?? {};
  if (!text?.trim()) return bad(res, 'Pick an address');
  const hit = await resolveAddress(text.trim()).catch(() => null);
  if (hit) return res.json({ ...hit, verified: true });
  if (lat == null || lng == null) return bad(res, "We couldn't find that address", 404);
  res.json({ address: text.trim(), lat: Number(lat), lng: Number(lng), verified: false });
}));

// Upfront price for any address, before an account or saved driveway exists.
api.get('/quote/preview', wrap(async (req, res) => {
  const { lat, lng, size = 'double', length = 'standard', sidewalk, depth = 4 } = req.query;
  if (lat == null || lng == null) return bad(res, 'lat and lng are required');
  if (!SIZES.includes(size) || !LENGTHS.includes(length)) return bad(res, 'Invalid driveway size');
  const property = { lat: Number(lat), lng: Number(lng), size, length, sidewalk: sidewalk === '1' || sidewalk === 'true' };
  res.json(await priceFor(property, Number(depth)));
}));

// Stock-ticker style weather across the service area (served from memory, refreshed every 10 min).
api.get('/weather/ticker', (req, res) => res.json(getTicker()));

api.get('/geocode', wrap(async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 5) return res.json([]);
  res.json(await geocode(q));
}));

/* ---------------- properties ---------------- */

api.get('/properties', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM properties WHERE user_id = ? ORDER BY id').all(req.user.id).map(serializeProperty));
});

api.post('/properties', requireAuth, requireRole('customer'), (req, res) => {
  const { label = 'Home', address, lat, lng, size = 'double', length = 'standard', sidewalk = false, notes } = req.body ?? {};
  if (!address || lat == null || lng == null) return bad(res, 'Pick an address from the search results');
  if (!SIZES.includes(size) || !LENGTHS.includes(length)) return bad(res, 'Invalid driveway size');
  const info = db
    .prepare('INSERT INTO properties (user_id, label, address, lat, lng, size, length, sidewalk, notes) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(req.user.id, label, address, lat, lng, size, length, sidewalk ? 1 : 0, notes ?? null);
  res.json(serializeProperty(db.prepare('SELECT * FROM properties WHERE id = ?').get(info.lastInsertRowid)));
});

api.patch('/properties/:id', requireAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM properties WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!p) return bad(res, 'Property not found', 404);
  const next = { ...p, ...req.body };
  if (!SIZES.includes(next.size) || !LENGTHS.includes(next.length)) return bad(res, 'Invalid driveway size');
  db.prepare('UPDATE properties SET label=?, size=?, length=?, sidewalk=?, notes=? WHERE id=?').run(
    next.label,
    next.size,
    next.length,
    next.sidewalk ? 1 : 0,
    next.notes ?? null,
    p.id,
  );
  res.json(serializeProperty(db.prepare('SELECT * FROM properties WHERE id = ?').get(p.id)));
});

api.delete('/properties/:id', requireAuth, (req, res) => {
  const open = db
    .prepare("SELECT 1 FROM jobs WHERE property_id = ? AND status NOT IN ('completed','cancelled')")
    .get(req.params.id);
  if (open) return bad(res, 'Cancel open plow requests for this address first');
  db.prepare('DELETE FROM properties WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ---------------- quotes & jobs (customer) ---------------- */

api.get('/quote', requireAuth, wrap(async (req, res) => {
  const p = db.prepare('SELECT * FROM properties WHERE id = ? AND user_id = ?').get(req.query.propertyId, req.user.id);
  if (!p) return bad(res, 'Property not found', 404);
  res.json(await priceFor(p, Number(req.query.depth ?? 4)));
}));

api.post('/jobs', requireAuth, requireRole('customer'), wrap(async (req, res) => {
  const { propertyId, scheduledFor, depthIn = 4, tipCents = 0, notes } = req.body ?? {};
  const p = db.prepare('SELECT * FROM properties WHERE id = ? AND user_id = ?').get(propertyId, req.user.id);
  if (!p) return bad(res, 'Property not found', 404);
  const dup = db
    .prepare("SELECT id FROM jobs WHERE property_id = ? AND status IN ('requested','accepted','en_route','in_progress')")
    .get(p.id);
  if (dup && !scheduledFor) return bad(res, 'This driveway already has a plow on the way', 409);

  let status = 'requested';
  let kind = 'asap';
  if (scheduledFor) {
    const t = Date.parse(scheduledFor);
    if (Number.isNaN(t)) return bad(res, 'Invalid scheduled time');
    if (t < Date.now() - 5 * 60_000) return bad(res, 'Scheduled time is in the past');
    kind = 'scheduled';
    status = t - Date.now() > DISPATCH_LEAD_MIN * 60_000 ? 'scheduled' : 'requested';
  }
  const q = await priceFor(p, Number(depthIn));
  const info = db
    .prepare(
      'INSERT INTO jobs (customer_id, property_id, status, kind, scheduled_for, snow_depth_in, quote_json, price_cents, tip_cents, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    )
    .run(req.user.id, p.id, status, kind, scheduledFor ? new Date(scheduledFor).toISOString() : null, Number(depthIn), JSON.stringify(q), q.total, Math.max(0, Math.round(tipCents)), notes ?? null);
  const jobId = Number(info.lastInsertRowid);
  try {
    await authorizeJob(jobId);
  } catch (e) {
    // No hold, no job: drivers never saw it, so just drop the row.
    db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
    throw e;
  }
  const job = broadcastJob(jobId);
  if (status === 'requested') getIo()?.to('drivers').emit('jobs:new', { id: job.id, address: p.address });
  res.json(job);
}));

api.get('/jobs', requireAuth, (req, res) => {
  const col = req.user.role === 'driver' ? 'j.driver_id' : 'j.customer_id';
  res.json(listJobs(`${col} = ?`, req.user.id));
});

api.get('/jobs/:id', requireAuth, (req, res) => {
  const job = getJob(req.params.id);
  const canSee =
    job &&
    (job.customer.id === req.user.id ||
      job.driver?.id === req.user.id ||
      (req.user.role === 'driver' && ['requested', 'scheduled'].includes(job.status) && !job.driver));
  if (!canSee) return bad(res, 'Job not found', 404);
  res.json(job);
});

// Road route + ETA from the assigned driver to the driveway, for the tracking map.
// Null when there's nothing to draw (no driver yet, no GPS fix, or the job isn't en route).
api.get('/jobs/:id/route', requireAuth, wrap(async (req, res) => {
  const job = getJob(req.params.id);
  if (!job || (job.customer.id !== req.user.id && job.driver?.id !== req.user.id)) return bad(res, 'Job not found', 404);
  const d = job.driver;
  if (!d || d.lat == null || !['accepted', 'en_route'].includes(job.status)) return res.json(null);
  try {
    const route = await drivingRoute({ lat: d.lat, lng: d.lng }, job.property);
    res.json({ ...route, arriveAt: new Date(Date.now() + route.seconds * 1000).toISOString() });
  } catch {
    // Routing is a nice-to-have: fall back to the straight-line ETA the job already carries.
    res.json(null);
  }
}));

api.post('/jobs/:id/cancel', requireAuth, wrap(async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return bad(res, 'Job not found', 404);
  if (job.customer.id === req.user.id) {
    if (!['scheduled', 'requested', 'accepted'].includes(job.status))
      return bad(res, 'Your driver is already on the way — message them to cancel');
    db.prepare("UPDATE jobs SET status='cancelled', cancelled_at=? WHERE id=?").run(nowIso(), job.id);
    await voidJob(job.id);
    if (job.driver) notify(job.driver.id, 'Job cancelled', `${job.property.address} was cancelled by the customer.`, job.id);
  } else if (job.driver?.id === req.user.id) {
    // Driver drops the job: it goes back into the pool.
    if (!['scheduled', 'accepted'].includes(job.status)) return bad(res, 'You can only release a job before heading out');
    const back = job.scheduledFor && Date.parse(job.scheduledFor) - Date.now() > DISPATCH_LEAD_MIN * 60_000 ? 'scheduled' : 'requested';
    db.prepare('UPDATE jobs SET status=?, driver_id=NULL, accepted_at=NULL WHERE id=?').run(back, job.id);
    notify(job.customer.id, 'Finding a new driver', `${job.driver.name} can't make it. We're matching you with another driver.`, job.id);
  } else return bad(res, 'Job not found', 404);
  res.json(broadcastJob(job.id));
}));

api.post('/jobs/:id/tip', requireAuth, requireRole('customer'), wrap(async (req, res) => {
  const job = getJob(req.params.id);
  if (!job || job.customer.id !== req.user.id) return bad(res, 'Job not found', 404);
  if (job.status === 'cancelled') return bad(res, 'This job was cancelled');
  const cents = Math.round(Number(req.body?.cents));
  if (!Number.isFinite(cents) || cents < 0 || cents > 50000) return bad(res, 'Tip must be between $0 and $500');
  if (job.paymentStatus === 'failed') return bad(res, "We couldn't charge your card for this job, so tips are paused. Contact support.");
  if (job.status === 'completed' && job.paymentStatus === 'authorized') return bad(res, 'Finishing your payment. Try again in a moment.', 409);
  const charged = job.paymentStatus === 'captured';
  if (charged && cents < job.tipCents) return bad(res, "Your card was already charged for this tip, so it can't be lowered");
  // Conditional so two taps can't both charge the same increase.
  if (!db.prepare('UPDATE jobs SET tip_cents = ? WHERE id = ? AND tip_cents = ?').run(cents, job.id, job.tipCents).changes)
    return bad(res, 'Your tip was just updated. Check it and try again.', 409);
  if (charged && cents > job.tipCents) {
    try {
      // Before completion the tip is just part of what gets captured; after, it's its own charge.
      await chargeExtraTip(job.id, cents - job.tipCents);
    } catch (e) {
      db.prepare('UPDATE jobs SET tip_cents = ? WHERE id = ? AND tip_cents = ?').run(job.tipCents, job.id, cents);
      throw e;
    }
  }
  if (job.driver && cents > job.tipCents)
    notify(job.driver.id, 'You got a tip! 🎉', `${job.customer.name} tipped $${(cents / 100).toFixed(2)} for ${job.property.address}.`, job.id);
  res.json(broadcastJob(job.id));
}));

api.post('/jobs/:id/rate', requireAuth, requireRole('customer'), (req, res) => {
  const job = getJob(req.params.id);
  if (!job || job.customer.id !== req.user.id) return bad(res, 'Job not found', 404);
  if (job.status !== 'completed') return bad(res, 'You can rate once the job is done');
  if (job.rating) return bad(res, 'Already rated');
  const stars = Math.round(Number(req.body?.stars));
  if (!(stars >= 1 && stars <= 5)) return bad(res, 'Rating must be 1–5 stars');
  db.prepare('UPDATE jobs SET rating = ?, review = ? WHERE id = ?').run(stars, req.body?.review ?? null, job.id);
  db.prepare('UPDATE users SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?').run(stars, job.driver.id);
  res.json(broadcastJob(job.id));
});

/* ---------------- storm auto-plow plans ---------------- */

api.get('/storm-plans', requireAuth, (req, res) => {
  res.json(
    db
      .prepare('SELECT s.*, p.address, p.label FROM storm_plans s JOIN properties p ON p.id = s.property_id WHERE s.user_id = ?')
      .all(req.user.id)
      .map((s) => ({ ...s, active: !!s.active })),
  );
});

api.put('/storm-plans/:propertyId', requireAuth, requireRole('customer'), (req, res) => {
  const p = db.prepare('SELECT * FROM properties WHERE id = ? AND user_id = ?').get(req.params.propertyId, req.user.id);
  if (!p) return bad(res, 'Property not found', 404);
  const threshold = Number(req.body?.thresholdIn ?? 2);
  const active = req.body?.active ?? true;
  if (!(threshold >= 1 && threshold <= 24)) return bad(res, 'Threshold must be 1–24 inches');
  db.prepare(
    `INSERT INTO storm_plans (user_id, property_id, threshold_in, active) VALUES (?, ?, ?, ?)
     ON CONFLICT(property_id) DO UPDATE SET threshold_in = excluded.threshold_in, active = excluded.active`,
  ).run(req.user.id, p.id, threshold, active ? 1 : 0);
  res.json({ ok: true });
});

/* ---------------- driver ---------------- */

api.post('/driver/status', requireAuth, requireRole('driver'), (req, res) => {
  const { online, lat, lng } = req.body ?? {};
  db.prepare('UPDATE users SET online = ?, lat = COALESCE(?, lat), lng = COALESCE(?, lng), location_at = ? WHERE id = ?').run(
    online ? 1 : 0,
    lat ?? null,
    lng ?? null,
    nowIso(),
    req.user.id,
  );
  getIo()?.to('drivers').emit('jobs:changed');
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)));
});

api.post('/driver/location', requireAuth, requireRole('driver'), (req, res) => {
  const { lat, lng } = req.body ?? {};
  if (lat == null || lng == null) return bad(res, 'lat and lng required');
  updateDriverLocation(req.user.id, lat, lng);
  res.json({ ok: true });
});

export function updateDriverLocation(driverId, lat, lng) {
  db.prepare('UPDATE users SET lat = ?, lng = ?, location_at = ? WHERE id = ?').run(lat, lng, nowIso(), driverId);
  const active = db
    .prepare(`SELECT id FROM jobs WHERE driver_id = ? AND status IN (${ACTIVE_STATUSES.map(() => '?').join(',')})`)
    .all(driverId, ...ACTIVE_STATUSES);
  for (const { id } of active) broadcastJob(id);
}

api.get('/driver/available', requireAuth, requireRole('driver'), (req, res) => {
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const radius = Number(req.query.radius ?? 30);
  const jobs = listJobs("j.driver_id IS NULL AND j.status IN ('requested','scheduled')")
    .map((j) => ({ ...j, distanceMiles: me.lat == null ? null : Math.round(milesBetween(me, j.property) * 10) / 10 }))
    .filter((j) => j.distanceMiles == null || j.distanceMiles <= radius)
    .sort((a, b) => {
      // Ready-now jobs first, then by distance, then by scheduled time.
      if ((a.status === 'requested') !== (b.status === 'requested')) return a.status === 'requested' ? -1 : 1;
      return (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0) || String(a.scheduledFor).localeCompare(String(b.scheduledFor));
    });
  res.json(jobs);
});

api.post('/jobs/:id/accept', requireAuth, requireRole('driver'), (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return bad(res, 'Job not found', 404);
  const next = job.status === 'scheduled' ? 'scheduled' : 'accepted';
  // Conditional update so two drivers can't grab the same job.
  const r = db
    .prepare("UPDATE jobs SET driver_id = ?, status = ?, accepted_at = ? WHERE id = ? AND driver_id IS NULL AND status IN ('requested','scheduled')")
    .run(req.user.id, next, nowIso(), job.id);
  if (!r.changes) return bad(res, 'Another driver just took this one', 409);
  const updated = broadcastJob(job.id);
  const when = next === 'scheduled' ? `for ${new Date(job.scheduledFor).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : `— ETA about ${updated.etaMinutes ?? 15} min`;
  notify(job.customer.id, 'Driver confirmed', `${updated.driver.name} will plow ${job.property.label.toLowerCase()} ${when}.`, job.id);
  res.json(updated);
});

const DRIVER_FLOW = { accepted: 'en_route', en_route: 'in_progress', in_progress: 'completed' };
const STATUS_COPY = {
  en_route: (j) => [`${j.driver.name} is on the way`, `ETA about ${j.etaMinutes ?? 10} min to ${j.property.address}.`],
  in_progress: (j) => ['Plowing has started', `${j.driver.name} is clearing your driveway now.`],
  completed: (j) => ['Your driveway is clear ❄️', `Rate ${j.driver.name} and add a tip — 100% goes to your driver.`],
};

api.post('/jobs/:id/advance', requireAuth, requireRole('driver'), wrap(async (req, res) => {
  const job = getJob(req.params.id);
  if (!job || job.driver?.id !== req.user.id) return bad(res, 'Job not found', 404);
  const next = DRIVER_FLOW[job.status];
  if (!next) return bad(res, job.status === 'scheduled' ? "This job isn't open yet" : 'Nothing left to do on this job');
  const stamp = { in_progress: 'started_at', completed: 'completed_at' }[next];
  // Conditional on the current status so a double tap can't complete (and charge) twice.
  const moved = db
    .prepare(`UPDATE jobs SET status = ?${stamp ? `, ${stamp} = ?` : ''} WHERE id = ? AND status = ?`)
    .run(...(stamp ? [next, nowIso(), job.id, job.status] : [next, job.id, job.status]));
  if (!moved.changes) return bad(res, 'This job was just updated', 409);
  const paid = next === 'completed' ? await settleJob(job.id) : true;
  const updated = broadcastJob(job.id);
  const [title, body] = STATUS_COPY[next](updated);
  notify(job.customer.id, title, body, job.id);
  if (!paid)
    notify(job.customer.id, 'Payment didn’t go through', `We couldn't charge ${updated.cardLabel ?? 'your card'} for ${job.property.address}. Update your card in Account.`, job.id);
  res.json(updated);
}));

api.get('/driver/earnings', requireAuth, requireRole('driver'), (req, res) => {
  const jobs = listJobs("j.driver_id = ? AND j.status = 'completed'", req.user.id);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = Date.now() - 7 * 86400_000;
  const sum = (list) => list.reduce((s, j) => s + j.quote.driverPayout + j.tipCents, 0);
  const tips = (list) => list.reduce((s, j) => s + j.tipCents, 0);
  const today = jobs.filter((j) => Date.parse(j.completedAt) >= startOfDay.getTime());
  const week = jobs.filter((j) => Date.parse(j.completedAt) >= weekAgo);
  res.json({
    today: { cents: sum(today), tips: tips(today), jobs: today.length },
    week: { cents: sum(week), tips: tips(week), jobs: week.length },
    allTime: { cents: sum(jobs), tips: tips(jobs), jobs: jobs.length },
    recent: jobs.slice(0, 20).map((j) => ({
      id: j.id,
      address: j.property.address,
      completedAt: j.completedAt,
      payoutCents: j.quote.driverPayout,
      tipCents: j.tipCents,
      rating: j.rating,
    })),
  });
});

/* ---------------- payments ---------------- */

const requireStripe = (req, res, next) =>
  paymentsMode === 'stripe' ? next() : bad(res, 'Payments are simulated on this server (no STRIPE_SECRET_KEY)', 501);

api.get('/payments/methods', requireAuth, requireRole('customer'), wrap(async (req, res) => {
  res.json({ mode: paymentsMode, card: await savedCard(req.user.id) });
}));

api.post('/payments/setup', requireAuth, requireRole('customer'), requireStripe, wrap(async (req, res) => {
  res.json(await createCardSetup(req.user.id));
}));

api.post('/payments/setup/complete', requireAuth, requireRole('customer'), requireStripe, wrap(async (req, res) => {
  if (!req.body?.setupIntentId) return bad(res, 'setupIntentId is required');
  res.json({ mode: paymentsMode, card: await finishCardSetup(req.user.id, req.body.setupIntentId) });
}));

// Stripe only redirects to http(s), so app deep links bounce through /payouts/return.
const APP_SCHEMES = ['plowbird:', 'exp:', 'exps:'];
const parseUrl = (s) => {
  try {
    return new URL(String(s));
  } catch {
    return null;
  }
};

api.get('/driver/payouts', requireAuth, requireRole('driver'), wrap(async (req, res) => {
  res.json(await payoutStatus(req.user.id));
}));

api.post('/driver/payouts/onboard', requireAuth, requireRole('driver'), requireStripe, wrap(async (req, res) => {
  const back = parseUrl(req.body?.returnUrl);
  if (!back || ![...APP_SCHEMES, 'http:', 'https:'].includes(back.protocol)) return bad(res, 'returnUrl must be an app or web URL');
  const returnUrl = APP_SCHEMES.includes(back.protocol)
    ? `${req.protocol}://${req.get('host')}/api/payouts/return?to=${encodeURIComponent(back.toString())}`
    : back.toString();
  res.json({ url: await payoutOnboardingLink(req.user.id, returnUrl) });
}));

api.post('/driver/payouts/dashboard', requireAuth, requireRole('driver'), requireStripe, wrap(async (req, res) => {
  res.json({ url: await payoutDashboardLink(req.user.id) });
}));

api.get('/payouts/return', (req, res) => {
  const to = parseUrl(req.query.to);
  if (!to || !APP_SCHEMES.includes(to.protocol)) return bad(res, 'Invalid return link');
  res.redirect(to.toString());
});

/* ---------------- demo drive ---------------- */

// Moves the assigned driver along the real road route to the driveway, so live tracking can be
// shown without a truck on the road. On in development; set DEMO_MODE=1 to allow it in production.
const DEMO = process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === '1';
const demoDrives = new Map();

api.get('/config', (req, res) => res.json({ demo: DEMO, payments: paymentsMode, auth: socialConfig() }));

api.post('/jobs/:id/demo-drive', requireAuth, requireRole('driver'), wrap(async (req, res) => {
  if (!DEMO) return bad(res, 'Demo drives are off on this server', 404);
  const job = getJob(req.params.id);
  if (!job || job.driver?.id !== req.user.id) return bad(res, 'Job not found', 404);
  if (!['accepted', 'en_route'].includes(job.status)) return bad(res, 'Accept the job first');
  // Start from the truck's real position if it's a sensible distance away, else ~2.5 mi out.
  const here = job.driver.lat != null ? { lat: job.driver.lat, lng: job.driver.lng } : null;
  const miles = here ? milesBetween(here, job.property) : null;
  const start = here && miles > 0.5 && miles < 15 ? here : { lat: job.property.lat + 0.025, lng: job.property.lng - 0.03 };
  const { coords } = await drivingRoute(start, job.property);
  if (job.status === 'accepted') {
    db.prepare("UPDATE jobs SET status = 'en_route' WHERE id = ? AND status = 'accepted'").run(job.id);
    const updated = broadcastJob(job.id);
    const [title, body] = STATUS_COPY.en_route(updated);
    notify(job.customer.id, title, body, job.id);
  }
  clearInterval(demoDrives.get(job.id));
  const TICKS = 45; // ~70 seconds of driving
  let tick = 0;
  const timer = setInterval(() => {
    tick++;
    const [lat, lng] = coords[Math.min(coords.length - 1, Math.round((tick / TICKS) * (coords.length - 1)))];
    updateDriverLocation(req.user.id, lat, lng);
    if (tick >= TICKS) {
      clearInterval(timer);
      demoDrives.delete(job.id);
    }
  }, 1500);
  demoDrives.set(job.id, timer);
  res.json({ ok: true, seconds: Math.round(TICKS * 1.5) });
}));

/* ---------------- dev helpers ---------------- */

if (process.env.NODE_ENV !== 'production') {
  api.get('/dev/demo-storm', (req, res) => res.json({ on: isDemoStorm() }));
  api.post('/dev/demo-storm', (req, res) => {
    setDemoStorm(req.body?.on);
    getIo()?.emit('weather:changed');
    if (isDemoStorm()) checkStormPlans().catch(() => {});
    res.json({ on: isDemoStorm() });
  });
}
