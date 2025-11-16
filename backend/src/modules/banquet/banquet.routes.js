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

// เส้นทางหลัก
router.get('/', getBanquets);               // GET /api/banquets
router.get('/available', getAvailableBanquets);
router.get('/:id', getBanquet);
router.get('/:id/availability', getBanquetAvailability);

// CRUD
router.post('/', createBanquet);
router.put('/:id', updateBanquet);
router.delete('/:id', deleteBanquet);

module.exports = router;
