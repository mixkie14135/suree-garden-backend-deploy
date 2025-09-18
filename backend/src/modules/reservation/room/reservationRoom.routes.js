const express = require('express');
const { 
    createReservationRoom, 
    getReservationRooms, 
    getReservationRoom, 
    updateReservationRoom,
    deleteReservationRoom,
    getReservationRoomStatusByCode  
} = require('./reservationRoom.controller');

const { requireAdminAuth } = require('../../../middlewares/authAdmin');

// (แนะนำ) ใส่ rate-limit ให้ endpoint ที่ public
const rateLimit = require('express-rate-limit');
const statusLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 นาที
    max: 30, 
});

const router = express.Router();

// ========== Public (ลูกค้า) ==========
router.post('/reservations/room', createReservationRoom);
router.get('/reservations/room/status', statusLimiter, getReservationRoomStatusByCode);

// ========== Admin ==========
router.get('/reservations/room', requireAdminAuth, getReservationRooms);
router.get('/reservations/room/:id', requireAdminAuth, getReservationRoom);
router.put('/reservations/room/:id', requireAdminAuth, updateReservationRoom);
router.delete('/reservations/room/:id', requireAdminAuth, deleteReservationRoom);

module.exports = router;
