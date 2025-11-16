const express = require('express');
const {
  createReservationBanquet,
  getReservationBanquetStatusByCode,
  getReservationBanquets,
  getReservationBanquet,
  updateReservationBanquet,
  deleteReservationBanquet
} = require('./reservationBanquet.controller');

const { requireAdminAuth } = require('../../../middlewares/authAdmin');
const rateLimit = require('express-rate-limit');
const statusLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

const router = express.Router();

/* ===== Public ===== */
router.post('/', createReservationBanquet);                // /api/reservations/banquet
router.get('/status', statusLimiter, getReservationBanquetStatusByCode);

/* ===== Admin ===== */
router.get('/', requireAdminAuth, getReservationBanquets);
router.get('/:id', requireAdminAuth, getReservationBanquet);
router.put('/:id', requireAdminAuth, updateReservationBanquet);
router.delete('/:id', requireAdminAuth, deleteReservationBanquet);

module.exports = router;
