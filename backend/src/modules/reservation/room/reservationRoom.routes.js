const express = require('express');
const {
  createReservationRoom,
  getReservationRoomStatusByCode,
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
router.post('/', createReservationRoom);           // /api/reservations/room
router.get('/status', statusLimiter, getReservationRoomStatusByCode); // /api/reservations/room/status

/* ===== Admin ===== */
router.get('/', requireAdminAuth, getReservationRooms);        // /api/reservations/room
router.get('/:id', requireAdminAuth, getReservationRoom);      // /api/reservations/room/:id
router.put('/:id', requireAdminAuth, updateReservationRoom);   // /api/reservations/room/:id
router.delete('/:id', requireAdminAuth, deleteReservationRoom);// /api/reservations/room/:id

module.exports = router;
