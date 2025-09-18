const express = require('express');
const {
  getBanquets,
  getBanquet,
  getAvailableBanquets,
  createBanquet,
  updateBanquet,
  deleteBanquet,
} = require('../banquet/banquet.controller.js');

const router = express.Router();

router.get('/banquets', getBanquets);
router.get('/banquets/:id', getBanquet);
router.get('/banquets/available', getAvailableBanquets);

router.post('/banquets', createBanquet);
router.put('/banquets/:id', updateBanquet);
router.delete('/banquets/:id', deleteBanquet);

module.exports = router;
