// Driver applications. Anyone can create a driver account, but only approved drivers can go
// online, see open jobs or accept them. Drivers apply at /drive (truck, plow, insurance, area);
// staff approve or reject them at /admin.
//
// users.driver_status: null (account, no application yet) → 'pending' → 'approved' | 'rejected'.
import { createHash } from 'node:crypto';
import { Router } from 'express';
import { adminIds, requireAdmin } from './admin.js';
import { requireAuth, requireRole } from './auth.js';
import { db, nowIso } from './db.js';
import { DEMO } from './env.js';
import { notify } from './jobs.js';
import { quote } from './pricing.js';
import { AGREEMENT_VERSION, agreementSections, agreementText } from './agreement.js';
import { APP_URL, sendEmail } from './mailer.js';

export const driverStatus = (u) => (u.role === 'driver' ? u.driver_status ?? 'none' : null);

// The demo accounts' password is public, so outside demo mode they can never take real jobs.
const isDemoAccount = (u) => /@plowbird\.test$/i.test(u.email);

// Onboarding after approval: sign the contractor agreement (agreement.js), and staff record the
// certificate of insurance. Both are required before going online. Payouts can be set up any time.
function addColumn(table, column, type) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
for (const [c, t] of [
  ['agreement_version', 'TEXT'],
  ['agreement_signed_at', 'TEXT'],
  ['agreement_signature', 'TEXT'],
  ['agreement_ip', 'TEXT'],
  ['agreement_hash', 'TEXT'],
  ['agreement_text', 'TEXT'],
  ['coi_received_at', 'TEXT'],
  ['coi_expires', 'TEXT'], // YYYY-MM-DD
])
  addColumn('users', c, t);

const todayCentral = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
const businessNameOf = (u) => applicationOf(u)?.businessName ?? null;

export function onboardingFor(u) {
  const approved = driverStatus(u) === 'approved';
  const agreementCurrent = u.agreement_version === AGREEMENT_VERSION && !!u.agreement_signed_at;
  const coiOk = !!u.coi_received_at && (!u.coi_expires || u.coi_expires >= todayCentral());
  const steps = [
    { key: 'apply', label: 'Apply', done: ['pending', 'approved'].includes(driverStatus(u)) },
    { key: 'call', label: 'Quick call and approval', done: approved },
    {
      key: 'agreement',
      label: u.agreement_signed_at && !agreementCurrent ? 'Sign the updated contractor agreement' : 'Sign the contractor agreement',
      done: agreementCurrent,
    },
    {
      key: 'coi',
      label: u.coi_received_at && !coiOk ? 'Send a current certificate of insurance (yours expired)' : 'Send your certificate of insurance',
      done: coiOk,
    },
    { key: 'payouts', label: 'Set up payouts', done: !!u.stripe_account_id, optional: true },
  ];
  return {
    steps,
    ready: approved && agreementCurrent && coiOk,
    agreement: { version: AGREEMENT_VERSION, signedVersion: u.agreement_version ?? null, signedAt: u.agreement_signed_at ?? null, current: agreementCurrent },
    coi: { receivedAt: u.coi_received_at ?? null, expires: u.coi_expires ?? null, ok: coiOk },
  };
}

// Demo accounts in demo mode skip the paperwork so the demo keeps working.
export const driverReady = (u) => (DEMO && isDemoAccount(u)) || onboardingFor(u).ready;

// For driver-only routes that touch real jobs: going online, the job board, accepting.
export function requireApprovedDriver(req, res, next) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!u || u.role !== 'driver') return res.status(403).json({ error: 'Only drivers can do that' });
  if (!DEMO && isDemoAccount(u)) return res.status(403).json({ error: 'Demo accounts can’t take real jobs', code: 'driver_not_approved' });
  const status = driverStatus(u);
  if (status === 'approved') {
    if (driverReady(u)) return next();
    const o = onboardingFor(u);
    const error = !o.agreement.current
      ? 'Sign your contractor agreement to start taking jobs.'
      : 'We need your current certificate of insurance before you can take jobs.';
    return res.status(403).json({ error, code: 'driver_onboarding', driverStatus: status });
  }
  const error = {
    none: 'Finish your driver application to start taking jobs.',
    pending: 'Your application is being reviewed. You can take jobs once you’re approved.',
    rejected: 'Your driver application wasn’t approved.',
  }[status];
  res.status(403).json({ error, code: 'driver_not_approved', driverStatus: status });
}

