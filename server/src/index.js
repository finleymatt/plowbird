import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { api, updateDriverLocation } from './routes.js';
import { verifyToken } from './auth.js';
import { attachIo } from './jobs.js';
import { startScheduler } from './scheduler.js';

const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', api);
app.use((err, req, res, next) => {
  console.error(err);
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
  console.log(`PlowNow API listening on http://localhost:${PORT}`);
  startScheduler();
});
