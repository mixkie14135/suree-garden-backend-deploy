// controllers/reservationBanquet.controller.js
const prisma = require('../../../config/prisma');
const { genReservationCode } = require('../../../utils/code_reservation');
const {
  parseDateInput,
  timeToMinutes,
  isOverlapMinutes,
  combineDateAndTimeUTC,
  toUtcMidnight
} = require('../../../utils/date');

const { resolveCustomerId, normalizePhoneTH } = require('../../../utils/customer');
const { sendReservationEmail } = require('../../../utils/mailer');

const PENDING_MINUTES = 15; // เวลาที่เปิดให้แนบสลิปหลังจอง (นาที)
const ALLOWED_STATUSES = ['pending', 'confirmed', 'cancelled', 'expired'];

// ========== CREATE: จองห้องจัดเลี้ยง (ลูกค้าไม่ต้องล็อกอิน) ==========
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
      start_time, // 'HH:mm' หรือ 'YYYY-MM-DDTHH:mm'
      end_time
    } = req.body;

    if (!banquet_id || !event_date || !start_time || !end_time) {
      return res.status(400).json({ message: 'banquet_id, event_date, start_time, end_time required' });
    }
    if (!email && !customer_id) {
      return res.status(400).json({ message: 'email is required (or provide customer_id)' });
    }

    // แปลงวันและเวลา
    const day = parseDateInput(event_date);
    if (!day) return res.status(400).json({ message: 'Invalid event_date' });

    const st = combineDateAndTimeUTC(day, start_time);
    const et = combineDateAndTimeUTC(day, end_time);
    if (!(st && et)) return res.status(400).json({ message: 'Invalid start_time or end_time' });
    if (!(st < et))  return res.status(400).json({ message: 'start_time must be before end_time' });

    // หา/สร้างลูกค้า ตาม policy: อีเมลเป็นตัวตนหลัก (รองรับเบอร์ซ้ำ-ต่างอีเมลด้วย 409)
    let cid;
    try {
      cid = await resolveCustomerId(prisma, {
        customer_id,
        first_name,
        last_name,
        email,
        phone
      });
    } catch (e) {
      if (e.code === 'PHONE_CONFLICT') {
        return res.status(409).json({
          message: 'เบอร์นี้ถูกใช้งานกับอีเมลอีกบัญชีแล้ว กรุณาใช้ข้อมูลชุดเดิมหรือยืนยันกับแอดมิน'
        });
      }
      return res.status(400).json({ message: e.message || 'resolve customer failed' });
    }

    const eventDayUtc = toUtcMidnight(day);

    // โค้ด + หมดเวลา
    let code = genReservationCode(8);
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.reservation_banquet
        .findUnique({ where: { reservation_code: code } })
        .catch(() => null);
      if (!exists) break;
      code = genReservationCode(8);
    }
    const expiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    // ดึงบัญชีโอนมา snapshot
    const acc = await prisma.bank_account.findFirst({
      where: { is_active: true },
      orderBy: [{ is_default: 'desc' }, { bank_account_id: 'asc' }],
      select: { bank_name: true, account_name: true, account_number: true, promptpay_id: true }
    });
    const paySnap = acc ? {
      bank_name: acc.bank_name,
      account_name: acc.account_name,
      account_number: acc.account_number,
      promptpay_id: acc.promptpay_id || null
    } : null;

    // ใช้ Transaction กัน race:
    // - กันซ้อนทับ โดยนับเฉพาะ confirmed และ pending ที่ยังไม่หมดเวลา
    // - สร้างการจอง + snapshot บัญชีโอน + payment_due_at
    const created = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // ดึงช่วงที่จองแล้วในวันเดียวกัน (สถานะที่ถือครองจริง)
      const overlaps = await tx.reservation_banquet.findMany({
        where: {
          banquet_id: Number(banquet_id),
          event_date: { equals: eventDayUtc },
          OR: [
            { status: 'confirmed' },
            { AND: [{ status: 'pending' }, { expires_at: { gt: now } }] }
          ]
        },
        select: { start_time: true, end_time: true }
      });

      // เทียบเป็นนาที (UTC)
      const reqStartMin = timeToMinutes(st);
      const reqEndMin   = timeToMinutes(et);
      const hasOverlap = overlaps.some(o => {
        const oStartMin = timeToMinutes(o.start_time);
        const oEndMin   = timeToMinutes(o.end_time);
        return isOverlapMinutes(reqStartMin, reqEndMin, oStartMin, oEndMin);
      });
      if (hasOverlap) {
        const err = new Error('OVERLAP');
        err.type = 'OVERLAP';
        throw err;
      }

      // สร้างการจอง
      return tx.reservation_banquet.create({
        data: {
          customer_id: cid,
          banquet_id: Number(banquet_id),
          event_date: eventDayUtc, // 00:00 UTC
          start_time: st,
          end_time: et,

          // Snapshot ผู้ติดต่อ
          contact_name: `${first_name || ''} ${last_name || ''}`.trim(),
          contact_email: email || null,
          contact_phone: normalizePhoneTH(phone) || null,

          // สถานะ/โค้ด/หมดเวลาแนบสลิป
          status: 'pending',
          reservation_code: code,
          expires_at: expiresAt,

          // Snapshot บัญชีโอน + deadline ชำระ
          pay_account_snapshot: paySnap,
          payment_due_at: expiresAt
        },
        select: {
          reservation_id: true,
          reservation_code: true,
          status: true,
          event_date: true,
          start_time: true,
          end_time: true,
          expires_at: true,
          payment_due_at: true,
          pay_account_snapshot: true,
          banquet_room: { select: { banquet_id: true, name: true } },
          customer: { select: { customer_id: true, first_name: true, last_name: true } }
        }
      });
    });

    // ส่งอีเมลยืนยัน (ไม่ให้ fail อีเมลทำให้จองล้ม)
    if (email) {
      const accountHtml = created.pay_account_snapshot ? `
        <li>โอนเข้าบัญชี: <b>${created.pay_account_snapshot.bank_name}</b>
            เลขที่ <b>${created.pay_account_snapshot.account_number}</b>
            ชื่อบัญชี <b>${created.pay_account_snapshot.account_name}</b></li>` : '';
      const summaryHtml = `
        <ul>
          <li>ห้องจัดเลี้ยง: <b>${created.banquet_room.name}</b></li>
          <li>วันที่เวลา: <b>${event_date} ${start_time}–${end_time}</b></li>
          ${accountHtml}
          <li>ชำระก่อน: <b>${created.payment_due_at?.toISOString() || created.expires_at?.toISOString()}</b></li>
          <li>รหัสการจอง: <b>${created.reservation_code}</b></li>
        </ul>`;
      await sendReservationEmail(email, {
        name: first_name || created.customer.first_name || '',
        code: created.reservation_code,
        summaryHtml
      }).catch(() => {});
    }

    res.status(201).json({
      status: 'ok',
      message: 'Banquet reservation created (pending)',
      data: created
    });
  } catch (err) {
    if (err.type === 'OVERLAP') {
      return res.status(409).json({ message: 'Banquet room is not available in selected time range' });
    }
    if (err.code === 'P2002' && err.meta?.target?.includes('reservation_code')) {
      return res.status(409).json({ message: 'Reservation code collision, please retry' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ========== STATUS BY CODE (Public) ==========
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

    const lastPayment = reservation.payment_banquet?.[0] || null;

    res.json({
      code: reservation.reservation_code,
      status: reservation.status,
      expires_at: reservation.expires_at,
      payment_due_at: reservation.payment_due_at,
      pay_account_snapshot: reservation.pay_account_snapshot || null,
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

// ========== LIST (Admin): รายการ + filter + แบ่งหน้า ==========
exports.getReservationBanquets = async (req, res) => {
  try {
    const { status, date_from, date_to, banquet_id } = req.query;

    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip  = (page - 1) * limit;

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

    const [items, total] = await Promise.all([
      prisma.reservation_banquet.findMany({
        where,
        orderBy: { reservation_id: 'desc' },
        skip,
        take: limit,
        select: {
          reservation_id: true,
          reservation_code: true,
          status: true,
          event_date: true,
          start_time: true,
          end_time: true,
          expires_at: true,
          payment_due_at: true,
          banquet_room: { select: { banquet_id: true, name: true } },
          customer: { select: { customer_id: true, first_name: true, last_name: true } }
        }
      }),
      prisma.reservation_banquet.count({ where })
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ========== GET BY ID (Admin) ==========
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
      payment_due_at: r.payment_due_at,
      pay_account_snapshot: r.pay_account_snapshot || null,
      last_payment_status: r.payment_banquet?.[0]?.payment_status || 'none',
      paid_at: r.payment_banquet?.[0]?.paid_at || null,
      amount: r.payment_banquet?.[0]?.amount || null,
      banquet: { banquet_id: r.banquet_id, name: r.banquet_room.name },
      customer: { id: r.customer_id, first_name: r.customer.first_name, last_name: r.customer.last_name }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ========== UPDATE (Admin): อัปเดตสถานะ/รายละเอียดพื้นฐาน + กันทับซ้อนถ้าแก้เวลา/วัน ==========
exports.updateReservationBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, event_date, start_time, end_time, phone, email, contact_name } = req.body;

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'invalid status' });
    }

    const current = await prisma.reservation_banquet.findUnique({
      where: { reservation_id: id }
    });
    if (!current) return res.status(404).json({ message: 'Reservation not found' });

    const data = {};
    if (status) data.status = status;
    if (contact_name !== undefined) data.contact_name = (contact_name || '').trim() || null;
    if (phone !== undefined) data.contact_phone = normalizePhoneTH(phone) || null; // snapshot
    if (email !== undefined) data.contact_email = email || null;                    // snapshot

    // ===== เตรียมวันฐาน (UTC midnight) =====
    let dayUTC = current.event_date;
    if (event_date) {
      const parsed = parseDateInput(event_date);
      if (!parsed) return res.status(400).json({ message: 'Invalid event_date' });
      dayUTC = toUtcMidnight(parsed);
      data.event_date = dayUTC;
    }

    // ===== เตรียมเวลาใหม่ (base = dayUTC) =====
    let s = current.start_time;
    let e = current.end_time;

    if (start_time !== undefined) {
      if (!start_time) return res.status(400).json({ message: 'Invalid start_time' });
      s = combineDateAndTimeUTC(dayUTC, start_time);
      data.start_time = s;
    }
    if (end_time !== undefined) {
      if (!end_time) return res.status(400).json({ message: 'Invalid end_time' });
      e = combineDateAndTimeUTC(dayUTC, end_time);
      data.end_time = e;
    }
    if (!(s < e)) {
      return res.status(400).json({ message: 'start_time must be before end_time' });
    }

    // ถ้าแก้เวลา/วัน → ตรวจ overlap ใหม่ (นับเฉพาะ confirmed + pending ที่ยังไม่หมดเวลา)
    if (data.event_date || data.start_time || data.end_time) {
      const day = data.event_date || current.event_date;
      const newS = data.start_time || s;
      const newE = data.end_time   || e;

      const now = new Date();
      const overlaps = await prisma.reservation_banquet.findMany({
        where: {
          reservation_id: { not: id },
          banquet_id: current.banquet_id,
          event_date: { equals: day },
          OR: [
            { status: 'confirmed' },
            { AND: [{ status: 'pending' }, { expires_at: { gt: now } }] }
          ]
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
        event_date: true, start_time: true, end_time: true, expires_at: true, payment_due_at: true
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

// ========== DELETE (Admin) ==========
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
