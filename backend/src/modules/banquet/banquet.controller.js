const prisma = require('../../config/prisma');

/* ===================== Helpers ===================== */

// 'YYYY-MM-DD' -> Date(UTC 00:00)
function parseYMDToUTC(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
}
// คืน [เริ่มวัน, เริ่มวันถัดไป] (UTC)
function dayRangeUTC(ymd) {
  const start = parseYMDToUTC(ymd);
  if (!start) return [null, null];
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start, end];
}
// 'HH:mm' -> Date(UTC 1970-01-01 HH:mm)
function parseHHmmToUTC(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm));
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return new Date(Date.UTC(1970, 0, 1, h, mi, 0));
}
// แปลง Date (ที่เป็นเวลาอย่างเดียว) -> จำนวนนาทีตั้งแต่ 00:00 (ใช้ UTC เสมอ กัน timezone เพี้ยน)
function minutesSinceMidnightUTC(timeDate) {
  return timeDate.getUTCHours() * 60 + timeDate.getUTCMinutes();
}
// เช็กทับซ้อนเวลาแบบครึ่งเปิด [start, end)
function isTimeOverlap(minAStart, minAEnd, minBStart, minBEnd) {
  return minAStart < minBEnd && minAEnd > minBStart;
}

/* ===================== Controllers ===================== */

