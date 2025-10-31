// src/modules/dashboard/dashboard.routes.js
const express = require('express');
const router = express.Router();

const { requireAdminAuth } = require('../../middlewares/authAdmin');
const ctrl = require('./dashboard.controller');

// *** เปิด/ปิด requireAdminAuth ระหว่าง dev ตามสะดวก ***
// ตัวอย่างนี้ “เปิด” ไว้เพื่อความปลอดภัย

// ROOMS
router.get('/dashboard/rooms/status',        requireAdminAuth, ctrl.roomsStatus);
router.get('/dashboard/rooms/utilization',   requireAdminAuth, ctrl.roomsUtilization);
router.get('/dashboard/rooms/turnover',      requireAdminAuth, ctrl.roomsTurnover);
router.get('/dashboard/rooms/by-type',       requireAdminAuth, ctrl.roomsByType);

// BANQUETS
router.get('/dashboard/banquets/status',      requireAdminAuth, ctrl.banquetsStatus);
router.get('/dashboard/banquets/utilization', requireAdminAuth, ctrl.banquetsUtilization);

// REVENUE
router.get('/dashboard/revenue',              requireAdminAuth, ctrl.revenue);

module.exports = router;
