import { db, nowIso } from './db.js';

let io = null;
export const attachIo = (server) => (io = server);
export const getIo = () => io;

export function milesBetween(a, b) {
  if (a?.lat == null || b?.lat == null) return null;
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Plow trucks on unplowed residential streets: assume ~18 mph average + 3 min to set up.
export const etaMinutes = (miles) => (miles == null ? null : Math.round((miles / 18) * 60 + 3));

export const ACTIVE_STATUSES = ['accepted', 'en_route', 'in_progress'];
// Scheduled jobs open to drivers this long before the requested time.
export const DISPATCH_LEAD_MIN = 45;

const JOB_SELECT = `
  SELECT j.*,
    p.label AS p_label, p.address AS p_address, p.lat AS p_lat, p.lng AS p_lng,
    p.size AS p_size, p.length AS p_length, p.sidewalk AS p_sidewalk, p.notes AS p_notes,
    c.name AS c_name, c.phone AS c_phone,
    d.name AS d_name, d.phone AS d_phone, d.vehicle AS d_vehicle, d.lat AS d_lat, d.lng AS d_lng,
    d.rating_sum AS d_rating_sum, d.rating_count AS d_rating_count
  FROM jobs j
  JOIN properties p ON p.id = j.property_id
  JOIN users c ON c.id = j.customer_id
  LEFT JOIN users d ON d.id = j.driver_id`;

export function serializeJob(r) {
  if (!r) return null;
  const property = {
    id: r.property_id,
    label: r.p_label,
    address: r.p_address,
    lat: r.p_lat,
    lng: r.p_lng,
    size: r.p_size,
    length: r.p_length,
    sidewalk: !!r.p_sidewalk,
    notes: r.p_notes,
  };
  const driver = r.driver_id
    ? {
        id: r.driver_id,
        name: r.d_name,
        phone: r.d_phone,
        vehicle: r.d_vehicle,
        lat: r.d_lat,
        lng: r.d_lng,
        rating: r.d_rating_count ? Math.round((r.d_rating_sum / r.d_rating_count) * 10) / 10 : null,
        ratingCount: r.d_rating_count,
      }
    : null;
  const miles = driver ? milesBetween(driver, property) : null;
  return {
    id: r.id,
    status: r.status,
    kind: r.kind,
    scheduledFor: r.scheduled_for,
    snowDepthIn: r.snow_depth_in,
    quote: JSON.parse(r.quote_json),
    priceCents: r.price_cents,
    tipCents: r.tip_cents,
    paymentStatus: r.payment_status,
    cardLabel: r.card_label,
    rating: r.rating,
    review: r.review,
    notes: r.notes,
    createdAt: r.created_at,
    acceptedAt: r.accepted_at,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    cancelledAt: r.cancelled_at,
    property,
    customer: { id: r.customer_id, name: r.c_name, phone: r.c_phone },
    driver,
    driverMiles: miles == null ? null : Math.round(miles * 10) / 10,
    etaMinutes: ['accepted', 'en_route'].includes(r.status) ? etaMinutes(miles) : null,
  };
}

export const getJob = (id) => serializeJob(db.prepare(`${JOB_SELECT} WHERE j.id = ?`).get(id));

export const listJobs = (where, ...params) =>
  db.prepare(`${JOB_SELECT} WHERE ${where} ORDER BY COALESCE(j.scheduled_for, j.created_at) DESC`).all(...params).map(serializeJob);

export function notify(userId, title, body, jobId = null) {
  const info = db
    .prepare('INSERT INTO notifications (user_id, title, body, job_id) VALUES (?, ?, ?, ?)')
    .run(userId, title, body, jobId);
  io?.to(`user:${userId}`).emit('notification', { id: Number(info.lastInsertRowid), title, body, jobId, createdAt: nowIso() });
}

// Push the latest job state to everyone who cares about it.
export function broadcastJob(jobId) {
  const job = getJob(jobId);
  if (!job || !io) return job;
  io.to(`user:${job.customer.id}`).emit('job', job);
  if (job.driver) io.to(`user:${job.driver.id}`).emit('job', job);
  io.to('drivers').emit('jobs:changed');
  return job;
}

export function marketPressure() {
  const openJobs = db.prepare("SELECT COUNT(*) n FROM jobs WHERE status = 'requested'").get().n;
  const onlineDrivers = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'driver' AND online = 1").get().n;
  return { openJobs, onlineDrivers };
}
