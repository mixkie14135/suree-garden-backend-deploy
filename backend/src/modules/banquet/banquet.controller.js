const prisma = require('../../config/prisma');
const policy = require('../../config/reservationPolicy');

/* ===================== Helpers ===================== */
function parseYMDToUTC(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
}
function dayRangeUTC(ymd) {
  const start = parseYMDToUTC(ymd);
  if (!start) return [null, null];
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start, end];
}
function parseHHmmToUTC(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm));
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return new Date(Date.UTC(1970, 0, 1, h, mi, 0));
}
function minutesSinceMidnightUTC(timeDate) {
  return timeDate.getUTCHours() * 60 + timeDate.getUTCMinutes();
}
function isTimeOverlap(minAStart, minAEnd, minBStart, minBEnd) {
  return minAStart < minBEnd && minAEnd > minBStart;
}

/* ===================== Controllers ===================== */

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

    const includeObj = {};
    const inc = (include || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (inc.includes('images')) includeObj.banquet_image = true;

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

    const roomIds = baseRooms.map(r => r.banquet_id);
    const dayBookings = await prisma.reservation_banquet.findMany({
      where: {
        banquet_id: { in: roomIds },
        event_date: { gte: dayStart, lt: dayEnd },
        status: { in: policy.banquet.blockStatuses } // <<< ใช้ policy
      },
      select: { banquet_id: true, start_time: true, end_time: true, reservation_id: true, status: true }
    });

    const byRoom = new Map();
    for (const b of dayBookings) {
      const arr = byRoom.get(b.banquet_id) || [];
      arr.push(b);
      byRoom.set(b.banquet_id, arr);
    }

    const reqStartMin = minutesSinceMidnightUTC(reqStart);
    const reqEndMin   = minutesSinceMidnightUTC(reqEnd);

    const availableRooms = baseRooms.filter(room => {
      const bookings = byRoom.get(room.banquet_id) || [];
      for (const bk of bookings) {
        const bkStartMin = minutesSinceMidnightUTC(bk.start_time);
        const bkEndMin   = minutesSinceMidnightUTC(bk.end_time);
        if (isTimeOverlap(bkStartMin, bkEndMin, reqStartMin, reqEndMin)) {
          return false;
        }
      }
      return true;
    });

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

// รายห้อง: เช็กช่วงวันเวลา ว่าว่างไหม
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
        event_date: { gte: dayStart, lt: dayEnd },
        status: { in: policy.banquet.blockStatuses } // <<< ใช้ policy
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
