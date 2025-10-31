// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const path = require('path');
const fs = require('fs');

const { UPLOAD_ROOT, SLIP_DIR } = require('./utils/uploadPaths');

fs.mkdirSync(SLIP_DIR, { recursive: true });    // ยังสร้างไว้ เพราะยังมีรูปอื่นๆใน /uploads
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const adminRoutes = require('./modules/admin/admin.routes.js');
const roomRoutes = require('./modules/room/room.routes.js');
const banquetRoutes = require('./modules/banquet/banquet.routes.js');

const reservationRoomRoutes = require('./modules/reservation/room/reservationRoom.routes');
const reservationBanquetRoutes = require('./modules/reservation/banquet/reservationBanquet.routes');
const reservationResolveRoutes = require('./modules/reservation/resolve.routes');

const roomImageRoutes = require('./modules/room/image/roomImage.routes');
const banquetImageRoutes = require('./modules/banquet/image/banquetImage.routes');

const paymentRoutes = require('./modules/payment/payment.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const { publicRateLimit } = require("./middlewares/ratelimit");

const app = express();
const port = process.env.PORT || 8800;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

/* ===== Essentials ===== */
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/* ===== Minimal logger (ตัด noise ออก) ===== */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

/* ทุก /api ตอบ JSON */
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

/* Healthcheck */
app.get('/api/ping', (_req, res) => res.json({ message: 'API is working!' }));

/* เสิร์ฟไฟล์อัปโหลด (ยังต้องใช้สำหรับรูปห้อง/จัดเลี้ยง) */
app.use('/uploads', express.static(UPLOAD_ROOT));

/* ===== Public rate limit เฉพาะเส้นที่เป็น public จริง ===== */
app.use('/api/reservations', publicRateLimit);                 // create reservation
app.use('/api/reservations/room/status', publicRateLimit);     // check room status
app.use('/api/room/reservations/status', publicRateLimit);     // alias
app.use('/api/reservations/banquet/status', publicRateLimit);  // check banquet status
app.use('/api/reservations/resolve', publicRateLimit);         // resolver

// ❌ ลบออกทั้งบรรทัดนี้ เพราะเราใส่ limiter ที่เส้น /verify-and-apply ภายใน payment.routes แล้ว
// app.use('/api/payments', publicRateLimit);

/* ===== Mount routes ===== */
app.use('/api', adminRoutes);
app.use('/api', roomRoutes);
app.use('/api', banquetRoutes);

app.use('/api', reservationRoomRoutes);
app.use('/api', reservationBanquetRoutes);
app.use('/api', reservationResolveRoutes);

app.use('/api', roomImageRoutes);
app.use('/api', banquetImageRoutes);

app.use('/api/payments', paymentRoutes); // ตรงนี้ “ผูก router” อย่างเดียว ไม่ครอบ limiter ทั้งกลุ่ม

app.use('/api', dashboardRoutes);

/* 404 เฉพาะ /api */
app.use('/api', (req, res) => {
  res.status(404).json({ status: 'error', message: 'API route not found' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`CORS origin: ${FRONTEND_ORIGIN}`);
});
