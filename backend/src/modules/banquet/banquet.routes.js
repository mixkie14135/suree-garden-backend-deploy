const express = require('express');
const {
  getBanquets,
  getBanquet,
  getAvailableBanquets,
  getBanquetAvailability,
  createBanquet,
  updateBanquet,
  deleteBanquet
} = require('../banquet/banquet.controller.js');

const router = express.Router();

// ---- เส้นคงที่/ค้นหา รวมหลายห้อง (มาก่อน :id)
router.get('/banquets', getBanquets);
router.get('/banquets/available', getAvailableBanquets);

// ---- รายห้อง + availability
router.get('/banquets/:id', getBanquet);
router.get('/banquets/:id/availability', getBanquetAvailability);

// ---- สร้าง/แก้/ลบ
router.post('/banquets', createBanquet);
router.put('/banquets/:id', updateBanquet);
router.delete('/banquets/:id', deleteBanquet);

module.exports = router;
