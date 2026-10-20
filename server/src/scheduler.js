import { db, nowIso } from './db.js';
import { broadcastJob, DISPATCH_LEAD_MIN, getIo, marketPressure, notify } from './jobs.js';
import { autoAcceptForDemo } from './demo.js';
import { activePassFor, checkStormPasses } from './storm-pass.js';
import { authorizeJob, PaymentError } from './payments.js';
import { quote, surgeMultiplier } from './pricing.js';
import { getConditions } from './weather.js';
import { outsideAreaSync } from './service-area.js';
import { expireUnacceptedJobs, markRequested } from './timeouts.js';

const fmtTime = (iso) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' });

// Open scheduled jobs to drivers once they're inside the dispatch window.
export function releaseScheduledJobs() {
  const cutoff = new Date(Date.now() + DISPATCH_LEAD_MIN * 60_000).toISOString();
  const due = db.prepare("SELECT id, driver_id, customer_id FROM jobs WHERE status = 'scheduled' AND scheduled_for <= ?").all(cutoff);
  for (const j of due) {
    if (j.driver_id) {
      db.prepare("UPDATE jobs SET status = 'accepted' WHERE id = ?").run(j.id);
      notify(j.driver_id, 'Scheduled job is up', 'Head out when you’re ready — the customer is expecting you soon.', j.id);
    } else {
      db.prepare("UPDATE jobs SET status = 'requested' WHERE id = ?").run(j.id);
      markRequested(j.id); // the no-driver timeout counts from now, not from booking
      getIo()?.to('drivers').emit('jobs:new', { id: j.id });
      autoAcceptForDemo(j.id);
    }
    broadcastJob(j.id);
  }
  return due.length;
}

// Storm auto-plow: when the NWS forecast for a property crosses the customer's
// threshold, book a plow for ~1 hour after snowfall is forecast to end.
export async function checkStormPlans() {
  const plans = db
    .prepare(
      `SELECT s.*, p.lat, p.lng, p.address, p.label, p.size, p.length, p.sidewalk
       FROM storm_plans s JOIN properties p ON p.id = s.property_id
       WHERE s.active = 1 AND (s.last_triggered_at IS NULL OR s.last_triggered_at < ?)`,
    )
    .all(new Date(Date.now() - 24 * 3600_000).toISOString());

  let booked = 0;
  for (const plan of plans) {
    let wx;
    try {
      wx = await getConditions(plan.lat, plan.lng);
    } catch {
      continue;
    }
    const snow = wx.snowfall.next24h;
    if (snow.inches < plan.threshold_in) continue;
    if (activePassFor(plan.property_id)) continue; // Storm Pass books (and covers) these
    if (outsideAreaSync(plan.address)) continue; // outside the pilot ZIPs: no drivers there yet
    const open = db
      .prepare("SELECT 1 FROM jobs WHERE property_id = ? AND status NOT IN ('completed','cancelled')")
      .get(plan.property_id);
    if (open) continue;

    const when = new Date((snow.endsAt ? Date.parse(snow.endsAt) : Date.now()) + 3600_000).toISOString();
    const depthIn = Math.max(1, Math.round(snow.inches));
    const q = quote(plan, { depthIn, surge: surgeMultiplier({ alerts: wx.alerts, ...marketPressure() }) });
    const info = db
      .prepare(
        "INSERT INTO jobs (customer_id, property_id, status, kind, scheduled_for, snow_depth_in, quote_json, price_cents) VALUES (?, ?, 'scheduled', 'storm_auto', ?, ?, ?, ?)",
      )
      .run(plan.user_id, plan.property_id, when, depthIn, JSON.stringify(q), q.total);
    const jobId = Number(info.lastInsertRowid);
    try {
      await authorizeJob(jobId);
    } catch (e) {
      db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
      // Stripe outage: try again on the next check. Card problem: tell the customer once per storm.
      if (!(e instanceof PaymentError)) {
        console.error(`storm auto-plow hold for property ${plan.property_id} failed`, e.message);
        continue;
      }
      db.prepare('UPDATE storm_plans SET last_triggered_at = ? WHERE id = ?').run(nowIso(), plan.id);
      notify(plan.user_id, 'Storm auto-plow needs a card', `${snow.inches}" is forecast at ${plan.label}, but we couldn't book a plow: ${e.message}`);
      continue;
    }
    db.prepare('UPDATE storm_plans SET last_triggered_at = ? WHERE id = ?').run(nowIso(), plan.id);
    notify(
      plan.user_id,
      'Storm auto-plow booked ❄️',
      `${snow.inches}" forecast at ${plan.label}. We scheduled a plow for ${fmtTime(when)} — $${(q.total / 100).toFixed(2)}. Cancel anytime before your driver heads out.`,
      jobId,
    );
    broadcastJob(jobId);
    booked++;
  }
  return booked;
}

export function startScheduler() {
  setInterval(releaseScheduledJobs, 30_000);
  setInterval(() => expireUnacceptedJobs().catch((e) => console.error('unaccepted job check failed', e)), 30_000);
  setInterval(() => {
    checkStormPasses().catch((e) => console.error('storm pass check failed', e));
    checkStormPlans().catch((e) => console.error('storm check failed', e));
  }, 15 * 60_000);
  setTimeout(() => {
    releaseScheduledJobs();
    checkStormPasses().catch(() => {});
    checkStormPlans().catch(() => {});
  }, 2000);
}
