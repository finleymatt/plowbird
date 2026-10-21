// Staff dashboard data for /admin: the waitlist itself, and the KPIs that tell us whether the
// launch is working (demand, supply, reliability, money, retention). Only for ADMIN_EMAILS.
import { Router } from 'express';
import { requireAdmin } from './admin.js';
import { requireAuth } from './auth.js';
import { db } from './db.js';
import { SERVICE_ZIPS, serviceAreaLimited } from './service-area.js';

export const dashboardApi = Router();

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const minutesBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 60_000;
const payoutOf = (quoteJson) => {
  try {
    return JSON.parse(quoteJson).driverPayout ?? 0;
  } catch {
    return 0;
  }
};

// The waitlist, newest first. ?q= matches email, address or ZIP; ?zip= exact ZIP; ?inArea=1|0.
dashboardApi.get('/admin/leads', requireAuth, requireAdmin, (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const zip = /^\d{5}$/.test(String(req.query.zip ?? '')) ? String(req.query.zip) : null;
  let rows = db
    .prepare(
      `SELECT l.id, l.email, l.phone, l.address, l.zip, l.source, l.utm_source, l.utm_campaign, l.promo, l.created_at,
         l.user_id IS NOT NULL AS converted,
         (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = l.user_id AND j.status = 'completed') AS completed_jobs
       FROM leads l
       WHERE (? = '' OR l.email LIKE ? OR l.address LIKE ? OR l.zip LIKE ?) AND (? IS NULL OR l.zip = ?)
       ORDER BY l.created_at DESC LIMIT 1000`,
    )
    .all(q, `%${q}%`, `%${q}%`, `%${q}%`, zip, zip)
    .map((r) => ({ ...r, converted: !!r.converted, inArea: !serviceAreaLimited() || (r.zip ? SERVICE_ZIPS.has(r.zip) : null) }));
  if (req.query.inArea === '1') rows = rows.filter((r) => r.inArea === true);
  if (req.query.inArea === '0') rows = rows.filter((r) => r.inArea === false);
  res.json(rows);
});

