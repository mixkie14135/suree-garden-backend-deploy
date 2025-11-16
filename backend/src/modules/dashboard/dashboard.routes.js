// src/modules/dashboard/dashboard.routes.js
const express = require('express');
const router = express.Router();

const { requireAdminAuth } = require('../../middlewares/authAdmin');
const ctrl = require('./dashboard.controller');

// *** เปิด/ปิด requireAdminAuth ระหว่าง dev ตามสะดวก ***
// ตัวอย่างนี้ “เปิด” ไว้เพื่อความปลอดภัย

// ROOMS
router.get('/rooms/status',        requireAdminAuth, ctrl.roomsStatus);
router.get('/rooms/utilization',   requireAdminAuth, ctrl.roomsUtilization);
router.get('/rooms/turnover',      requireAdminAuth, ctrl.roomsTurnover);
router.get('/rooms/by-type',       requireAdminAuth, ctrl.roomsByType);

// BANQUETS
router.get('/banquets/status',      requireAdminAuth, ctrl.banquetsStatus);
router.get('/banquets/utilization', requireAdminAuth, ctrl.banquetsUtilization);
// REVENUE
router.get('/revenue',              requireAdminAuth, ctrl.revenue);

module.exports = router;
