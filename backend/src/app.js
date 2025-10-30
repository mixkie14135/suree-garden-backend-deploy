require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const path = require('path');
const fs = require('fs');

const { UPLOAD_ROOT, SLIP_DIR } = require('./utils/uploadPaths');

fs.mkdirSync(SLIP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const adminRoutes = require('./modules/admin/admin.routes.js');
const roomRoutes = require('./modules/room/room.routes.js');
const banquetRoutes = require('./modules/banquet/banquet.routes.js');

const reservationRoomRoutes = require('./modules/reservation/room/reservationRoom.routes');
const reservationBanquetRoutes = require('./modules/reservation/banquet/reservationBanquet.routes');
const reservationResolveRoutes = require('./modules/reservation/resolve.routes'); // ⬅️ เพิ่ม

const roomImageRoutes = require('./modules/room/image/roomImage.routes');
const banquetImageRoutes = require('./modules/banquet/image/banquetImage.routes');

const paymentRoutes = require('./modules/payment/payment.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const { publicRateLimit } = require("./middlewares/ratelimit");

const app = express();
const port = process.env.PORT || 8800;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

/* ========= GLOBAL DEBUG LOGGER ========= */
app.use((req, res, next) => {
  const rid = Math.random().toString(36).slice(2, 8);
  req._rid = rid;
  const start = Date.now();

  console.log(`[REQ ${rid}] ${req.method} ${req.originalUrl}`);
  console.log(`  - ip=${req.ip} origin=${req.headers.origin || '-'} referer=${req.headers.referer || '-'}`);
  console.log(`  - ua=${req.headers['user-agent'] || '-'}`);
  console.log(`  - content-type=${req.headers['content-type'] || '-'}  accept=${req.headers['accept'] || '-'}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try { console.log(`  - body=`, req.body); } catch {}
  }
  console.log(`  - query=`, req.query);

  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[RES ${rid}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms) content-type=${res.getHeader('content-type') || '-'}`);
  });
  next();
});

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

/* บังคับทุก response ภายใต้ /api ให้เป็น JSON เพื่อตัดปัญหา dev server ส่ง HTML */
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.get('/api/ping', (_req, res) => res.json({ message: 'API is working!' }));

app.use('/uploads', express.static(UPLOAD_ROOT));

/* Rate limit สำหรับเส้น public */
app.use('/api/reservations', publicRateLimit);                    // สร้างการจอง (public)
app.use('/api/payments', publicRateLimit);                        // อัปสลิป (public)
app.use('/api/reservations/room/status', publicRateLimit);        // เช็คสถานะห้องพัก
app.use('/api/room/reservations/status', publicRateLimit);        // alias
app.use('/api/reservations/banquet/status', publicRateLimit);     // เช็คสถานะจัดเลี้ยง
app.use('/api/reservations/resolve', publicRateLimit);            // ⬅️ เพิ่ม resolver

/* ผูก routes */
app.use('/api', adminRoutes);
app.use('/api', roomRoutes);
app.use('/api', banquetRoutes);

app.use('/api', reservationRoomRoutes);
app.use('/api', reservationBanquetRoutes);
app.use('/api', reservationResolveRoutes); // ⬅️ เพิ่ม

app.use('/api', roomImageRoutes);
app.use('/api', banquetImageRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/api', dashboardRoutes);

/* 404 JSON เฉพาะใน /api */
app.use('/api', (req, res) => {
  console.warn(`[404 API] ${req._rid} ${req.method} ${req.originalUrl}`);
  res.status(404).json({ status: 'error', message: 'API route not found' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`CORS origin: ${FRONTEND_ORIGIN}`);
});