/* ---------------- the application ---------------- */

// Bump when the driver terms or the acknowledgments on /drive change, so we know what each driver signed.
const TERMS_VERSION = '2026-10-21';

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
    // Legal: license, insurance, business and the signed acknowledgments. Documents (license,
    // certificate of insurance) are checked on the approval call, not uploaded here.
    licenseState: str(body.licenseState, 2).toUpperCase(),
    licenseExpires: str(body.licenseExpires, 7), // YYYY-MM
    over21: body.over21 === true,
    liabilityInsured: body.liabilityInsured === true,
    insuranceExpires: /^\d{4}-\d{2}$/.test(str(body.insuranceExpires, 7)) ? str(body.insuranceExpires, 7) : null,
    coiAgreed: body.coiAgreed === true, // will send a certificate of insurance before the first job
    businessName: str(body.businessName, 120) || null, // blank = working as an individual
    contractorAck: body.contractorAck === true,
    smsConsent: body.smsConsent === true,
    signature: str(body.signature, 120),
  };
  if (a.phone.replace(/\D/g, '').length < 10) return [null, 'Enter a mobile number we can call you on'];
  if (!/^\d{5}$/.test(a.zip)) return [null, 'Enter the 5-digit ZIP code you’ll plow from'];
  if (a.truck.length < 3) return [null, 'Tell us about your truck (year, make, model)'];
  if (!a.insured) return [null, 'You need commercial auto insurance that covers plowing. Get that first, then apply.'];
  if (!a.availability.length) return [null, 'Pick at least one time you can plow'];
  if (!/^[A-Z]{2}$/.test(a.licenseState)) return [null, 'Enter the state on your driver’s license (e.g. MN)'];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(a.licenseExpires)) return [null, 'Enter when your driver’s license expires (MM/YYYY)'];
  if (a.licenseExpires < nowIso().slice(0, 7)) return [null, 'Your driver’s license has expired'];
  if (!a.over21) return [null, 'Drivers must be 21 or older'];
  if (!a.liabilityInsured) return [null, 'You also need general liability insurance. Get that first, then apply.'];
  if (!a.coiAgreed) return [null, 'Agree to send a certificate of insurance before your first job'];
  if (!a.contractorAck) return [null, 'Read and confirm the independent contractor terms'];
  if (a.signature.length < 3) return [null, 'Type your full legal name to sign'];
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
  ).run(JSON.stringify({ ...a, submittedAt: nowIso(), signedAt: nowIso(), signedIp: req.ip ?? null, termsVersion: TERMS_VERSION }), a.phone, [a.truck, a.plowWidthFt && `${a.plowWidthFt}ft ${a.plowType} plow`].filter(Boolean).join(' · '), u.id);
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
  onboarding: onboardingFor(u),
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

driversApi.post('/admin/drivers/:id/:decision', requireAuth, requireAdmin, (req, res, next) => {
  const decision = { approve: 'approved', reject: 'rejected' }[req.params.decision];
  if (!decision) return next(); // e.g. /coi, further down
  const u = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'driver'").get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Driver not found' });
  const note = str(req.body?.note, 500) || null;
  db.prepare('UPDATE users SET driver_status = ?, driver_reviewed_at = ?, driver_review_note = ? WHERE id = ?').run(decision, nowIso(), note, u.id);
  if (decision === 'approved') {
    // The paperwork goes out automatically at approval: the agreement to sign, then the COI.
    const link = `${APP_URL}/driver-agreement`;
    notify(u.id, 'You’re approved ❄️ Next: sign your agreement', 'Sign your contractor agreement and send your certificate of insurance, then you can go online when it snows.');
    sendEmail({
      to: u.email,
      subject: 'You’re approved to drive with Plowbird: two quick steps',
      text: [
        `Hi ${u.name.split(/\s+/)[0]},`,
        '',
        'You’re approved to drive with Plowbird. Two quick steps before you can take jobs:',
        '',
        `1. Sign your independent contractor agreement (about 5 minutes): ${link}`,
        '2. Ask your insurance agent to email your certificate of insurance (auto with plow coverage, and general liability) to us by replying to this email.',
        '',
        `Then set up payouts in the app so you get paid after each job. Questions? Just reply.`,
        '',
        'Plowbird',
      ].join('\n'),
    });
  } else {
    notify(u.id, 'About your driver application', note ?? 'We couldn’t approve your application right now. Reply to our email or call us with questions.');
    // A rejected driver can't keep taking jobs.
    db.prepare('UPDATE users SET online = 0 WHERE id = ?').run(u.id);
  }
  res.json(forReview(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)));
});

