// src/modules/dashboard/dashboard.controller.js
const prisma = require('../../config/prisma');

/* -------------------------- helpers: period window ------------------------- */
// คืนช่วงเวลา [start, end) แบบ "วันปัจจุบัน" และ "เดือนปัจจุบัน"
// หมายเหตุ: ใน schema คุณใช้ฟิลด์ @db.Date (ไม่มีเวลา) กับ @db.Timestamp(0) (มีเวลา)
// เราจะใช้ "ขอบเขตแบบครึ่งเปิด" [start, end) เพื่อเช็คซ้อนทับได้ปลอดภัย
function floorToLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function monthStartEndLocal(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  return [start, end];
}
function rangeFor(period /* 'today' | 'month' */) {
  if (period === 'month') return monthStartEndLocal(new Date());
  const start = floorToLocalDay(new Date());
  const end = addDays(start, 1);
  return [start, end];
}

// เช็ค “ซ้อนทับวัน” สำหรับห้องพัก: (checkin < end) && (checkout > start)
function overlapWhereForRooms(start, end) {
  return {
    AND: [
      { checkin_date:  { lt: end } },
      { checkout_date: { gt: start } }
    ]
  };
}

/* ============================== ROOMS: Status ============================== */
// GET /api/dashboard/rooms/status
exports.roomsStatus = async (_req, res) => {
  try {
    const [total, maintenance, available] = await Promise.all([
      prisma.room.count(),
      prisma.room.count({ where: { status: 'maintenance' } }),
      prisma.room.count({ where: { status: 'available' } }),
    ]);
    res.json({ total, available, maintenance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================ ROOMS: Utilization =========================== */
// GET /api/dashboard/rooms/utilization?period=today|month
exports.roomsUtilization = async (req, res) => {
  try {
    const period = (req.query.period === 'month') ? 'month' : 'today';
    const [start, end] = rangeFor(period);

    // จำนวนห้องที่ "พร้อมให้บริการ" = ทั้งหมด - maintenance
    const [totalRooms, maintenance] = await Promise.all([
      prisma.room.count(),
      prisma.room.count({ where: { status: 'maintenance' } }),
    ]);
    const roomsReady = Math.max(0, totalRooms - maintenance);

    // ซ้อนทับช่วงวันที่เลือก
    const dateOverlap = overlapWhereForRooms(start, end);

    // นับที่ใช้จริงวันนี้/เดือนนี้
    const [occupiedOrBooked, pendingHolds] = await Promise.all([
      prisma.reservation_room.count({
        where: {
          ...dateOverlap,
          status: { in: ['confirmed', 'checked_in'] }
        }
      }),
      prisma.reservation_room.count({
        where: {
          ...dateOverlap,
          status: 'pending',
          expires_at: { gt: new Date() } // pending ที่ยังไม่หมดเวลา
        }
      })
    ]);

    const utilNumerator = occupiedOrBooked + pendingHolds;
    const utilizationPct = roomsReady > 0 ? Math.round((utilNumerator / roomsReady) * 100) : 0;

    res.json({ occupiedOrBooked, pendingHolds, roomsReady, utilizationPct });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =============================== ROOMS: Turnover =========================== */
// GET /api/dashboard/rooms/turnover?period=today
// ตอนนี้รองรับ today อย่างเดียว (ตาม UI) — ถ้าจะขยายค่อยเพิ่มภายหลัง
exports.roomsTurnover = async (req, res) => {
  try {
    const start = floorToLocalDay(new Date());
    const end = addDays(start, 1);

    // check-in วันนี้
    const [checkinToday, checkoutToday] = await Promise.all([
      prisma.reservation_room.count({
        where: {
          checkin_date: { gte: start, lt: end },
          status: { in: ['confirmed', 'checked_in'] },
        }
      }),
      prisma.reservation_room.count({
        where: {
          checkout_date: { gte: start, lt: end },
          status: { in: ['confirmed', 'checked_in'] },
        }
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
    const period = (req.query.period === 'month') ? 'month' : 'today';
    const [start, end] = rangeFor(period);
    const overlap = overlapWhereForRooms(start, end);

    // เอาเฉพาะ booking ที่ถือครองจริงวันนี้/เดือนนี้
    const reservations = await prisma.reservation_room.findMany({
      where: {
        ...overlap,
        status: { in: ['confirmed', 'checked_in'] },
      },
      select: {
        room: {
          select: {
            room_type: { select: { type_name: true } }
          }
        }
      }
    });

    // รวมยอดตาม type_name
    const map = new Map();
    for (const r of reservations) {
      const type = r.room?.room_type?.type_name || 'Unknown';
      map.set(type, (map.get(type) || 0) + 1);
    }

    // แปลงเป็น array และเรียงมาก -> น้อย
    const items = Array.from(map, ([type_name, reservations]) => ({ type_name, reservations }))
      .sort((a, b) => b.reservations - a.reservations);

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================== BANQUETS: Status =========================== */
// GET /api/dashboard/banquets/status
exports.banquetsStatus = async (_req, res) => {
  try {
    const [total, maintenance, available] = await Promise.all([
      prisma.banquet_room.count(),
      prisma.banquet_room.count({ where: { status: 'maintenance' } }),
      prisma.banquet_room.count({ where: { status: 'available' } }),
    ]);
    res.json({ total, available, maintenance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================ BANQUETS: Utilization ======================== */
// GET /api/dashboard/banquets/utilization?period=today|month
// สำหรับห้องจัดเลี้ยง เราถือว่าเป็น "วัน" ถ้าช่วงเวลาไหนในวันนั้นมีจอง ก็ถือว่าถูกใช้
exports.banquetsUtilization = async (req, res) => {
  try {
    const period = (req.query.period === 'month') ? 'month' : 'today';
    const [start, end] = rangeFor(period);

    const [total, maintenance] = await Promise.all([
      prisma.banquet_room.count(),
      prisma.banquet_room.count({ where: { status: 'maintenance' } }),
    ]);
    const roomsReady = Math.max(0, total - maintenance);

    // หา res ของวัน/เดือนนั้น (ถือครองจริง + pending ที่ยังไม่หมดเวลา)
    // หมายเหตุ: reservation_banquet เก็บ event_date (Date), และ time (Time) แยกอยู่แล้ว
    // เราจะนับเป็นราย "วัน" โดยใช้ event_date ในช่วง [start, end)
    const [confirmedOrInUse, pendingHolds] = await Promise.all([
      prisma.reservation_banquet.count({
        where: {
          event_date: { gte: start, lt: end },
          status: { in: ['confirmed'] },
        }
      }),
      prisma.reservation_banquet.count({
        where: {
          event_date: { gte: start, lt: end },
          status: 'pending',
          expires_at: { gt: new Date() }
        }
      })
    ]);

    const utilNumerator = confirmedOrInUse + pendingHolds;
    const utilizationPct = roomsReady > 0 ? Math.round((utilNumerator / roomsReady) * 100) : 0;

    res.json({
      occupiedOrBooked: confirmedOrInUse,
      pendingHolds,
      roomsReady,
      utilizationPct
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================= REVENUE ================================= */
// GET /api/dashboard/revenue?period=today|month
// รวมยอดจาก payment_room + payment_banquet เฉพาะ confirmed และ paid_at อยู่ในช่วง
exports.revenue = async (req, res) => {
  try {
    const period = (req.query.period === 'month') ? 'month' : 'today';
    const [start, end] = rangeFor(period);

    const [roomAgg, banquetAgg] = await Promise.all([
      prisma.payment_room.aggregate({
        _sum: { amount: true },
        where: {
          payment_status: 'confirmed',
          paid_at: { gte: start, lt: end }
        }
      }),
      prisma.payment_banquet.aggregate({
        _sum: { amount: true },
        where: {
          payment_status: 'confirmed',
          paid_at: { gte: start, lt: end }
        }
      })
    ]);

    const rooms = Number(roomAgg._sum.amount || 0);
    const banquets = Number(banquetAgg._sum.amount || 0);
    const total = rooms + banquets;

    res.json({ rooms, banquets, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
