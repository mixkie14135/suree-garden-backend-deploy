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
    windowMs: 60 * 1000, // 1 นาที
    max: 30, 
});

const router = express.Router();

// ===== Public (ลูกค้า) =====
router.post('/reservations/banquet', createReservationBanquet);
router.get('/reservations/banquet/status', statusLimiter, getReservationBanquetStatusByCode);

// ===== Admin =====
router.get('/reservations/banquet', requireAdminAuth, getReservationBanquets);
router.get('/reservations/banquet/:id', requireAdminAuth, getReservationBanquet);
router.put('/reservations/banquet/:id', requireAdminAuth, updateReservationBanquet);
router.delete('/reservations/banquet/:id', requireAdminAuth, deleteReservationBanquet);

module.exports = router;
