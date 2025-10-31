// backend/src/modules/reservation/banquet/reservationBanquet.routes.js
const express = require('express');
const {
  createReservationBanquet,
  getReservationBanquetStatusByCode,
  // Admin
  getReservationBanquets,
  getReservationBanquet,
  updateReservationBanquet,
  deleteReservationBanquet
} = require('./reservationBanquet.controller');

const { requireAdminAuth } = require('../../../middlewares/authAdmin');

// (แนะนำ) ใส่ rate-limit ให้ endpoint public
const rateLimit = require('express-rate-limit');
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
});

const router = express.Router();

/* ===== Public (ลูกค้า) ===== */
router.post('/reservations/banquet', (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] POST /reservations/banquet`);
  next();
}, createReservationBanquet);

router.get('/reservations/banquet/status', statusLimiter, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] GET /reservations/banquet/status code=${req.query.code || '-'}  url=${req.originalUrl}`);
  next();
}, getReservationBanquetStatusByCode);

// เส้น alias เผื่อผู้ใช้พิมพ์สลับลำดับ segment
router.get('/banquet/reservations/status', statusLimiter, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] GET /banquet/reservations/status code=${req.query.code || '-'}  url=${req.originalUrl}`);
  next();
}, getReservationBanquetStatusByCode);

/* ===== Admin ===== */
router.get('/reservations/banquet', requireAdminAuth, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] GET /reservations/banquet (admin list)`);
  next();
}, getReservationBanquets);

router.get('/reservations/banquet/:id', requireAdminAuth, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] GET /reservations/banquet/${req.params.id} (admin get)`);
  next();
}, getReservationBanquet);

router.put('/reservations/banquet/:id', requireAdminAuth, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] PUT /reservations/banquet/${req.params.id} (admin update)`);
  next();
}, updateReservationBanquet);

router.delete('/reservations/banquet/:id', requireAdminAuth, (req, res, next) => {
  console.log(`[ROUTE ${req._rid}] DELETE /reservations/banquet/${req.params.id} (admin delete)`);
  next();
}, deleteReservationBanquet);

module.exports = router;
