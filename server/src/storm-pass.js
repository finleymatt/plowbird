// Storm Pass: a monthly subscription that plows a driveway automatically whenever a storm
// qualifies. Prices and rules live here; the Storm Pass page shows ELIGIBILITY verbatim, so the
// page and the scheduler can't disagree.
import { db, nowIso } from './db.js';
import { broadcastJob, marketPressure, notify } from './jobs.js';
import { quote, surgeMultiplier } from './pricing.js';
import { getConditions } from './weather.js';

export const STORM_PASS = {
  name: 'Storm Pass',
  // Monthly price by driveway size (cents). Pays off with ~2–3 storms a month vs. per-plow pricing.
  prices: { single: 7900, double: 9900, triple: 12900, large: 16900 },
  sidewalkCents: 1500,
  triggerInches: 2,
  warnings: ['Winter Storm Warning', 'Blizzard Warning', 'Ice Storm Warning', 'Heavy Snow Warning'],
  maxPerDay: 2,
  minHoursBetween: 10,
};

export const ELIGIBILITY = [
  'Your driveway is in our Minnesota or South Dakota service area.',
  `A plow is triggered when ${STORM_PASS.triggerInches}" or more of snow is forecast within 24 hours at your address (National Weather Service), or when the NWS issues a Winter Storm, Blizzard, Ice Storm or Heavy Snow Warning for it.`,
  'We book your plow automatically for about an hour after the snow stops and notify you. Nothing to tap.',
  `Long storms: up to ${STORM_PASS.maxPerDay} plows a day, about ${STORM_PASS.minHoursBetween} hours apart.`,
  'Covers the driveway size on your plan, plus sidewalks and front walk if you add them. Any snow depth.',
  'Not included: drifting with no new snowfall, ice treatment or salting, roof raking, or hauling snow away.',
  'Billed monthly. Cancel anytime; coverage runs to the end of the month you’ve paid for. Tips are optional and go 100% to your driver.',
];

export const passPrice = (property) => STORM_PASS.prices[property.size] + (property.sidewalk ? STORM_PASS.sidewalkCents : 0);

// Is this subscription covering plows right now? (Cancelled passes run to the end of the paid month.)
export const isCovering = (sub) => sub.status === 'active' && (!sub.ends_at || Date.parse(sub.ends_at) > Date.now());

export const activePassFor = (propertyId) =>
  db
    .prepare("SELECT * FROM subscriptions WHERE property_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1")
    .all(propertyId)
    .find(isCovering) ?? null;

const fmtTime = (iso) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' });

// Scheduler hook: book a covered plow for every Storm Pass driveway with a qualifying storm.
export async function checkStormPasses() {
  const subs = db
    .prepare(
      `SELECT s.*, p.lat, p.lng, p.address, p.label, p.size, p.length, p.sidewalk
       FROM subscriptions s JOIN properties p ON p.id = s.property_id WHERE s.status = 'active'`,
    )
    .all()
    .filter(isCovering);

  let booked = 0;
  for (const sub of subs) {
    // Already has a plow coming, or hit the per-day / spacing limits.
    if (db.prepare("SELECT 1 FROM jobs WHERE property_id = ? AND status NOT IN ('completed','cancelled')").get(sub.property_id)) continue;
    const recent = db
      .prepare("SELECT created_at FROM jobs WHERE property_id = ? AND covered = 1 AND created_at > ? ORDER BY created_at DESC")
      .all(sub.property_id, new Date(Date.now() - 24 * 3600_000).toISOString());
    if (recent.length >= STORM_PASS.maxPerDay) continue;
    if (recent[0] && Date.parse(recent[0].created_at) > Date.now() - STORM_PASS.minHoursBetween * 3600_000) continue;

    let wx;
    try {
      wx = await getConditions(sub.lat, sub.lng);
    } catch {
      continue;
    }
    const snow = wx.snowfall.next24h;
    const warning = wx.alerts.find((a) => STORM_PASS.warnings.includes(a.event));
    if (snow.inches < STORM_PASS.triggerInches && !warning) continue;

    const when = new Date((snow.endsAt ? Date.parse(snow.endsAt) : Date.now()) + 3600_000).toISOString();
    const depthIn = Math.max(1, Math.round(snow.inches));
    // The driver is paid as usual (storm surge included); the customer's part is covered by the pass.
    const q = quote(sub, { depthIn, surge: surgeMultiplier({ alerts: wx.alerts, ...marketPressure() }) });
    const info = db
      .prepare(
        "INSERT INTO jobs (customer_id, property_id, status, kind, scheduled_for, snow_depth_in, quote_json, price_cents, covered, payment_status) VALUES (?, ?, 'scheduled', 'storm_auto', ?, ?, ?, 0, 1, 'covered')",
      )
      .run(sub.user_id, sub.property_id, when, depthIn, JSON.stringify(q));
    const jobId = Number(info.lastInsertRowid);
    notify(
      sub.user_id,
      'Storm Pass: plow booked ❄️',
      `${warning ? warning.event : `${snow.inches}" of snow`} at ${sub.label}. Your plow is set for ${fmtTime(when)}, covered by your Storm Pass.`,
      jobId,
    );
    broadcastJob(jobId);
    booked++;
  }
  return booked;
}

export const subscriptionRow = (sub) => ({
  id: sub.id,
  propertyId: sub.property_id,
  address: sub.address,
  label: sub.label,
  size: sub.size,
  sidewalk: !!sub.sidewalk,
  priceCents: sub.price_cents,
  status: isCovering(sub) ? (sub.ends_at ? 'ending' : 'active') : 'cancelled',
  renewsAt: sub.ends_at ? null : sub.renews_at,
  endsAt: sub.ends_at,
  startedAt: sub.created_at,
  billing: sub.comp ? 'reward' : sub.stripe_subscription_id ? 'stripe' : 'demo',
});

export const markEnding = (subId, endsAt) =>
  db.prepare('UPDATE subscriptions SET ends_at = ?, cancelled_at = ? WHERE id = ?').run(endsAt, nowIso(), subId);
