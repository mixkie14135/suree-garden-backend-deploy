const express = require('express');
const router = express.Router();

const { requireAdminAuth } = require('../../middlewares/authAdmin');
const { uploadSlip } = require('../../middlewares/uploadSlip');
const { publicRateLimit } = require('../../middlewares/ratelimit'); // <<< เพิ่ม

const roomCtrl = require('./room/paymentRoom.controller');
const banquetCtrl = require('./banquet/paymentBanquet.controller');

// (debug ชั่วคราว ถ้าอยากดูค่า ให้ log หลัง require ทั้งหมดเท่านั้น)
console.log('[payment.routes] typeof uploadSlip =', typeof uploadSlip);
console.log('[payment.routes] roomCtrl keys =', Object.keys(roomCtrl || {}));
console.log('[payment.routes] banquetCtrl keys =', Object.keys(banquetCtrl || {}));

// ===== ROOM =====
router.post('/room/upload-slip', publicRateLimit, uploadSlip.single('slip'), roomCtrl.uploadSlipRoom); // <<< ครอบ limiter

router.get('/room/:id', requireAdminAuth, roomCtrl.getRoomPaymentById);
router.get('/room',     requireAdminAuth, roomCtrl.listRoomPayments);

router.post('/room/:id/approve', requireAdminAuth, roomCtrl.approveRoomPayment);
router.post('/room/:id/reject',  requireAdminAuth, roomCtrl.rejectRoomPayment);

// ===== BANQUET =====
router.post('/banquet/upload-slip', publicRateLimit, uploadSlip.single('slip'), banquetCtrl.uploadSlipBanquet); // <<< ครอบ limiter

router.get('/banquet/:id', requireAdminAuth, banquetCtrl.getBanquetPaymentById);
router.get('/banquet',     requireAdminAuth, banquetCtrl.listBanquetPayments);

router.post('/banquet/:id/approve', requireAdminAuth, banquetCtrl.approveBanquetPayment);
router.post('/banquet/:id/reject',  requireAdminAuth, banquetCtrl.rejectBanquetPayment);

module.exports = router;
