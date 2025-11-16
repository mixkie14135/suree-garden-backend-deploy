const express = require('express');
const { getRoomTypeBySlug } = require('../room/room.controller.js');

const router = express.Router();

// GET /api/room-types/slug/:slug
router.get('/slug/:slug', getRoomTypeBySlug);

module.exports = router;
