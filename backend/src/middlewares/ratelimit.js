// src/middlewares/ratelimit.js
const rateLimit = require('express-rate-limit');

// สำหรับเส้นทาง public (จอง, อัปสลิป, เช็คสถานะ)
const publicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 นาที
  max: 30,             // 30 req/นาที/ไอพี (ปรับได้)
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' }
});

module.exports = { publicRateLimit };
