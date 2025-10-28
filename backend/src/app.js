require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const path = require('path');
const fs = require('fs');

const { UPLOAD_ROOT, SLIP_DIR } = require('./utils/uploadPaths');

// const uploadRoot = path.join(__dirname, 'uploads');
// const slipDir = path.join(uploadRoot, 'slips');
fs.mkdirSync(SLIP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const adminRoutes = require('./modules/admin/admin.routes.js');
const roomRoutes = require('./modules/room/room.routes.js');
const banquetRoutes = require('./modules/banquet/banquet.routes.js');

const reservationRoomRoutes = require('./modules/reservation/room/reservationRoom.routes');
const reservationBanquetRoutes = require('./modules/reservation/banquet/reservationBanquet.routes');

const roomImageRoutes = require('./modules/room/image/roomImage.routes');
const banquetImageRoutes = require('./modules/banquet/image/banquetImage.routes');

const paymentRoutes = require('./modules/payment/payment.routes');
const { publicRateLimit } = require("./middlewares/ratelimit");

const app = express();
const port = process.env.PORT || 8800;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

app.use(cors({ 
  origin: FRONTEND_ORIGIN, 
  credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

app.get('/api/ping', (_req, res) => res.json({ message: 'API is working!' }));

app.use('/uploads', express.static(UPLOAD_ROOT));

/* ⬇️ ใส่ rate limit เฉพาะเส้น public ที่เสี่ยง spam — ต้องอยู่ก่อนผูก routes */
app.use('/api/reservations', publicRateLimit);                 // สร้างการจอง (public)
app.use('/api/payments', publicRateLimit);                     // อัปสลิป (public)
app.use('/api/reservations/room/status', publicRateLimit);    // เช็คสถานะด้วยโค้ด (public)
app.use('/api/reservations/banquets/status', publicRateLimit); // เช็คสถานะด้วยโค้ด (public)

const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

app.use('/api', adminRoutes);
app.use('/api', roomRoutes);
app.use('/api', banquetRoutes);

app.use('/api', reservationRoomRoutes);
app.use('/api', reservationBanquetRoutes);

app.use('/api', roomImageRoutes);
app.use('/api', banquetImageRoutes);

app.use('/api/payments', paymentRoutes); // /api/payments/upload-slip (public)
app.use('/api', dashboardRoutes);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`CORS origin: ${FRONTEND_ORIGIN}`);
});
