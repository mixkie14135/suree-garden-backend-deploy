const express = require('express');
const router = express.Router();

// ปรับพาธตามโปรเจกต์จริงของคุณ
const { requireAdminAuth } = require('../../middlewares/authAdmin');

// Multer middleware
const { uploadSlip } = require('../../middlewares/uploadSlip');

const roomCtrl = require('./room/paymentRoom.controller');
const banquetCtrl = require('./banquet/paymentBanquet.controller');

// ===== ROOM =====
// ลูกค้าอัปสลิป
router.post('/room/upload-slip', uploadSlip.single('slip'), roomCtrl.uploadSlipRoom);

// ===== Admin reads (ROOM) =====
router.get('/room/:id', requireAdminAuth, roomCtrl.getRoomPaymentById);
router.get('/room',     requireAdminAuth, roomCtrl.listRoomPayments); // ?reservation_id=123 (ทางเลือก)

// แอดมินอนุมัติ/ปฏิเสธ
router.post('/room/:id/approve', requireAdminAuth, roomCtrl.approveRoomPayment);
router.post('/room/:id/reject',  requireAdminAuth, roomCtrl.rejectRoomPayment);

// ===== BANQUET =====
// ลูกค้าอัปสลิป
router.post('/banquet/upload-slip', uploadSlip.single('slip'), banquetCtrl.uploadSlipBanquet);

// ===== Admin reads (BANQUET) =====
router.get('/banquet/:id', requireAdminAuth, banquetCtrl.getBanquetPaymentById);
router.get('/banquet',     requireAdminAuth, banquetCtrl.listBanquetPayments); // ?reservation_id=123 (ทางเลือก)

// แอดมินอนุมัติ/ปฏิเสธ
router.post('/banquet/:id/approve', requireAdminAuth, banquetCtrl.approveBanquetPayment);
router.post('/banquet/:id/reject',  requireAdminAuth, banquetCtrl.rejectBanquetPayment);

module.exports = router;
