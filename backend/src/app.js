require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const { UPLOAD_ROOT, SLIP_DIR } = require('./utils/uploadPaths');

// สร้างโฟลเดอร์ upload ถ้ายังไม่มี
fs.mkdirSync(SLIP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// Routes
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

// ===== CORS =====
const allowedOrigins = [
  'https://suree-garden.vercel.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error(`CORS policy: Origin ${origin} not allowed`));
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

// Mount routes **แนะนำให้ mount แบบ prefix เฉพาะแต่ละโมดูล**
app.use('/api/admin', adminRoutes);
app.use('/api/rooms', roomRoutes);       // เปลี่ยนจาก /api -> /api/rooms
app.use('/api/banquets', banquetRoutes); // เปลี่ยนจาก /api -> /api/banquets

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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});
