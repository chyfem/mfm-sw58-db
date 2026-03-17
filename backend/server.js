// server.js — MFM SW58 Church Management System
// Crash-safe startup — always starts HTTP server even if DB is not ready
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const app  = express();
const PORT = process.env.PORT || 8000;

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 15*60*1000, max: 15 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health check (loaded FIRST before routes) ──────────────────
// Back4app hits this to confirm container is alive
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'MFM SW58 CMS running', version: '1.0.0' });
});

// ── Load API routes (after health check) ──────────────────────
try {
  const routes = require('./routes/index');
  app.use('/api', routes);
  console.log('✅  API routes loaded');
} catch (err) {
  console.error('⚠️  Routes failed to load:', err.message);
}

// ── Frontend static files ──────────────────────────────────────
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  const indexPath = path.join(frontendPath, 'index.html');
  res.sendFile(indexPath);
});

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start server IMMEDIATELY — do not wait for DB ─────────────
// This ensures port 8000 is open before Back4app health check runs
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🕊️  MFM SW58 Araromi Akure Church Management System`);
  console.log(`🚀  Server listening on port ${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗  Health check: http://localhost:${PORT}/api/health\n`);
});

// Keep server alive — handle unexpected errors without crashing
server.on('error', (err) => {
  console.error('Server error:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
  // Do NOT exit — keep server running
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  // Do NOT exit — keep server running
});

module.exports = app;
