const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const authRoutes       = require('./routes/auth');
const adminRoutes      = require('./routes/admin');
const shopkeeperRoutes = require('./routes/shopkeeper');
const uploadRoutes     = require('./routes/upload');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  // Shopkeeper joins their own room so they receive real-time uploads
  socket.on('join-shop', (shopId) => {
    socket.join(shopId);
  });
  socket.on('disconnect', () => {});
});

// expose io to route handlers via app.get('io')
app.set('io', io);

// ── Core Middleware ───────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/shopkeeper', shopkeeperRoutes);
app.use('/api/upload',     uploadRoutes);

// ── Health Check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── MongoDB ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅  MongoDB connected'))
  .catch((err) => { console.error('❌  MongoDB error:', err); process.exit(1); });

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