/* ---------------- contractor agreement + COI ---------------- */

const agreementPayload = (u) => ({
  version: AGREEMENT_VERSION,
  sections: agreementSections({ name: u.name, businessName: businessNameOf(u) }),
  onboarding: onboardingFor(u),
  signed: u.agreement_signed_at
    ? { at: u.agreement_signed_at, version: u.agreement_version, signature: u.agreement_signature, text: u.agreement_text }
    : null,
});

driversApi.get('/driver/agreement', requireAuth, requireRole('driver'), (req, res) => {
  res.json(agreementPayload(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)));
});

// Sign: the exact text, typed name, time, IP and a SHA-256 of the text are kept as the record.
driversApi.post('/driver/agreement/sign', requireAuth, requireRole('driver'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (driverStatus(u) !== 'approved') return res.status(409).json({ error: 'You can sign once your application is approved' });
  if (req.body?.agree !== true) return res.status(400).json({ error: 'Check the box to agree' });
  if (req.body?.version !== AGREEMENT_VERSION) return res.status(409).json({ error: 'The agreement was updated. Reload the page to read the new version.' });
  const signature = str(req.body?.signature, 120);
  if (signature.length < 3) return res.status(400).json({ error: 'Type your full legal name to sign' });
  const text = agreementText({ name: u.name, businessName: businessNameOf(u) });
  const at = nowIso();
  const record = `${text}\n\nSIGNED: ${signature}\nDATE: ${at}\nACCOUNT: ${u.email}\nIP: ${req.ip ?? ''}`;
  db.prepare(
    'UPDATE users SET agreement_version = ?, agreement_signed_at = ?, agreement_signature = ?, agreement_ip = ?, agreement_text = ?, agreement_hash = ? WHERE id = ?',
  ).run(AGREEMENT_VERSION, at, signature, req.ip ?? null, record, createHash('sha256').update(record).digest('hex'), u.id);
  for (const id of adminIds()) notify(id, 'Agreement signed', `${u.name} signed the contractor agreement. Check their certificate of insurance at /admin.`);
  sendEmail({
    to: u.email,
    subject: 'Your signed Plowbird contractor agreement',
    text: `Thanks for signing. A copy of your agreement is below and in the app at ${APP_URL}/driver-agreement.\n\n${record}`,
  });
  res.json(agreementPayload(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)));
});

driversApi.get('/admin/drivers/:id/agreement', requireAuth, requireAdmin, (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'driver'").get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Driver not found' });
  res.json({ signedAt: u.agreement_signed_at, version: u.agreement_version, signature: u.agreement_signature, ip: u.agreement_ip, hash: u.agreement_hash, text: u.agreement_text });
});

// Staff record the certificate of insurance: { expires: 'YYYY-MM-DD' } or { clear: true }.
driversApi.post('/admin/drivers/:id/coi', requireAuth, requireAdmin, (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'driver'").get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Driver not found' });
  if (req.body?.clear) db.prepare('UPDATE users SET coi_received_at = NULL, coi_expires = NULL WHERE id = ?').run(u.id);
  else {
    const expires = str(req.body?.expires, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) return res.status(400).json({ error: 'Enter the policy expiration date (YYYY-MM-DD)' });
    db.prepare('UPDATE users SET coi_received_at = ?, coi_expires = ? WHERE id = ?').run(nowIso(), expires, u.id);
    const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    if (onboardingFor(fresh).ready) notify(u.id, 'You’re all set ❄️', 'Your paperwork is done. Go online on your job board when it snows.');
  }
  res.json(forReview(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)));
});
