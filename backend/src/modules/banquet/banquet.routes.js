const express = require('express');
const {
  getBanquets,
  getBanquet,
  createBanquet,
  updateBanquet,
  deleteBanquet,
} = require('../banquet/banquet.controller.js');

const router = express.Router();

router.get('/banquets', getBanquets);
router.get('/banquets/:id', getBanquet);
router.post('/banquets', createBanquet);
router.put('/banquets/:id', updateBanquet);
router.delete('/banquets/:id', deleteBanquet);

module.exports = router;
