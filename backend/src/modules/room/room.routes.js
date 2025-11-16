const express = require('express');
const {
  getRooms,
  getRoom,
  getAvailableRooms,
  getRoomAvailability,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomTypes,
  createRoomType,
  getRoomTypeBySlug,
} = require('../room/room.controller.js');

const router = express.Router();

// Rooms
router.get('/', getRooms);
router.get('/available', getAvailableRooms);
router.get('/:id/availability', getRoomAvailability);
router.get('/:id', getRoom);

// CRUD
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

// Room types
router.get('/types', getRoomTypes);
router.post('/types', createRoomType);
router.get('/types/:slug', getRoomTypeBySlug);

module.exports = router;