// Everything on the dashboard in one call. ?days= sets the window for the period numbers (default 30).
dashboardApi.get('/admin/kpis', requireAuth, requireAdmin, (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const all = (sql, ...a) => db.prepare(sql).all(...a);

  // ---- demand: waitlist ----
  const leadsTotal = one('SELECT COUNT(*) n FROM leads').n;
  const leadsWeek = one('SELECT COUNT(*) n FROM leads WHERE created_at >= ?', weekAgo).n;
  const leadsConverted = one('SELECT COUNT(*) n FROM leads WHERE user_id IS NOT NULL').n;
  const topZips = all("SELECT zip, COUNT(*) n FROM leads WHERE zip IS NOT NULL GROUP BY zip ORDER BY n DESC LIMIT 10").map((r) => ({
    zip: r.zip,
    n: r.n,
    inArea: !serviceAreaLimited() || SERVICE_ZIPS.has(r.zip),
  }));
  const leadSources = all("SELECT COALESCE(utm_source, '(direct)') source, COUNT(*) n FROM leads GROUP BY 1 ORDER BY n DESC LIMIT 8");

  // ---- orders in the window ----
  const jobs = all(
    `SELECT id, customer_id, driver_id, status, kind, price_cents, tip_cents, discount_cents, quote_json, cancel_reason,
       created_at, COALESCE(requested_at, created_at) opened_at, accepted_at, started_at, completed_at
     FROM jobs WHERE created_at >= ?`,
    since,
  );
  const done = jobs.filter((j) => j.status === 'completed');
  const timedOut = jobs.filter((j) => j.status === 'cancelled' && j.cancel_reason === 'no_driver');
  const customerCancelled = jobs.filter((j) => j.status === 'cancelled' && j.cancel_reason !== 'no_driver');
  const accepted = jobs.filter((j) => j.accepted_at);
  // Fill rate: of orders that drivers saw and that resolved one way or the other, how many got a driver.
  const fillBase = accepted.length + timedOut.length;
  const gmv = done.reduce((s, j) => s + j.price_cents + j.tip_cents, 0);
  const revenue = done.reduce((s, j) => s + j.price_cents - payoutOf(j.quote_json), 0);
  const driverEarnings = done.reduce((s, j) => s + payoutOf(j.quote_json) + j.tip_cents, 0);

  // ---- customers and retention (all time) ----
  const customers = one("SELECT COUNT(*) n FROM users WHERE role = 'customer'").n;
  const customersWeek = one("SELECT COUNT(*) n FROM users WHERE role = 'customer' AND created_at >= ?", weekAgo).n;
  const perCustomer = all("SELECT customer_id, COUNT(*) n FROM jobs WHERE status = 'completed' GROUP BY customer_id");
  const ordered = perCustomer.length;
  const repeat = perCustomer.filter((r) => r.n >= 2).length;
  const rating = one('SELECT AVG(rating) avg, COUNT(rating) n FROM jobs WHERE rating IS NOT NULL');

  // ---- supply ----
  const drivers = Object.fromEntries(
    all("SELECT COALESCE(driver_status, 'none') s, COUNT(*) n FROM users WHERE role = 'driver' GROUP BY 1").map((r) => [r.s, r.n]),
  );
  const activeDrivers = one("SELECT COUNT(DISTINCT driver_id) n FROM jobs WHERE status = 'completed' AND completed_at >= ?", weekAgo).n;
  const topDrivers = all(
    `SELECT u.name, COUNT(*) jobs, ROUND(AVG(j.rating), 1) rating FROM jobs j JOIN users u ON u.id = j.driver_id
     WHERE j.status = 'completed' AND j.completed_at >= ? GROUP BY u.id ORDER BY jobs DESC LIMIT 5`,
    since,
  );

  // ---- subscriptions ----
  const passes = one("SELECT COUNT(*) n, COALESCE(SUM(price_cents), 0) mrr FROM subscriptions WHERE status = 'active'");

  // ---- last 14 days, per day ----
  const daily = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    daily.push({
      day: d,
      leads: one('SELECT COUNT(*) n FROM leads WHERE substr(created_at, 1, 10) = ?', d).n,
      signups: one("SELECT COUNT(*) n FROM users WHERE role = 'customer' AND substr(created_at, 1, 10) = ?", d).n,
      orders: one("SELECT COUNT(*) n FROM jobs WHERE status != 'cancelled' AND substr(created_at, 1, 10) = ?", d).n,
    });
  }

  res.json({
    days,
    serviceZips: [...SERVICE_ZIPS],
    waitlist: { total: leadsTotal, thisWeek: leadsWeek, converted: leadsConverted, topZips, sources: leadSources },
    orders: {
      total: jobs.length,
      completed: done.length,
      timedOut: timedOut.length,
      customerCancelled: customerCancelled.length,
      fillRate: fillBase ? accepted.length / fillBase : null,
      medianMinutesToAccept: median(accepted.map((j) => minutesBetween(j.opened_at, j.accepted_at)).filter((m) => m >= 0)),
      medianMinutesToClear: median(done.filter((j) => j.accepted_at).map((j) => minutesBetween(j.accepted_at, j.completed_at))),
      stormAuto: jobs.filter((j) => j.kind === 'storm_auto').length,
      scheduled: jobs.filter((j) => j.kind === 'scheduled').length,
    },
    money: {
      gmvCents: gmv,
      revenueCents: revenue,
      driverEarningsCents: driverEarnings,
      tipsCents: done.reduce((s, j) => s + j.tip_cents, 0),
      promoCostCents: done.reduce((s, j) => s + (j.discount_cents ?? 0), 0),
      avgOrderCents: done.length ? Math.round(done.reduce((s, j) => s + j.price_cents, 0) / done.length) : null,
      stormPassMrrCents: passes.mrr,
    },
    customers: {
      total: customers,
      thisWeek: customersWeek,
      ordered,
      repeatRate: ordered ? repeat / ordered : null,
      avgRating: rating.n ? Math.round(rating.avg * 10) / 10 : null,
      ratings: rating.n,
      stormPasses: passes.n,
    },
    drivers: {
      approved: drivers.approved ?? 0,
      pending: drivers.pending ?? 0,
      online: one("SELECT COUNT(*) n FROM users WHERE role = 'driver' AND online = 1").n,
      activeThisWeek: activeDrivers,
      top: topDrivers,
    },
    daily,
  });
});
