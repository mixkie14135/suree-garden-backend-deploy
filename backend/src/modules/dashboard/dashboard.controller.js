const prisma = require('../../config/prisma');

/* ---------------------- helpers: คำนวณช่วงเวลาอย่างง่าย ---------------------- */
function rangeFor(period = 'today') {
  const now = new Date();
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    return [start, end];
  }
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(start.getDate() + 1);
  return [start, end];
}

/** เงื่อนไข “ช่วงวันซ้อนทับ” ของห้องพัก: (checkin < end) && (checkout > start) */
function overlapWhereForRooms(start, end) {
  return { AND: [{ checkin_date: { lt: end } }, { checkout_date: { gt: start } }] };
}

/* ============================== ROOMS: Status ============================== */
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

/* ============================ ROOMS: Utilization =========================== */
// GET /api/dashboard/rooms/utilization?period=today|month
exports.roomsUtilization = async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'today';
    const [start, end] = rangeFor(period);

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

    const utilNumerator = occupiedOrBooked + pendingHolds;
    const utilizationPct = roomsReady > 0 ? Math.round((utilNumerator / roomsReady) * 100) : 0;

    res.json({ period, occupiedOrBooked, pendingHolds, roomsReady, utilizationPct });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =============================== ROOMS: Turnover =========================== */
// GET /api/dashboard/rooms/turnover   (โฟกัสวันนี้)
exports.roomsTurnover = async (_req, res) => {
  try {
    const [start, end] = rangeFor('today');

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

/* ======================= ROOMS: Reservations by Room Type ================== */
// GET /api/dashboard/rooms/by-type?period=today|month
exports.roomsByType = async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'today';
    const [start, end] = rangeFor(period);

    // ดึงทุกประเภทห้อง + LEFT JOIN ไปยังห้อง + การจองที่ซ้อนทับช่วงเวลา
    const rows = await prisma.$queryRaw`
      SELECT 
        rt.room_type_id     AS id,
        rt.type_name        AS type_name,
        COUNT(DISTINCT rr.reservation_id) AS reservations
      FROM room_type rt
      LEFT JOIN room r
        ON r.room_type_id = rt.room_type_id
      LEFT JOIN reservation_room rr
        ON rr.room_id = r.room_id
       AND rr.status IN ('confirmed','checked_in')
       AND rr.checkin_date < ${end}
       AND rr.checkout_date > ${start}
      GROUP BY rt.room_type_id, rt.type_name
      ORDER BY reservations DESC, rt.type_name;
    `;

    const items = rows.map(r => ({
      type_name: r.type_name,
      reservations: Number(r.reservations || 0),
    }));

    res.json({ period, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================== BANQUETS: Status =========================== */
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

/* ============================ BANQUETS: Utilization ======================== */
// GET /api/dashboard/banquets/utilization?period=today|month
exports.banquetsUtilization = async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'today';
    const [start, end] = rangeFor(period);

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

    const utilNumerator = confirmedOrInUse + pendingHolds;
    const utilizationPct = roomsReady > 0 ? Math.round((utilNumerator / roomsReady) * 100) : 0;

    res.json({ period, occupiedOrBooked: confirmedOrInUse, pendingHolds, roomsReady, utilizationPct });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================= REVENUE ================================= */
// GET /api/dashboard/revenue?period=today|month
exports.revenue = async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'today';
    const [start, end] = rangeFor(period);

    const [roomAgg, banquetAgg] = await Promise.all([
      prisma.payment_room.aggregate({
        _sum: { amount: true },
        where: { payment_status: 'confirmed', paid_at: { gte: start, lt: end } },
      }),
      prisma.payment_banquet.aggregate({
        _sum: { amount: true },
        where: { payment_status: 'confirmed', paid_at: { gte: start, lt: end } },
      }),
    ]);

    const rooms = Number(roomAgg._sum.amount || 0);
    const banquets = Number(banquetAgg._sum.amount || 0);
    res.json({ period, rooms, banquets, total: rooms + banquets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
