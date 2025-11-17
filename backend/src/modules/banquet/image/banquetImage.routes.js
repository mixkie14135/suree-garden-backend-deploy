const express = require('express');
const { requireAdminAuth } = require('../../../middlewares/authAdmin');
const {
  listBanquetImages, createBanquetImage, updateBanquetImage, deleteBanquetImage
} = require('./banquetImage.controller');
const { uploadBanquetImage } = require('../../../middlewares/uploadBanquetImage');

const router = express.Router();

// public read
router.get('/:banquet_id/images', listBanquetImages);

// admin write
router.post('/:banquet_id/images', requireAdminAuth, uploadBanquetImage.single('file'), createBanquetImage);
router.put('/:banquet_id/images/:image_id', requireAdminAuth, updateBanquetImage);
router.delete('/:banquet_id/images/:image_id', requireAdminAuth, deleteBanquetImage);

module.exports = router;
