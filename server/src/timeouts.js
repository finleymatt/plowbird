// Orders nobody accepts: once demo mode is off there's no demo driver to take every order, so an
// ASAP request (or a scheduled one released to drivers) still 'requested' after
// UNACCEPTED_TIMEOUT_MIN minutes (default 10) is cancelled, the card hold is released and the
// customer is told, and put on the waitlist so we can text them when we're plowing their area.
import { db, nowIso } from './db.js';
import { broadcastJob, notify } from './jobs.js';
import { addLead } from './leads.js';
import { voidJob } from './payments.js';

// db.js has the same helper; kept local so this module stays self-contained.
function addColumn(table, column, type) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column))
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
addColumn('jobs', 'requested_at', 'TEXT'); // when it last opened to drivers; null = created_at
addColumn('jobs', 'cancel_reason', 'TEXT'); // 'no_driver' when it timed out; null = cancelled by the customer

export const UNACCEPTED_TIMEOUT_MIN = Number(process.env.UNACCEPTED_TIMEOUT_MIN) > 0 ? Number(process.env.UNACCEPTED_TIMEOUT_MIN) : 10;

// A job just (re)opened to drivers: a released scheduled job, or one its driver dropped.
export const markRequested = (jobId) => db.prepare('UPDATE jobs SET requested_at = ? WHERE id = ?').run(nowIso(), jobId);

export async function expireUnacceptedJobs() {
  const cutoff = new Date(Date.now() - UNACCEPTED_TIMEOUT_MIN * 60_000).toISOString();
  const stale = db
    .prepare(
      `SELECT j.id, j.customer_id, j.payment_status, j.card_label, j.covered, p.address, p.lat, p.lng,
         u.email, u.phone, u.utm_source, u.utm_medium, u.utm_campaign, u.promo
       FROM jobs j JOIN properties p ON p.id = j.property_id JOIN users u ON u.id = j.customer_id
       WHERE j.status = 'requested' AND j.driver_id IS NULL AND COALESCE(j.requested_at, j.created_at) <= ?`,
    )
    .all(cutoff);
  for (const j of stale) {
    // Same guard as an accept, so a driver tapping Accept right now wins cleanly.
    const done = db
      .prepare("UPDATE jobs SET status = 'cancelled', cancelled_at = ?, cancel_reason = 'no_driver' WHERE id = ? AND status = 'requested' AND driver_id IS NULL")
      .run(nowIso(), j.id);
    if (!done.changes) continue;
    await voidJob(j.id).catch((e) => console.error(`timeout void for job #${j.id} failed`, e.message));
    const hold = j.payment_status === 'authorized' && j.card_label && !j.covered;
    notify(
      j.customer_id,
      'No drivers available',
      hold
        ? "No drivers were free nearby, so we released the hold on your card. We'll text you when we're plowing your area."
        : "No drivers were free nearby, so we cancelled this request. You weren't charged. We'll text you when we're plowing your area.",
      j.id,
    );
    try {
      addLead({ email: j.email, phone: j.phone, address: j.address, lat: j.lat, lng: j.lng, source: 'no_driver', userId: j.customer_id, attribution: j });
    } catch (e) {
      console.error(`waitlist for job #${j.id} failed`, e.message);
    }
    broadcastJob(j.id);
    console.log(`job #${j.id} cancelled: no driver accepted within ${UNACCEPTED_TIMEOUT_MIN} min`);
  }
  return stale.length;
}
