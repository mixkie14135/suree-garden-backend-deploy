// src/modules/dashboard/dashboard.routes.js
const express = require('express');
const router = express.Router();

const { requireAdminAuth } = require('../../middlewares/authAdmin');
const ctrl = require('./dashboard.controller');

// ✅ ใส่ requireAdminAuth เพื่อให้ดู dashboard ได้เฉพาะ admin
// (ถ้าช่วง dev อยากเทสเร็ว จะถอด middleware ออกชั่วคราวก็ได้)

/// ROOMS
router.get('/dashboard/rooms/status',        requireAdminAuth, ctrl.roomsStatus);
router.get('/dashboard/rooms/utilization',   requireAdminAuth, ctrl.roomsUtilization);
router.get('/dashboard/rooms/turnover',      requireAdminAuth, ctrl.roomsTurnover);
router.get('/dashboard/rooms/by-type',       requireAdminAuth, ctrl.roomsByType);

/// BANQUETS
router.get('/dashboard/banquets/status',      requireAdminAuth, ctrl.banquetsStatus);
router.get('/dashboard/banquets/utilization', requireAdminAuth, ctrl.banquetsUtilization);

/// REVENUE (รวม rooms + banquets)
router.get('/dashboard/revenue',             requireAdminAuth, ctrl.revenue);

module.exports = router;
