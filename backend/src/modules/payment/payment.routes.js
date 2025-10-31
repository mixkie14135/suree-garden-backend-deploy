// backend/src/modules/payment/payment.routes.js
const express = require("express");
const router = express.Router();

const { requireAdminAuth } = require("../../middlewares/authAdmin");
const { uploadSlip } = require("../../middlewares/uploadSlip");
const { publicRateLimit } = require("../../middlewares/ratelimit");

const roomCtrl = require("./room/paymentRoom.controller");
const banquetCtrl = require("./banquet/paymentBanquet.controller");

const slipokCtrl = require("./slipok.controller");

// ========================= ROOM PAYMENTS =========================

// แอดมินดึงข้อมูลรายการ/รายละเอียดการชำระ
router.get("/room/:id", requireAdminAuth, roomCtrl.getRoomPaymentById);
router.get("/room", requireAdminAuth, roomCtrl.listRoomPayments);

// แอดมินอนุมัติ / ปฏิเสธ
router.post("/room/:id/approve", requireAdminAuth, roomCtrl.approveRoomPayment);
router.post("/room/:id/reject", requireAdminAuth, roomCtrl.rejectRoomPayment);

// แอดมินขอ "ลิงก์ดูสลิปแบบ signed URL" (อายุเริ่มต้น 30 นาที)
// รูปแบบ: GET /api/payments/room/:id/slip-url?by=reservation|payment
// - ไม่ส่ง ?by = จะถือว่า by=reservation (ค่าเริ่มต้น)
router.get("/room/:id/slip-url", requireAdminAuth, roomCtrl.viewSlipRoomAdmin);

router.post(
  "/room/verify-and-apply",
  publicRateLimit,
  uploadSlip.single("slip"),
  slipokCtrl.verifyAndApplyRoom
);

// ======================= BANQUET PAYMENTS ========================

// แอดมินดึงข้อมูลรายการ/รายละเอียดการชำระ
router.get("/banquet/:id", requireAdminAuth, banquetCtrl.getBanquetPaymentById);
router.get("/banquet", requireAdminAuth, banquetCtrl.listBanquetPayments);

// แอดมินอนุมัติ / ปฏิเสธ
router.post("/banquet/:id/approve", requireAdminAuth, banquetCtrl.approveBanquetPayment);
router.post("/banquet/:id/reject", requireAdminAuth, banquetCtrl.rejectBanquetPayment);

// แอดมินขอ "ลิงก์ดูสลิปแบบ signed URL" (อายุเริ่มต้น 30 นาที)
// รูปแบบ: GET /api/payments/banquet/:id/slip-url?by=reservation|payment
router.get(
  "/banquet/:id/slip-url",
  requireAdminAuth,
  banquetCtrl.viewSlipBanquetAdmin
);

router.post(
  "/banquet/verify-and-apply",
  publicRateLimit,
  uploadSlip.single("slip"),
  slipokCtrl.verifyAndApplyBanquet // << เพิ่มบรรทัดนี้
);

module.exports = router;
