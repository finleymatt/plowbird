// Plowbird staff: the people whose emails are in ADMIN_EMAILS (comma-separated) on the API server.
// They review driver applications and see the numbers at /admin in the app.
import { Router } from 'express';
import { requireAuth } from './auth.js';
import { db } from './db.js';
import { DEMO } from './env.js';

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);
// Locally (demo mode with no ADMIN_EMAILS set) the demo customer can try the admin page.
if (!ADMIN_EMAILS.size && DEMO && process.env.NODE_ENV !== 'production') ADMIN_EMAILS.add('customer@plowbird.test');

export const isAdminEmail = (email) => !!email && ADMIN_EMAILS.has(String(email).toLowerCase());
export const adminIds = () =>
  db
    .prepare('SELECT id, email FROM users')
    .all()
    .filter((u) => isAdminEmail(u.email))
    .map((u) => u.id);

export function requireAdmin(req, res, next) {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
  if (!isAdminEmail(user?.email)) return res.status(403).json({ error: 'Only Plowbird staff can do that' });
  next();
}

export const adminApi = Router();

// The launch numbers that matter: drivers by status, customers, orders, promo use.
adminApi.get('/admin/summary', requireAuth, requireAdmin, (req, res) => {
  const count = (sql, ...args) => db.prepare(sql).get(...args).n;
  const drivers = Object.fromEntries(
    db
      .prepare("SELECT COALESCE(driver_status, 'none') status, COUNT(*) n FROM users WHERE role = 'driver' GROUP BY 1")
      .all()
      .map((r) => [r.status, r.n]),
  );
  const jobs = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM jobs GROUP BY status').all().map((r) => [r.status, r.n]));
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  res.json({
    customers: count("SELECT COUNT(*) n FROM users WHERE role = 'customer'"),
    customersThisWeek: count("SELECT COUNT(*) n FROM users WHERE role = 'customer' AND created_at >= ?", weekAgo),
    drivers: { none: 0, pending: 0, approved: 0, rejected: 0, ...drivers },
    driversOnline: count("SELECT COUNT(*) n FROM users WHERE role = 'driver' AND online = 1"),
    jobs,
    jobsThisWeek: count('SELECT COUNT(*) n FROM jobs WHERE created_at >= ?', weekAgo),
    promoRedemptions: count("SELECT COUNT(*) n FROM jobs WHERE promo_code IS NOT NULL AND status != 'cancelled'"),
    stormPasses: count("SELECT COUNT(*) n FROM subscriptions WHERE status = 'active'"),
  });
});
