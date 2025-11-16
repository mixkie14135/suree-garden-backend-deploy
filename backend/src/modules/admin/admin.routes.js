// backend/src/modules/admin/admin.routes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { loginAdmin, getMe, logoutAdmin } = require('../admin/admin.controller');
const { requireAdminAuth } = require('../../middlewares/authAdmin');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  message: { message: 'Too many login attempts, try again later.' }
});


router.post('/admin/login', loginLimiter, loginAdmin);
router.get('/admin/me', requireAdminAuth, getMe);
router.post('/admin/logout', requireAdminAuth, logoutAdmin);

module.exports = router;
