// backend/src/modules/dashboard/dashboard.controller.js
const prisma = require('../../config/prisma');
const { thaiPeriodToUtcRange } = require('../../utils/date');

/** เงื่อนไขช่วงวันซ้อนทับของ ‘การเข้าพัก’:
 *  ใช้รูปแบบ [checkin, checkout) กับช่วง [start, end) */
function overlapWhereForRooms(start, end) {
  return {
    AND: [
      { checkin_date:  { lt: end  } },
      { checkout_date: { gt: start } },
    ],
  };
}

/* ============================== ROOMS ============================== */

// GET /api/dashboard/rooms/status
exports.roomsStatus = async (_req, res) => {
  try {
    const [total, maintenance, occupied] = await Promise.all([
      prisma.room.count(),
      prisma.room.count({ where: { status: 'maintenance' } }),
      prisma.room.count({ where: { status: 'occupied' } }),
    ]);
    const available = Math.max(0, total - maintenance - occupied);
    res.json({ total, available, occupied, maintenance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/dashboard/rooms/utilization?period=today|month
exports.roomsUtilization = async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'today';
    const [start, end] = thaiPeriodToUtcRange(period); // ✅ เวลาไทย (+7)

    const [totalRooms, maintenance] = await Promise.all([
      prisma.room.count(),
      prisma.room.count({ where: { status: 'maintenance' } }),
    ]);
    const roomsReady = Math.max(0, totalRooms - maintenance);

    const overlap = overlapWhereForRooms(start, end);
    const [occupiedOrBooked, pendingHolds] = await Promise.all([
      prisma.reservation_room.count({
        where: { ...overlap, status: { in: ['confirmed', 'checked_in'] } },
      }),
      prisma.reservation_room.count({
        where: { ...overlap, status: 'pending', expires_at: { gt: new Date() } },
      }),
    ]);

    const utilizationPct =
      roomsReady > 0 ? Math.round(((occupiedOrBooked + pendingHolds) / roomsReady) * 100) : 0;

    res.json({ period, occupiedOrBooked, pendingHolds, roomsReady, utilizationPct });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/dashboard/rooms/turnover   (today only)
exports.roomsTurnover = async (_req, res) => {
  try {
    const [start, end] = thaiPeriodToUtcRange('today'); // ✅ เวลาไทย
    const [checkinToday, checkoutToday] = await Promise.all([
      prisma.reservation_room.count({
        where: { checkin_date: { gte: start, lt: end }, status: { in: ['confirmed', 'checked_in'] } },
      }),
      prisma.reservation_room.count({
        where: { checkout_date: { gte: start, lt: end }, status: { in: ['confirmed', 'checked_in'] } },
      }),
    ]);
    res.json({ checkinToday, checkoutToday });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/dashboard/rooms/by-type?period=today|month
exports.roomsByType = async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'today';
    const [start, end] = thaiPeriodToUtcRange(period); // ✅ เวลาไทย

    const rows = await prisma.$queryRaw`
      SELECT 
        rt.room_type_id AS id,
        rt.type_name    AS type_name,
        COUNT(DISTINCT rr.reservation_id) AS reservations
      FROM room_type rt
      LEFT JOIN room r
        ON r.room_type_id = rt.room_type_id
      LEFT JOIN reservation_room rr
        ON rr.room_id = r.room_id
       AND rr.status IN ('confirmed','checked_in')
       AND rr.checkin_date  < ${end}
       AND rr.checkout_date > ${start}
      GROUP BY rt.room_type_id, rt.type_name
      ORDER BY reservations DESC, rt.type_name;
    `;

    res.json({
      period,
      items: rows.map(r => ({ type_name: r.type_name, reservations: Number(r.reservations || 0) })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================= BANQUETS ============================= */

// GET /api/dashboard/banquets/status
exports.banquetsStatus = async (_req, res) => {
  try {
    const [total, maintenance, occupied] = await Promise.all([
      prisma.banquet_room.count(),
      prisma.banquet_room.count({ where: { status: 'maintenance' } }),
      prisma.banquet_room.count({ where: { status: 'occupied' } }),
    ]);
    const available = Math.max(0, total - maintenance - occupied);
    res.json({ total, available, occupied, maintenance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/dashboard/banquets/utilization?period=today|month
exports.banquetsUtilization = async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'today';
    const [start, end] = thaiPeriodToUtcRange(period); // ✅ เวลาไทย

    const [total, maintenance] = await Promise.all([
      prisma.banquet_room.count(),
      prisma.banquet_room.count({ where: { status: 'maintenance' } }),
    ]);
    const roomsReady = Math.max(0, total - maintenance);

    const [confirmedOrInUse, pendingHolds] = await Promise.all([
      prisma.reservation_banquet.count({
        where: { event_date: { gte: start, lt: end }, status: { in: ['confirmed'] } },
      }),
      prisma.reservation_banquet.count({
        where: { event_date: { gte: start, lt: end }, status: 'pending', expires_at: { gt: new Date() } },
      }),
    ]);

    const utilizationPct =
      roomsReady > 0 ? Math.round(((confirmedOrInUse + pendingHolds) / roomsReady) * 100) : 0;

    res.json({ period, occupiedOrBooked: confirmedOrInUse, pendingHolds, roomsReady, utilizationPct });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================== REVENUE ============================== */

// GET /api/dashboard/revenue?period=today|month
// นับรายได้ตาม “เวลาไทย” (paid_at ใน DB เป็น UTC)
exports.revenue = async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'today';
    const [startUtc, endUtc] = thaiPeriodToUtcRange(period); // ✅ เวลาไทย

    const [roomAgg, banquetAgg] = await Promise.all([
      prisma.payment_room.aggregate({
        _sum: { amount: true },
        where: { payment_status: 'confirmed', paid_at: { gte: startUtc, lt: endUtc } },
      }),
      prisma.payment_banquet.aggregate({
        _sum: { amount: true },
        where: { payment_status: 'confirmed', paid_at: { gte: startUtc, lt: endUtc } },
      }),
    ]);

    const rooms = Number(roomAgg._sum.amount || 0);
    const banquets = Number(banquetAgg._sum.amount || 0);
    res.json({ period, rooms, banquets, total: rooms + banquets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
