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
router.get('/rooms', getRooms);
// ค้นหาห้องว่างตามช่วงวัน
router.get('/rooms/available', getAvailableRooms);
// ตรวจสอบห้องว่างตาม id และช่วงวัน
router.get('/rooms/:id/availability', getRoomAvailability);
// อ่านห้องตาม id
router.get('/rooms/:id', getRoom);
// สร้าง / แก้ไข / ลบ
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);
// ประเภทห้อง
router.get('/room-types', getRoomTypes);
router.post('/room-types', createRoomType);
router.get('/room-types/:slug', getRoomTypeBySlug);
router.get('/room-types/slug/:slug', getRoomTypeBySlug);





module.exports = router;
