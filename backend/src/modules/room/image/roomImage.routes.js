const express = require('express');
const { requireAdminAuth } = require('../../../middlewares/authAdmin');
const {
  listRoomImages, createRoomImage, updateRoomImage, deleteRoomImage
} = require('./roomImage.controller');
const { uploadRoomImage } = require('../../../middlewares/uploadRoomImage');

const router = express.Router();

// public read
router.get('/:room_id/images', listRoomImages);

// admin write
router.post('/:room_id/images', requireAdminAuth, uploadRoomImage.single('file'), createRoomImage);
router.put('/:room_id/images/:image_id', requireAdminAuth, updateRoomImage);
router.delete('/:room_id/images/:image_id', requireAdminAuth, deleteRoomImage);

module.exports = router;
