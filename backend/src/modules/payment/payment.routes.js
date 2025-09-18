const express = require('express');
const router = express.Router();

// ปรับพาธตามโปรเจกต์จริงของคุณ
const { requireAdminAuth } = require('../../middlewares/authAdmin');

const roomCtrl = require('./room/paymentRoom.controller');
const banquetCtrl = require('./banquet/paymentBanquet.controller');

// ===== ROOM =====
// ลูกค้าอัปสลิป
router.post('/room/upload-slip', roomCtrl.uploadSlipRoom);

// แอดมินอนุมัติ/ปฏิเสธ
router.post('/room/:id/approve', requireAdminAuth, roomCtrl.approveRoomPayment);
router.post('/room/:id/reject',  requireAdminAuth, roomCtrl.rejectRoomPayment);

// ===== BANQUET =====
// ลูกค้าอัปสลิป
router.post('/banquet/upload-slip', banquetCtrl.uploadSlipBanquet);

// แอดมินอนุมัติ/ปฏิเสธ
router.post('/banquet/:id/approve', requireAdminAuth, banquetCtrl.approveBanquetPayment);
router.post('/banquet/:id/reject',  requireAdminAuth, banquetCtrl.rejectBanquetPayment);

module.exports = router;
