const express = require('express');
const { requireAdminAuth } = require('../../../middlewares/authAdmin'); // ปรับ path ให้ตรงโปรเจกต์
const {
  listBanquetImages, createBanquetImage, updateBanquetImage, deleteBanquetImage
} = require('./banquetImage.controller');

const router = express.Router();

// อ่านรูป: อาจเปิดเป็น public ได้
router.get('/banquets/:banquet_id/images', listBanquetImages);

// เพิ่ม/แก้/ลบ: admin เท่านั้น
router.post('/banquets/:banquet_id/images', requireAdminAuth, createBanquetImage);
router.put('/banquets/:banquet_id/images/:image_id', requireAdminAuth, updateBanquetImage);
router.delete('/banquets/:banquet_id/images/:image_id', requireAdminAuth, deleteBanquetImage);

module.exports = router;
