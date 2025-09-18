const prisma = require('../../../config/prisma');
const { genReservationCode } = require('../../../utils/code_reservation');
const { 
  parseDateInput, 
  timeToMinutes, 
  isOverlapMinutes,
  combineDateAndTimeUTC,
  toUtcMidnight
} = require('../../../utils/date'); // ✅ ใช้ helper ร่วมกัน

const PENDING_MINUTES = 15; // เวลาที่เปิดให้แนบสลิปหลังจอง (นาที)

// ========== Controllers ==========

// CREATE: จองห้องจัดเลี้ยง (ลูกค้าไม่ต้องล็อกอิน)
exports.createReservationBanquet = async (req, res) => {
  try {
    const {
      banquet_id,
      customer_id,
      first_name,
      last_name,
      phone,
      email,
      event_date, // 'YYYY-MM-DD'
      start_time, // 'YYYY-MM-DDTHH:mm' หรือ 'HH:mm'
      end_time
    } = req.body;

    if (!banquet_id || !event_date || !start_time || !end_time) {
      return res.status(400).json({ message: 'banquet_id, event_date, start_time, end_time required' });
    }

    // แปลงวันที่/เวลา
    const day = parseDateInput(event_date);
    if (!day) return res.status(400).json({ message: 'Invalid event_date' });

    // ✅ ใช้ helper สร้าง TIME เป็น Date ที่ UTC (จะได้ HH:mm ตรง)
    const st = combineDateAndTimeUTC(day, start_time);
    const et = combineDateAndTimeUTC(day, end_time);
    if (!(st && et)) return res.status(400).json({ message: 'Invalid start_time or end_time' });
    if (!(st < et))  return res.status(400).json({ message: 'start_time must be before end_time' });

    // หา/สร้างลูกค้า (ถ้าไม่ส่ง customer_id)
    let cid = customer_id ? Number(customer_id) : null;
    if (!cid) {
      if (!first_name || !last_name) {
        return res.status(400).json({ message: 'first_name & last_name required when no customer_id' });
      }
      let customer = null;
      if (phone || email) {
        customer = await prisma.customer.findFirst({
          where: { OR: [{ phone: phone || undefined }, { email: email || undefined }] }
        });
      }
      if (!customer) {
        customer = await prisma.customer.create({
          data: { first_name, last_name, phone: phone || null, email: email || null }
        });
      }
      cid = customer.customer_id;
    }

    // ✅ วันแบบ UTC midnight
    const eventDayUtc = toUtcMidnight(day);

    const overlaps = await prisma.reservation_banquet.findMany({
      where: {
        banquet_id: Number(banquet_id),
        event_date: { equals: eventDayUtc },
        status: { in: ['pending', 'confirmed'] }
      },
      select: { start_time: true, end_time: true }
    });

    // ✅ เปรียบเทียบเป็นนาที (ใช้ UTC getters)
    const reqStartMin = timeToMinutes(st);
    const reqEndMin   = timeToMinutes(et);
    const hasOverlap = overlaps.some(o => {
      const oStartMin = timeToMinutes(o.start_time);
      const oEndMin   = timeToMinutes(o.end_time);
      return isOverlapMinutes(reqStartMin, reqEndMin, oStartMin, oEndMin);
    });

    if (hasOverlap) {
      return res.status(409).json({ message: 'Banquet room is not available in selected time range' });
    }

    // gen reservation_code (กันชนสูงสุด 5 รอบ)
    let code = genReservationCode(8);
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.reservation_banquet
        .findUnique({ where: { reservation_code: code } })
        .catch(() => null);
      if (!exists) break;
      code = genReservationCode(8);
    }

    const expiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    // สร้างการจอง
    const created = await prisma.reservation_banquet.create({
      data: {
        customer_id: cid,
        banquet_id: Number(banquet_id),
        event_date: eventDayUtc, // เก็บเป็น 00:00 ของวันนั้น
        start_time: st,
        end_time: et,
        phone: phone || null,
        email: email || null,
        status: 'pending',
        reservation_code: code,
        expires_at: expiresAt
      },
      select: {
        reservation_id: true,
        reservation_code: true,
        status: true,
        event_date: true,
        start_time: true,
        end_time: true,
        expires_at: true,
        banquet_room: { select: { banquet_id: true, name: true } },
        customer: { select: { customer_id: true, first_name: true, last_name: true } }
      }
    });

    res.status(201).json({
      status: 'ok',
      message: 'Banquet reservation created (pending)',
      data: created
    });
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('reservation_code')) {
      return res.status(409).json({ message: 'Reservation code collision, please retry' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// STATUS BY CODE (Public): ลูกค้าเช็กสถานะด้วย reservation_code
exports.getReservationBanquetStatusByCode = async (req, res) => {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) return res.status(400).json({ message: 'reservation_code is required' });

    const reservation = await prisma.reservation_banquet.findUnique({
      where: { reservation_code: code },
      include: {
        banquet_room: { select: { banquet_id: true, name: true } },
        customer: { select: { customer_id: true, first_name: true, last_name: true } },
        payment_banquet: { orderBy: { payment_id: 'desc' }, take: 1 }
      }
    });

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    const lastPayment = reservation.payment_banquet[0] || null;

    res.json({
      code: reservation.reservation_code,
      status: reservation.status,
      expires_at: reservation.expires_at,
      event_date: reservation.event_date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      last_payment_status: lastPayment ? lastPayment.payment_status : 'none',
      amount: lastPayment ? lastPayment.amount : null,
      paid_at: lastPayment ? lastPayment.paid_at : null,
      banquet: reservation.banquet_room,
      customer: {
        id: reservation.customer.customer_id,
        first_name: reservation.customer.first_name,
        last_name: reservation.customer.last_name
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// LIST (Admin): รายการการจอง + filter
exports.getReservationBanquets = async (req, res) => {
  try {
    const { status, date_from, date_to, banquet_id } = req.query;

    const where = {};
    if (status) where.status = status;
    if (banquet_id) where.banquet_id = Number(banquet_id);

    const from = date_from ? parseDateInput(date_from) : null;
    const to = date_to ? parseDateInput(date_to) : null;
    if (from || to) {
      where.event_date = {};
      if (from) where.event_date.gte = toUtcMidnight(from);
      if (to)   where.event_date.lte = toUtcMidnight(to);
    }

    const items = await prisma.reservation_banquet.findMany({
      where,
      orderBy: { reservation_id: 'desc' },
      select: {
        reservation_id: true,
        reservation_code: true,
        status: true,
        event_date: true,
        start_time: true,
        end_time: true,
        expires_at: true,
        banquet_room: { select: { banquet_id: true, name: true } },
        customer: { select: { customer_id: true, first_name: true, last_name: true } }
      }
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET BY ID (Admin)
exports.getReservationBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await prisma.reservation_banquet.findUnique({
      where: { reservation_id: id },
      include: {
        banquet_room: true,
        customer: true,
        payment_banquet: {
          orderBy: { payment_id: 'desc' },
          take: 1,
          select: { payment_status: true, paid_at: true, amount: true }
        }
      }
    });
    if (!r) return res.status(404).json({ message: 'Reservation not found' });

    res.json({
      reservation_id: r.reservation_id,
      reservation_code: r.reservation_code,
      status: r.status,
      event_date: r.event_date,
      start_time: r.start_time,
      end_time: r.end_time,
      expires_at: r.expires_at,
      last_payment_status: r.payment_banquet[0]?.payment_status || 'none',
      paid_at: r.payment_banquet[0]?.paid_at || null,
      amount: r.payment_banquet[0]?.amount || null,
      banquet: { banquet_id: r.banquet_id, name: r.banquet_room.name },
      customer: { id: r.customer_id, first_name: r.customer.first_name, last_name: r.customer.last_name }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// UPDATE (Admin): อัปเดตสถานะ/รายละเอียดพื้นฐาน + กันทับซ้อนถ้าแก้เวลา/วัน
exports.updateReservationBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, event_date, start_time, end_time, phone, email } = req.body;

    // ดึงรายการปัจจุบันมาก่อน (ใช้ฐานวัน/เวลาและห้อง)
    const current = await prisma.reservation_banquet.findUnique({
      where: { reservation_id: id }
    });
    if (!current) return res.status(404).json({ message: 'Reservation not found' });

    const data = {};
    if (status) data.status = status;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;

    // ===== เตรียมวันฐาน (UTC midnight) =====
    let dayUTC = current.event_date; // ปกติค่าที่อ่านมาจะเป็น 00:00Z อยู่แล้ว
    if (event_date) {
      const parsed = parseDateInput(event_date);
      if (!parsed) return res.status(400).json({ message: 'Invalid event_date' });
      dayUTC = toUtcMidnight(parsed);        // ✅ เก็บเป็น UTC midnight เสมอ
      data.event_date = dayUTC;
    }


    // ===== เตรียมเวลาใหม่ (ใช้ base = dayUTC เสมอ) =====
    // ถ้าไม่ส่งเวลามา ใช้ค่าเดิม; ถ้าส่งมาเป็น "HH:mm" ให้ combine เป็น Date(UTC)
    let s = current.start_time;
    let e = current.end_time;
    
    if (start_time !== undefined) {
      // อนุญาตให้ส่ง "" เพื่อเคลียร์? ถ้าไม่ ก็เช็ค !start_time แทน
      if (!start_time) return res.status(400).json({ message: 'Invalid start_time' });
      s = combineDateAndTimeUTC(dayUTC, start_time);   // ✅ สร้าง Date(UTC)
      data.start_time = s;
    }
     if (end_time !== undefined) {
      if (!end_time) return res.status(400).json({ message: 'Invalid end_time' });
      e = combineDateAndTimeUTC(dayUTC, end_time);     // ✅ สร้าง Date(UTC)
      data.end_time = e;
    }
    // ตรวจช่วงเวลา
    if (!(s < e)) {
      return res.status(400).json({ message: 'start_time must be before end_time' });
    }

    // ถ้าแก้เวลา/วัน → ตรวจ overlap ใหม่
    if (data.event_date || data.start_time || data.end_time) {
      const day     = data.event_date || current.event_date;  // UTC midnight อยู่แล้ว
      const newS    = data.start_time || s;
      const newE    = data.end_time   || e;

      const overlaps = await prisma.reservation_banquet.findMany({
        where: {
          reservation_id: { not: id },
          banquet_id: current.banquet_id,
          event_date: { equals: day },
          status: { in: ['pending', 'confirmed'] }
        },
        select: { start_time: true, end_time: true }
      });

      const sMin = timeToMinutes(newS);
      const eMin = timeToMinutes(newE);

      const hasOverlap = overlaps.some(o => {
        const oStartMin = timeToMinutes(o.start_time);
        const oEndMin   = timeToMinutes(o.end_time);
        return isOverlapMinutes(sMin, eMin, oStartMin, oEndMin);
      });

      if (hasOverlap) {
        return res.status(409).json({ message: 'Banquet room is not available in selected time range' });
      }
    }

    const updated = await prisma.reservation_banquet.update({
      where: { reservation_id: id },
      data,
      select: {
        reservation_id: true, reservation_code: true, status: true,
        event_date: true, start_time: true, end_time: true, expires_at: true
      }
    });

    res.json({ status: 'ok', message: 'Reservation updated', data: updated });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// DELETE (Admin)
exports.deleteReservationBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.reservation_banquet.delete({ where: { reservation_id: id } });
    res.json({ status: 'ok', message: `Reservation ${id} deleted` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};
