import './env.js';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { api } from './routes.js';
import { adminApi } from './admin.js';
import { driversApi } from './drivers.js';
import { messagesApi } from './messages.js';
import { leadsApi } from './leads.js';
import { verifyToken } from './auth.js';
import { attachIo, updateDriverLocation } from './jobs.js';
import { PaymentError, registerWalletDomains } from './payments.js';
import { startScheduler } from './scheduler.js';
import { startTicker } from './ticker.js';
import { buildAddressIndex } from './address-index.js';

const PORT = Number(process.env.PORT ?? 4000);

const app = express();
// Behind Render's (or any) HTTPS proxy, so req.protocol reports https for payout return links.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', api);
app.use('/api', messagesApi);
app.use('/api', leadsApi);
app.use('/api', driversApi);
app.use('/api', adminApi);
app.use((err, req, res, next) => {
  if (err instanceof PaymentError) return res.status(402).json({ error: err.message, code: err.code });
  console.error(err);
  if (err?.type?.startsWith?.('Stripe')) return res.status(502).json({ error: `Payments are unavailable right now (${err.message})` });
  res.status(500).json({ error: 'Something went wrong on our end' });
});

const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
attachIo(io);

io.use((socket, next) => {
  try {
    socket.data.user = verifyToken(socket.handshake.auth?.token);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  const { id, role } = socket.data.user;
  socket.join(`user:${id}`);
  if (role === 'driver') {
    socket.join('drivers');
    // Drivers stream GPS over the socket instead of hammering the REST API.
    socket.on('location', ({ lat, lng } = {}) => {
      if (typeof lat === 'number' && typeof lng === 'number') updateDriverLocation(id, lat, lng);
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Plowbird API listening on http://localhost:${PORT}`);
  startScheduler();
  startTicker();
  buildAddressIndex(); // first boot only; runs in the background
  registerWalletDomains().catch(() => {});
});
