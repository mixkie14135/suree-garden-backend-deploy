const express = require('express');
const { createReservationRoom, getReservationRoom } = require('./reservationRoom.controller');
const router = express.Router();

router.post('/reservations/room', createReservationRoom);
router.get('/reservations/room/:id', getReservationRoom);

module.exports = router;
