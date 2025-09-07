const express = require('express');
const { requireAdminAuth } = require('../../../middlewares/authAdmin'); // ปรับ path ให้ตรงของคุณ
const {
  listRoomImages, createRoomImage, deleteRoomImage, updateRoomImage
} = require('./roomImage.controller');

const router = express.Router();

// อ่านรูป: เผื่อหน้า public ก็ได้ → ไม่ต้องครอบ auth
router.get('/rooms/:room_id/images', listRoomImages);

// เพิ่ม/แก้/ลบ: เฉพาะแอดมิน
router.post('/rooms/:room_id/images', requireAdminAuth, createRoomImage);
router.put('/rooms/:room_id/images/:image_id', requireAdminAuth, updateRoomImage);
router.delete('/rooms/:room_id/images/:image_id', requireAdminAuth, deleteRoomImage);

module.exports = router;
