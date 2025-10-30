const rateLimit = require('express-rate-limit');

// สำหรับเส้นทาง public (จอง, อัปสลิป, เช็คสถานะ)
const publicRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next) => {
    console.warn(`[RATE-LIMIT] blocked ip=${req.ip} url=${req.originalUrl}`);
    res.status(429).json({ status: 'error', message: 'Too many requests, please try again later.' });
  }
});

module.exports = { publicRateLimit };
