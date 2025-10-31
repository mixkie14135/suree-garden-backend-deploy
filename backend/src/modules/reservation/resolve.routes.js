// backend/src/modules/reservation/resolve.routes.js
const express = require("express");
const { resolveReservationByCode } = require("./resolve.controller");

// (เลือกได้) ใส่ rate-limit เบา ๆ
const rateLimit = require("express-rate-limit");
const statusLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

const router = express.Router();

// เส้นเดียวจบ: ตัดสินใจว่ารหัสนี้เป็น room หรือ banquet
router.get("/reservations/resolve", statusLimiter, resolveReservationByCode);

module.exports = router;
