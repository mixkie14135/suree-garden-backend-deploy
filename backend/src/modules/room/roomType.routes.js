// backend/src/modules/room/roomType.routes.js
const express = require('express');
const { getRoomTypes, getRoomTypeBySlug } = require('../room/room.controller.js');

const router = express.Router();

// GET /api/room-types/        -> list (optional)
router.get('/', getRoomTypes);

// GET /api/room-types/slug/:slug
router.get('/slug/:slug', getRoomTypeBySlug);

module.exports = router;
