// Moving a job through the driver's steps: on the way → plowing → done (and charged).
// Used by the driver's buttons and by the demo driver.
import { db, nowIso } from './db.js';
import { broadcastJob, notify } from './jobs.js';
import { settleJob } from './payments.js';
import { onJobCompleted } from './referrals.js';

export const DRIVER_FLOW = { accepted: 'en_route', en_route: 'in_progress', in_progress: 'completed' };
const STATUS_COPY = {
  en_route: (j) => [`${j.driver.name} is on the way`, `ETA about ${j.etaMinutes ?? 10} min to ${j.property.address}.`],
  in_progress: (j) => ['Plowing has started', `${j.driver.name} is clearing your driveway now.`],
  completed: (j) => ['Your driveway is clear ❄️', `Rate ${j.driver.name} and add a tip — 100% goes to your driver.`],
};

// Advance `job` (from getJob) one step. Returns the updated job, or null if it changed underneath us.
export async function advanceJob(job) {
  const next = DRIVER_FLOW[job.status];
  const stamp = { in_progress: 'started_at', completed: 'completed_at' }[next];
  // Conditional on the current status so a double tap can't complete (and charge) twice.
  const moved = db
    .prepare(`UPDATE jobs SET status = ?${stamp ? `, ${stamp} = ?` : ''} WHERE id = ? AND status = ?`)
    .run(...(stamp ? [next, nowIso(), job.id, job.status] : [next, job.id, job.status]));
  if (!moved.changes) return null;
  const paid = next === 'completed' ? await settleJob(job.id) : true;
  if (next === 'completed' && paid) onJobCompleted(job.id);
  const updated = broadcastJob(job.id);
  const [title, body] = STATUS_COPY[next](updated);
  notify(job.customer.id, title, body, job.id);
  if (!paid)
    notify(job.customer.id, 'Payment didn’t go through', `We couldn't charge ${updated.cardLabel ?? 'your card'} for ${job.property.address}. Update your card in Account.`, job.id);
  return updated;
}
