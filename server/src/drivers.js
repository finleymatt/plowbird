// Driver applications. Anyone can create a driver account, but only approved drivers can go
// online, see open jobs or accept them. Drivers apply at /drive (truck, plow, insurance, area);
// staff approve or reject them at /admin.
//
// users.driver_status: null (account, no application yet) → 'pending' → 'approved' | 'rejected'.
import { Router } from 'express';
import { adminIds, requireAdmin } from './admin.js';
import { requireAuth, requireRole } from './auth.js';
import { db, nowIso } from './db.js';
import { DEMO } from './env.js';
import { notify } from './jobs.js';
import { quote } from './pricing.js';

export const driverStatus = (u) => (u.role === 'driver' ? u.driver_status ?? 'none' : null);

// The demo accounts' password is public, so outside demo mode they can never take real jobs.
const isDemoAccount = (u) => /@plowbird\.test$/i.test(u.email);

// For driver-only routes that touch real jobs: going online, the job board, accepting.
export function requireApprovedDriver(req, res, next) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!u || u.role !== 'driver') return res.status(403).json({ error: 'Only drivers can do that' });
  if (!DEMO && isDemoAccount(u)) return res.status(403).json({ error: 'Demo accounts can’t take real jobs', code: 'driver_not_approved' });
  const status = driverStatus(u);
  if (status === 'approved') return next();
  const error = {
    none: 'Finish your driver application to start taking jobs.',
    pending: 'Your application is being reviewed. You can take jobs once you’re approved.',
    rejected: 'Your driver application wasn’t approved.',
  }[status];
  res.status(403).json({ error, code: 'driver_not_approved', driverStatus: status });
}

/* ---------------- the application ---------------- */

const PLOWS = ['straight', 'v', 'wing', 'box', 'other'];
const AVAILABILITY = ['overnight', 'early_morning', 'weekdays', 'weekends'];
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Validate the /drive form. Returns [application, error].
function readApplication(body = {}) {
  const a = {
    phone: str(body.phone, 30),
    zip: str(body.zip, 10),
    radiusMiles: Math.min(50, Math.max(3, Number(body.radiusMiles) || 10)),
    truck: str(body.truck, 120),
    plowType: PLOWS.includes(body.plowType) ? body.plowType : 'other',
    plowWidthFt: Math.min(12, Math.max(0, Number(body.plowWidthFt) || 0)) || null,
    insured: body.insured === true,
    insuranceCarrier: str(body.insuranceCarrier, 80) || null,
    yearsPlowing: Math.min(60, Math.max(0, Math.round(Number(body.yearsPlowing) || 0))),
    availability: Array.isArray(body.availability) ? body.availability.filter((x) => AVAILABILITY.includes(x)) : [],
    shovel: body.shovel === true, // can also clear walks by hand / snowblower
    notes: str(body.notes, 1000) || null,
    heardFrom: str(body.heardFrom, 80) || null,
  };
  if (a.phone.replace(/\D/g, '').length < 10) return [null, 'Enter a mobile number we can call you on'];
  if (!/^\d{5}$/.test(a.zip)) return [null, 'Enter the 5-digit ZIP code you’ll plow from'];
  if (a.truck.length < 3) return [null, 'Tell us about your truck (year, make, model)'];
  if (!a.insured) return [null, 'You need commercial auto insurance that covers plowing. Get that first, then apply.'];
  if (!a.availability.length) return [null, 'Pick at least one time you can plow'];
  return [a, null];
}

const applicationOf = (u) => {
  try {
    return u.driver_application ? JSON.parse(u.driver_application) : null;
  } catch {
    return null;
  }
};

export const driversApi = Router();

// What a driver earns, straight from pricing, for the /drive page.
driversApi.get('/drive/info', (req, res) => {
  const pay = (size) => quote({ size, length: 'standard', sidewalk: 0 }, { depthIn: 4, surge: 1 }).driverPayout;
  res.json({ payout: { single: pay('single'), double: pay('double'), triple: pay('triple') }, tipsShare: 1 });
});

driversApi.get('/driver/application', requireAuth, requireRole('driver'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ status: driverStatus(u), application: applicationOf(u), note: u.driver_review_note ?? null, reviewedAt: u.driver_reviewed_at });
});

driversApi.post('/driver/application', requireAuth, requireRole('driver'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (driverStatus(u) === 'approved') return res.status(409).json({ error: 'You’re already approved' });
  const [a, error] = readApplication(req.body);
  if (error) return res.status(400).json({ error });
  db.prepare(
    "UPDATE users SET driver_status = 'pending', driver_application = ?, phone = ?, vehicle = ?, driver_review_note = NULL WHERE id = ?",
  ).run(JSON.stringify({ ...a, submittedAt: nowIso() }), a.phone, [a.truck, a.plowWidthFt && `${a.plowWidthFt}ft ${a.plowType} plow`].filter(Boolean).join(' · '), u.id);
  for (const id of adminIds()) notify(id, 'New driver application', `${u.name} (${a.zip}) applied to drive. Review it at /admin.`);
  res.json({ status: 'pending' });
});

/* ---------------- staff review ---------------- */

const forReview = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  status: driverStatus(u),
  application: applicationOf(u),
  note: u.driver_review_note,
  reviewedAt: u.driver_reviewed_at,
  createdAt: u.created_at,
  completedJobs: db.prepare("SELECT COUNT(*) n FROM jobs WHERE driver_id = ? AND status = 'completed'").get(u.id).n,
  rating: u.rating_count ? Math.round((u.rating_sum / u.rating_count) * 10) / 10 : null,
});

driversApi.get('/admin/drivers', requireAuth, requireAdmin, (req, res) => {
  const status = ['pending', 'approved', 'rejected', 'none'].includes(req.query.status) ? req.query.status : null;
  const rows = db
    .prepare(
      `SELECT * FROM users WHERE role = 'driver' AND (? IS NULL OR COALESCE(driver_status, 'none') = ?)
       ORDER BY CASE COALESCE(driver_status, 'none') WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'none' THEN 2 ELSE 3 END, created_at DESC`,
    )
    .all(status, status);
  res.json(rows.map(forReview));
});

driversApi.post('/admin/drivers/:id/:decision', requireAuth, requireAdmin, (req, res) => {
  const decision = { approve: 'approved', reject: 'rejected' }[req.params.decision];
  if (!decision) return res.status(404).json({ error: 'Not found' });
  const u = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'driver'").get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Driver not found' });
  const note = str(req.body?.note, 500) || null;
  db.prepare('UPDATE users SET driver_status = ?, driver_reviewed_at = ?, driver_review_note = ? WHERE id = ?').run(decision, nowIso(), note, u.id);
  if (decision === 'approved') {
    notify(u.id, 'You’re approved to drive ❄️', 'Go online on your job board when it snows. Set up payouts in Account so you get paid.');
  } else {
    notify(u.id, 'About your driver application', note ?? 'We couldn’t approve your application right now. Reply to our email or call us with questions.');
    // A rejected driver can't keep taking jobs.
    db.prepare('UPDATE users SET online = 0 WHERE id = ?').run(u.id);
  }
  res.json(forReview(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)));
});
