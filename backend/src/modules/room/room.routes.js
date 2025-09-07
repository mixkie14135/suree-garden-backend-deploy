const express = require('express');
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomTypes,
  getAvailableRooms,
  createRoomType,
} = require('../room/room.controller.js');

const router = express.Router();

// list / filter / paginate
router.get('/rooms', getRooms);
// ค้นหาห้องว่างตามช่วงวัน
router.get('/rooms/available', getAvailableRooms);
// อ่านห้องเดียว
router.get('/rooms/:id', getRoom);
// สร้าง / แก้ไข / ลบ
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);
// room types
router.get('/room-types', getRoomTypes);
router.post('/room-types', createRoomType);


module.exports = router;
