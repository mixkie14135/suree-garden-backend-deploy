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

// อ่านห้องทั้งหมด
router.get('/', getRooms);               // GET /api/rooms
router.get('/available', getAvailableRooms); // GET /api/rooms/available
router.get('/:id/availability', getRoomAvailability);
router.get('/:id', getRoom);

// CRUD ห้อง
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

// Room types
router.get('/types', getRoomTypes);
router.post('/types', createRoomType);
router.get('/types/:slug', getRoomTypeBySlug);
router.get('/types/slug/:slug', getRoomTypeBySlug);

module.exports = router;
