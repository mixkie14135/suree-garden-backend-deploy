require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const { UPLOAD_ROOT, SLIP_DIR } = require('./utils/uploadPaths');

// สร้างโฟลเดอร์ upload ถ้ายังไม่มี
fs.mkdirSync(SLIP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// ===== Routes =====
const adminRoutes = require('./modules/admin/admin.routes');
const roomRoutes = require('./modules/room/room.routes'); // รวม roomType.routes.js ภายในนี้
const banquetRoutes = require('./modules/banquet/banquet.routes');

const reservationRoomRoutes = require('./modules/reservation/room/reservationRoom.routes');
const reservationBanquetRoutes = require('./modules/reservation/banquet/reservationBanquet.routes');
const reservationResolveRoutes = require('./modules/reservation/resolve.routes');

const roomImageRoutes = require('./modules/room/image/roomImage.routes');
const banquetImageRoutes = require('./modules/banquet/image/banquetImage.routes');

const paymentRoutes = require('./modules/payment/payment.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const { publicRateLimit } = require('./middlewares/ratelimit');

const app = express();
const port = process.env.PORT || 8800;

// ===== CORS setup =====
const envOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
if (process.env.FRONTEND_ORIGIN) envOrigins.push(process.env.FRONTEND_ORIGIN.trim());

const devLocal = 'http://localhost:5173';
if (!envOrigins.includes(devLocal)) envOrigins.push(devLocal);

const allowedOrigins = Array.from(new Set(envOrigins));
const allowVercelPreviews = String(process.env.ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    if (allowVercelPreviews) {
      try {
        const u = new URL(origin);
        if (u.hostname.endsWith('.vercel.app')) return callback(null, true);
      } catch {}
    }

    return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true
}));

// ===== Middleware =====
app.use(express.json());
app.use(cookieParser());

// Minimal logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Healthcheck
app.get('/api/ping', (_req, res) => res.json({ message: 'API is working!' }));

// เสิร์ฟไฟล์อัปโหลด
app.use('/uploads', express.static(UPLOAD_ROOT));

// Public rate limit
app.use('/api/reservations', publicRateLimit);
app.use('/api/reservations/room/status', publicRateLimit);
app.use('/api/room/reservations/status', publicRateLimit);
app.use('/api/reservations/banquet/status', publicRateLimit);
app.use('/api/reservations/resolve', publicRateLimit);

// ===== Mount Routes =====
app.use('/api/admin', adminRoutes);
app.use('/api/rooms', roomRoutes);       // รวม roomType
app.use('/api/banquets', banquetRoutes);

app.use('/api/reservations/room', reservationRoomRoutes);
app.use('/api/reservations/banquet', reservationBanquetRoutes);
app.use('/api/reservations/resolve', reservationResolveRoutes);

app.use('/api/room-images', roomImageRoutes);
app.use('/api/banquet-images', banquetImageRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 เฉพาะ /api
app.use('/api', (_req, res) => {
  res.status(404).json({ status: 'error', message: 'API route not found' });
});

// ===== Debug: list routes =====
function printRoutes(stack, prefix = '') {
  stack.forEach(layer => {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle?.stack) {
      printRoutes(layer.handle.stack, prefix + (layer.regexp?.source?.replace('\\/?', '').replace('^','').replace('?', '').replace(/\\+/g, '') || ''));
    }
  });
}

console.log('==== ROUTES LIST ====');
printRoutes(app._router.stack);
console.log('====================');

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  console.log(`ALLOW_VERCEL_PREVIEWS=${allowVercelPreviews}`);
});
