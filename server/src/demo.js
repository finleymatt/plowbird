// Demo mode: lets plowbird.app be tried end to end without a truck on the road.
// On in development; in production only with DEMO_MODE=1. Turn it off once real drivers are online,
// or the demo driver will take every order.
//
// - New ASAP orders are auto-accepted by the demo driver (DEMO_DRIVER_EMAIL, default
//   driver@plowbird.test), who then drives the real road route to the driveway.
// - Drivers can also start a demo drive from their job screen.
import { db, nowIso } from './db.js';
import { broadcastJob, getJob, milesBetween, notify, updateDriverLocation } from './jobs.js';
import { drivingRoute } from './routing.js';

export const DEMO = process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === '1';
const DEMO_DRIVER_EMAIL = process.env.DEMO_DRIVER_EMAIL ?? 'driver@plowbird.test';
const ACCEPT_AFTER_MS = 6_000; // long enough for the customer to see "Finding your driver"
const DRIVE_AFTER_MS = 4_000;
const TICKS = 45; // ~70 seconds of driving, one position every 1.5 s

const drives = new Map();

// Move the job's driver along the real road route to the driveway. Returns the drive length in seconds.
export async function startDemoDrive(jobId) {
  const job = getJob(jobId);
  if (!job?.driver || !['accepted', 'en_route'].includes(job.status)) return 0;
  // Start from the truck's real position if it's a sensible distance away, else ~2.5 mi out.
  const here = job.driver.lat != null ? { lat: job.driver.lat, lng: job.driver.lng } : null;
  const miles = here ? milesBetween(here, job.property) : null;
  const start = here && miles > 0.5 && miles < 15 ? here : { lat: job.property.lat + 0.025, lng: job.property.lng - 0.03 };
  const { coords } = await drivingRoute(start, job.property);

  if (job.status === 'accepted') {
    db.prepare("UPDATE jobs SET status = 'en_route' WHERE id = ? AND status = 'accepted'").run(job.id);
    const updated = broadcastJob(job.id);
    notify(job.customer.id, `${job.driver.name} is on the way`, `ETA about ${updated.etaMinutes ?? 10} min to ${job.property.address}.`, job.id);
  }
  clearInterval(drives.get(job.id));
  let tick = 0;
  const timer = setInterval(() => {
    tick++;
    const [lat, lng] = coords[Math.min(coords.length - 1, Math.round((tick / TICKS) * (coords.length - 1)))];
    updateDriverLocation(job.driver.id, lat, lng);
    if (tick >= TICKS) {
      clearInterval(timer);
      drives.delete(job.id);
    }
  }, 1500);
  drives.set(job.id, timer);
  return Math.round(TICKS * 1.5);
}

// A new ASAP order: have the demo driver accept it after a moment, then drive over.
export function autoAcceptForDemo(jobId) {
  if (!DEMO) return;
  setTimeout(() => {
    const driver = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'driver'").get(DEMO_DRIVER_EMAIL);
    if (!driver) return;
    // Same guard as a real accept: only if nobody has taken it yet.
    const taken = db
      .prepare("UPDATE jobs SET driver_id = ?, status = 'accepted', accepted_at = ? WHERE id = ? AND driver_id IS NULL AND status = 'requested'")
      .run(driver.id, nowIso(), jobId);
    if (!taken.changes) return;
    // Put the truck a couple of miles out so there's a route to watch.
    const job = getJob(jobId);
    db.prepare('UPDATE users SET lat = ?, lng = ?, location_at = ? WHERE id = ?').run(job.property.lat + 0.025, job.property.lng - 0.03, nowIso(), driver.id);
    const updated = broadcastJob(jobId);
    notify(job.customer.id, 'Driver confirmed', `${driver.name} will plow ${job.property.label.toLowerCase()} — ETA about ${updated.etaMinutes ?? 15} min.`, jobId);
    notify(driver.id, 'Auto-accepted (demo)', `${job.property.address} was accepted for you in demo mode.`, jobId);
    setTimeout(() => startDemoDrive(jobId).catch((e) => console.error(`demo drive for job #${jobId} failed`, e.message)), DRIVE_AFTER_MS);
  }, ACCEPT_AFTER_MS);
}
