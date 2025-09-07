const express = require('express');
const { createReservationBanquet } = require('./reservationBanquet.controller');
const router = express.Router();

router.post('/reservations/banquet', createReservationBanquet);

module.exports = router;