// GET all banquet rooms
exports.getBanquets = async (_req, res) => {
  try {
    const banquets = await prisma.banquet_room.findMany({
      include: { banquet_image: true }
    });
    res.json(banquets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET banquet by id
exports.getBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'invalid id' });

    const banquet = await prisma.banquet_room.findUnique({
      where: { banquet_id: id },
      include: { banquet_image: true }
    });
    if (!banquet) return res.status(404).json({ message: 'Banquet not found' });
    res.json(banquet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/banquets/available?date=YYYY-MM-DD&start=HH:mm&end=HH:mm&capacityGte=...&include=images
// Logic ใหม่: ดึงรายชื่อห้อง (เปิดให้จอง + capacity) -> ดึง booking ของวันนั้น -> กรองทับซ้อนเวลาใน JS (UTC)
exports.getAvailableBanquets = async (req, res) => {
  try {
    const { date, start, end, capacityGte, include } = req.query;
    if (!date || !start || !end) {
      return res.status(400).json({ message: 'date, start, end are required' });
    }

    const [dayStart, dayEnd] = dayRangeUTC(date);
    const reqStart = parseHHmmToUTC(start);
    const reqEnd   = parseHHmmToUTC(end);
    if (!dayStart || !dayEnd || !reqStart || !reqEnd || reqEnd <= reqStart) {
      return res.status(400).json({ message: 'invalid date/time (YYYY-MM-DD, HH:mm; end > start)' });
    }

    // include options
    const includeObj = {};
    const inc = (include || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (inc.includes('images')) includeObj.banquet_image = true;

    // 1) ห้องฐาน (status เปิด + capacity ตามต้องการ)
    const roomWhere = {
      AND: [
        { status: 'available' },
        ...(capacityGte ? [{ capacity: { gte: Number(capacityGte) } }] : [])
      ]
    };
    const baseRooms = await prisma.banquet_room.findMany({
      where: roomWhere,
      orderBy: { banquet_id: 'asc' },
      include: includeObj
    });

    if (baseRooms.length === 0) {
      return res.json({ page: 1, limit: 10, total: 0, totalPages: 0, items: [] });
    }

    // 2) ดึง booking ของ "วันนั้น" สำหรับห้องชุดนี้
    const roomIds = baseRooms.map(r => r.banquet_id);
    const dayBookings = await prisma.reservation_banquet.findMany({
      where: {
        banquet_id: { in: roomIds },
        event_date: { gte: dayStart, lt: dayEnd }
        // ยังไม่กรอง status ตามที่คุณต้องการตอนนี้ (ให้กันทุกสถานะเพื่อความง่าย)
        // ภายหลังใส่: status: { in: ['confirmed'] } ได้
      },
      select: { banquet_id: true, start_time: true, end_time: true, reservation_id: true, status: true }
    });

    // 3) จัดกลุ่ม booking ต่อห้อง
    const byRoom = new Map();
    for (const b of dayBookings) {
      const arr = byRoom.get(b.banquet_id) || [];
      arr.push(b);
      byRoom.set(b.banquet_id, arr);
    }

    // 4) แปลง requested time -> minutes
    const reqStartMin = minutesSinceMidnightUTC(reqStart);
    const reqEndMin   = minutesSinceMidnightUTC(reqEnd);

    // 5) กรองห้องที่ "ไม่มีการทับเวลา" คงไว้
    const availableRooms = baseRooms.filter(room => {
      const bookings = byRoom.get(room.banquet_id) || [];
      for (const bk of bookings) {
        const bkStartMin = minutesSinceMidnightUTC(bk.start_time);
        const bkEndMin   = minutesSinceMidnightUTC(bk.end_time);
        if (isTimeOverlap(bkStartMin, bkEndMin, reqStartMin, reqEndMin)) {
          return false; // มีทับ -> ไม่ว่าง
        }
      }
      return true; // ไม่มีทับ -> ว่าง
    });

    // 6) ทำเพจจิ้งฝั่งเซิร์ฟเวอร์ (หลังกรอง)
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const total = availableRooms.length;
    const totalPages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const items = availableRooms.slice(startIdx, startIdx + limit);

    res.json({ page, limit, total, totalPages, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE banquet
exports.createBanquet = async (req, res) => {
  try {
    const { name, capacity, price_per_hour, status, description } = req.body;
    if (!name || !capacity || !price_per_hour) {
      return res.status(400).json({ message: 'name, capacity, price_per_hour required' });
    }
    const created = await prisma.banquet_room.create({
      data: {
        name,
        capacity,
        price_per_hour: String(price_per_hour),
        status,
        description
      }
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE banquet
exports.updateBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'invalid id' });

    const { name, capacity, price_per_hour, status, description } = req.body;
    const data = {};
    if (name != null) data.name = name;
    if (capacity != null) data.capacity = capacity;
    if (price_per_hour != null) data.price_per_hour = String(price_per_hour);
    if (status != null) data.status = status;
    if (description != null) data.description = description;

    const updated = await prisma.banquet_room.update({
      where: { banquet_id: id },
      data
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Banquet not found' });
    }
    res.status(500).json({ error: err.message });
  }
};

// DELETE banquet
exports.deleteBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'invalid id' });

    await prisma.banquet_room.delete({ where: { banquet_id: id } });
    res.json({ message: `Banquet ${id} deleted` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Banquet not found' });
    }
    res.status(500).json({ error: err.message });
  }
};

// รายห้อง: เช็กช่วงวันเวลา ว่าว่างไหม (ดึง booking วันนั้น -> เช็กทับเวลาใน JS)
exports.getBanquetAvailability = async (req, res) => {
  try {
    const banquetId = Number(req.params.id);
    const { date, start, end } = req.query;

    if (!banquetId || !date || !start || !end) {
      return res.status(400).json({ message: 'banquetId, date, start, end required' });
    }

    const [dayStart, dayEnd] = dayRangeUTC(date);
    const reqStart = parseHHmmToUTC(start);
    const reqEnd   = parseHHmmToUTC(end);
    if (!dayStart || !dayEnd || !reqStart || !reqEnd || reqEnd <= reqStart) {
      return res.status(400).json({ message: 'invalid date/time (YYYY-MM-DD, HH:mm; end > start)' });
    }

    const bookings = await prisma.reservation_banquet.findMany({
      where: {
        banquet_id: banquetId,
        event_date: { gte: dayStart, lt: dayEnd }
        // ภายหลังค่อยเพิ่มสถานะ เช่น status: { in: ['confirmed'] }
      },
      select: { reservation_id: true, start_time: true, end_time: true, status: true }
    });

    const reqStartMin = minutesSinceMidnightUTC(reqStart);
    const reqEndMin   = minutesSinceMidnightUTC(reqEnd);

    const overlap = bookings.some(bk => {
      const bStartMin = minutesSinceMidnightUTC(bk.start_time);
      const bEndMin   = minutesSinceMidnightUTC(bk.end_time);
      return isTimeOverlap(bStartMin, bEndMin, reqStartMin, reqEndMin);
    });

    return res.json({
      banquet_id: banquetId,
      date, start, end,
      available: !overlap
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
