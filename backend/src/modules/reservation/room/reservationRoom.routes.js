// backend/src/modules/reservation/room/reservationRoom.routes.js
const express = require('express');
const {
  createReservationRoom,
  getReservationRoomStatusByCode,
  // Admin
  getReservationRooms,
  getReservationRoom,
  updateReservationRoom,
  deleteReservationRoom
} = require('./reservationRoom.controller');

const { requireAdminAuth } = require('../../../middlewares/authAdmin');

const rateLimit = require('express-rate-limit');
const statusLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

const router = express.Router();

/* ===== Public (ลูกค้า) ===== */
router.post('/reservations/room', (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] POST /reservations/room`);
  next();
}, createReservationRoom);

// แบบที่คุณเรียกอยู่
router.get('/reservations/room/status', statusLimiter, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] GET /reservations/room/status code=${req.query.code || '-'} url=${req.originalUrl}`);
  next();
}, getReservationRoomStatusByCode);

// alias เผื่อโปรยลำดับ segment (กันสับสน)
router.get('/room/reservations/status', statusLimiter, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] GET /room/reservations/status code=${req.query.code || '-'} url=${req.originalUrl}`);
  next();
}, getReservationRoomStatusByCode);

/* ===== Admin ===== */
router.get('/reservations/room', requireAdminAuth, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] GET /reservations/room (admin list)`);
  next();
}, getReservationRooms);

router.get('/reservations/room/:id', requireAdminAuth, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] GET /reservations/room/${req.params.id} (admin get)`);
  next();
}, getReservationRoom);

router.put('/reservations/room/:id', requireAdminAuth, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] PUT /reservations/room/${req.params.id} (admin update)`);
  next();
}, updateReservationRoom);

router.delete('/reservations/room/:id', requireAdminAuth, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] DELETE /reservations/room/${req.params.id} (admin delete)`);
  next();
}, deleteReservationRoom);

module.exports = router;
