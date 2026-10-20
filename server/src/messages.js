// In-app chat between a job's customer and its driver, so neither ever sees the other's phone number.
//
// - Only the customer and the currently assigned driver can read or write, and only once a driver
//   has the job and while it isn't cancelled. Sending closes 24 hours after the job is done.
// - A driver who releases a job loses the thread; the next driver starts fresh (each message
//   records its recipient, so a thread is scoped to the customer + one driver).
// - New messages go out live over Socket.IO ('message') to both people's rooms, and the recipient
//   gets an in-app notification. 'messages:read' tells the sender their messages were seen.
import { Router } from 'express';
import { requireAuth } from './auth.js';
import { db, nowIso } from './db.js';
import { getIo, getJob, notify } from './jobs.js';

db.exec(`
CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id       INTEGER NOT NULL REFERENCES jobs(id),
  sender_id    INTEGER NOT NULL REFERENCES users(id),
  recipient_id INTEGER NOT NULL REFERENCES users(id),
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  read_at      TEXT
);
CREATE INDEX IF NOT EXISTS messages_job ON messages(job_id, id);
CREATE INDEX IF NOT EXISTS messages_unread ON messages(recipient_id, read_at);
`);

export const MAX_MESSAGE_LENGTH = 1000;
const OPEN_AFTER_DONE_MS = 24 * 60 * 60_000;
// Generous for real conversation (and quick-reply taps), tight enough to stop a flood.
const RATE_LIMITS = [
  { count: 8, ms: 20_000 },
  { count: 120, ms: 60 * 60_000 },
];

const serialize = (m) => ({ id: m.id, jobId: m.job_id, senderId: m.sender_id, body: m.body, createdAt: m.created_at, readAt: m.read_at });

// Who's talking on this job, and whether new messages can still be sent. Null `error` means OK.
function access(job, userId) {
  const isCustomer = job?.customer.id === userId;
  const isDriver = !!job?.driver && job.driver.id === userId;
  if (!isCustomer && !isDriver) return { error: 'Job not found', code: 404 };
  if (job.status === 'cancelled') return { error: 'This job was cancelled, so its chat is closed', code: 403 };
  if (!job.driver) return { error: 'Chat opens once a driver accepts your job', code: 403 };
  const otherId = isCustomer ? job.driver.id : job.customer.id;
  const closed = job.status === 'completed' && Date.now() - Date.parse(job.completedAt ?? nowIso()) > OPEN_AFTER_DONE_MS;
  return { otherId, otherName: isCustomer ? job.driver.name : job.customer.name, open: !closed };
}

// Messages between the customer and the job's current driver, oldest first.
const threadRows = (job) =>
  db
    .prepare('SELECT * FROM messages WHERE job_id = ? AND (sender_id = ? OR recipient_id = ?) ORDER BY id')
    .all(job.id, job.driver.id, job.driver.id);

const sent = new Map(); // userId -> recent send times, for the rate limit
function rateLimited(userId) {
  const now = Date.now();
  const longest = Math.max(...RATE_LIMITS.map((l) => l.ms));
  const times = (sent.get(userId) ?? []).filter((t) => now - t < longest);
  sent.set(userId, times);
  if (RATE_LIMITS.some((l) => times.filter((t) => now - t < l.ms).length >= l.count)) return true;
  times.push(now);
  return false;
}

export const messagesApi = Router();
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

messagesApi.get('/jobs/:id/messages', requireAuth, (req, res) => {
  const job = getJob(req.params.id);
  const a = access(job, req.user.id);
  if (a.error) return bad(res, a.error, a.code);
  const messages = threadRows(job).map(serialize);
  res.json({
    messages,
    open: a.open,
    unread: messages.filter((m) => m.senderId !== req.user.id && !m.readAt).length,
  });
});

messagesApi.post('/jobs/:id/messages', requireAuth, (req, res) => {
  const job = getJob(req.params.id);
  const a = access(job, req.user.id);
  if (a.error) return bad(res, a.error, a.code);
  if (!a.open) return bad(res, 'This chat closed 24 hours after the job was done', 403);
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body) return bad(res, 'Type a message first');
  if (body.length > MAX_MESSAGE_LENGTH) return bad(res, `Messages can be up to ${MAX_MESSAGE_LENGTH} characters`);
  if (rateLimited(req.user.id)) return bad(res, 'You’re sending messages too quickly. Wait a moment and try again.', 429);

  const info = db
    .prepare('INSERT INTO messages (job_id, sender_id, recipient_id, body) VALUES (?, ?, ?, ?)')
    .run(job.id, req.user.id, a.otherId, body);
  const message = serialize(db.prepare('SELECT * FROM messages WHERE id = ?').get(Number(info.lastInsertRowid)));
  // Both rooms: the recipient, and the sender's other devices/tabs (clients dedupe by id).
  getIo()?.to(`user:${a.otherId}`).to(`user:${req.user.id}`).emit('message', message);
  const senderName = (a.otherId === job.customer.id ? job.driver.name : job.customer.name).split(' ')[0];
  notify(a.otherId, `Message from ${senderName}`, body.length > 140 ? `${body.slice(0, 139)}…` : body, job.id, { kind: 'message' });
  res.json(message);
});

// The reader has seen everything the other person sent on this job.
messagesApi.post('/jobs/:id/messages/read', requireAuth, (req, res) => {
  const job = getJob(req.params.id);
  const a = access(job, req.user.id);
  if (a.error) return bad(res, a.error, a.code);
  const readAt = nowIso();
  const r = db
    .prepare('UPDATE messages SET read_at = ? WHERE job_id = ? AND recipient_id = ? AND sender_id = ? AND read_at IS NULL')
    .run(readAt, job.id, req.user.id, a.otherId);
  if (r.changes) getIo()?.to(`user:${a.otherId}`).to(`user:${req.user.id}`).emit('messages:read', { jobId: job.id, readerId: req.user.id, readAt });
  res.json({ ok: true, readAt });
});

// Unread counts across the signed-in user's live threads, for badges on job lists.
messagesApi.get('/messages/unread', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT m.job_id, COUNT(*) n FROM messages m JOIN jobs j ON j.id = m.job_id
       WHERE m.recipient_id = ? AND m.read_at IS NULL AND j.status != 'cancelled'
         AND j.driver_id IN (m.sender_id, m.recipient_id)
       GROUP BY m.job_id`,
    )
    .all(req.user.id);
  const byJob = Object.fromEntries(rows.map((r) => [r.job_id, r.n]));
  res.json({ total: rows.reduce((s, r) => s + r.n, 0), byJob });
});
