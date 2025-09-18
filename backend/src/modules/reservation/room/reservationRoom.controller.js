// controllers/reservationRoom.controller.js
const prisma = require('../../../config/prisma');
const { genReservationCode } = require('../../../utils/code_reservation');
const {
  parseDateInput,
  toUtcMidnight
} = require('../../../utils/date');

const { resolveCustomerId, normalizePhoneTH } = require('../../../utils/customer');
const { sendReservationEmail } = require('../../../utils/mailer');

const PENDING_MINUTES = 15; // เวลาจำกัดแนบสลิป (นาที)
const ALLOWED_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired'];

// =========================
// CREATE: จองห้องพัก (ลูกค้าไม่ต้องล็อกอิน)
// =========================
exports.createReservationRoom = async (req, res) => {
  try {
    const {
      customer_id,
      first_name, last_name, // กรณีไม่ส่ง customer_id
      phone, email,
      room_id,
      checkin_date, // 'YYYY-MM-DD'
      checkout_date // 'YYYY-MM-DD'
    } = req.body;

    if (!room_id || !checkin_date || !checkout_date) {
      return res.status(400).json({ message: 'room_id, checkin_date, checkout_date required' });
    }
    if (!email && !customer_id) {
      // แนะนำให้บังคับ email เพื่อส่งรหัสการจอง
      return res.status(400).json({ message: 'email is required (or provide customer_id)' });
    }

    const inParsed  = parseDateInput(checkin_date);
    const outParsed = parseDateInput(checkout_date);
    if (!inParsed || !outParsed) {
      return res.status(400).json({ message: 'Invalid checkin_date or checkout_date' });
    }

    const inDate  = toUtcMidnight(inParsed);
    const outDate = toUtcMidnight(outParsed);
    if (!(inDate < outDate)) {
      return res.status(400).json({ message: 'checkin_date must be before checkout_date' });
    }

    // หา/สร้างลูกค้า (อีเมลเป็นตัวตนหลัก + จัดการเคสเบอร์ซ้ำต่างอีเมลด้วย 409)
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

    // เตรียมโค้ด และหมดเวลา
    let code = genReservationCode(8);
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.reservation_room
        .findUnique({ where: { reservation_code: code } })
        .catch(() => null);
      if (!exists) break;
      code = genReservationCode(8);
    }
    const expiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    // ดึงบัญชีโอนที่ active/default มาทำ snapshot (เพื่อแสดงให้ลูกค้าโอน)
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
    // - กันจองซ้อน (นับเฉพาะ confirmed/checked_in และ pending ที่ยังไม่หมดเวลา)
    // - ค่อย create
    const created = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const overlap = await tx.reservation_room.findFirst({
        where: {
          room_id: Number(room_id),
          AND: [
            {
              OR: [
                { status: { in: ['confirmed', 'checked_in'] } },
                { AND: [{ status: 'pending' }, { expires_at: { gt: now } }] }
              ]
            },
            { checkin_date:  { lt: outDate } },
            { checkout_date: { gt: inDate } },
          ],
        },
        select: { reservation_id: true }
      });
      if (overlap) {
        const err = new Error('OVERLAP');
        err.type = 'OVERLAP';
        throw err;
      }

      return tx.reservation_room.create({
        data: {
          customer_id: cid,
          room_id: Number(room_id),
          checkin_date: inDate,
          checkout_date: outDate,

          // Snapshot ผู้ติดต่อ ณ ตอนจอง
          contact_name: `${first_name || ''} ${last_name || ''}`.trim(),
          contact_email: email || null,
          contact_phone: normalizePhoneTH(phone) || null,

          // สถานะ/โค้ด/หมดเวลาแนบสลิป
          status: 'pending',
          reservation_code: code,
          expires_at: expiresAt,

          // Snapshot บัญชีโอน + deadline ชำระ (อ่านง่าย)
          pay_account_snapshot: paySnap,
          payment_due_at: expiresAt
        },
        select: {
          reservation_id: true,
          reservation_code: true,
          status: true,
          checkin_date: true,
          checkout_date: true,
          expires_at: true,
          pay_account_snapshot: true,
          payment_due_at: true,
          room: { select: { room_id: true, room_number: true } },
          customer: { select: { customer_id: true, first_name: true, last_name: true } }
        }
      });
    });

    // ส่งอีเมลยืนยัน (ไม่ให้ผิดพลาดเรื่องเมลทำให้จองล้ม)
    if (email) {
      const accountHtml = created.pay_account_snapshot ? `
        <li>โอนเข้าบัญชี: <b>${created.pay_account_snapshot.bank_name}</b> 
            เลขที่ <b>${created.pay_account_snapshot.account_number}</b> 
            ชื่อบัญชี <b>${created.pay_account_snapshot.account_name}</b></li>` : '';
      const summaryHtml = `
        <ul>
          <li>ห้องพัก: <b>${created.room.room_number}</b></li>
          <li>เช็คอิน–เช็คเอาท์: <b>${checkin_date} – ${checkout_date}</b></li>
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

    // ✅ ส่งข้อมูลให้ลูกค้า
    res.status(201).json({
      status: 'ok',
      message: 'Reservation created (pending)',
      data: {
        reservation_id: created.reservation_id,
        reservation_code: created.reservation_code,
        status: created.status,
        checkin_date: created.checkin_date,
        checkout_date: created.checkout_date,
        expires_at: created.expires_at,
        payment_due_at: created.payment_due_at,
        pay_account_snapshot: created.pay_account_snapshot,
        room: created.room,
        customer: {
          id: created.customer.customer_id,
          first_name: created.customer.first_name,
          last_name: created.customer.last_name
        }
      }
    });
  } catch (err) {
    if (err.type === 'OVERLAP') {
      return res.status(409).json({ message: 'Room is not available in selected dates' });
    }
    if (err.code === 'P2002' && err.meta?.target?.includes('reservation_code')) {
      return res.status(409).json({ message: 'Reservation code collision, please retry' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// =========================
// LIST: รายการจอง (admin/backoffice) + แบ่งหน้า + filter
// =========================
exports.getReservationRooms = async (req, res) => {
  try {
    const { status, date_from, date_to, room_id } = req.query;

    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip  = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (room_id) where.room_id = Number(room_id);

    const from = date_from ? parseDateInput(date_from) : null;
    const to   = date_to ? parseDateInput(date_to) : null;
    if (from || to) {
      where.checkin_date = where.checkin_date || {};
      where.checkout_date = where.checkout_date || {};
      if (from) where.checkout_date.gte = toUtcMidnight(from); // มีผลช่วงหลังจาก from
      if (to)   where.checkin_date.lte  = toUtcMidnight(to);   // มีผลช่วงก่อนถึง to
    }

    const [items, total] = await Promise.all([
      prisma.reservation_room.findMany({
        where,
        orderBy: { reservation_id: 'desc' },
        skip,
        take: limit,
        select: {
          reservation_id: true,
          reservation_code: true,
          status: true,
          checkin_date: true,
          checkout_date: true,
          expires_at: true,
          payment_due_at: true,
          room: { select: { room_id: true, room_number: true } },
          customer: { select: { customer_id: true, first_name: true, last_name: true } }
        }
      }),
      prisma.reservation_room.count({ where })
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

// =========================
// GET BY ID: รายละเอียด (admin/backoffice)
// =========================
exports.getReservationRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid reservation_id' });
    }

    const r = await prisma.reservation_room.findUnique({
      where: { reservation_id: id },
      include: {
        room: true,
        customer: true,
        payment_room: {
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
      checkin_date: r.checkin_date,
      checkout_date: r.checkout_date,
      expires_at: r.expires_at,
      payment_due_at: r.payment_due_at,
      pay_account_snapshot: r.pay_account_snapshot || null,
      last_payment_status: r.payment_room?.[0]?.payment_status || 'none',
      paid_at: r.payment_room?.[0]?.paid_at || null,
      amount: r.payment_room?.[0]?.amount || null,
      room: { room_id: r.room_id, room_number: r.room.room_number },
      customer: { id: r.customer_id, first_name: r.customer.first_name, last_name: r.customer.last_name }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// =========================
/** UPDATE (admin):
 *  - อัปเดตสถานะ/ช่วงวัน
 *  - ถ้าแก้วัน → เช็กซ้อนทับใหม่ (นับเฉพาะ confirmed/checked_in และ pending ที่ยังไม่หมดเวลา)
 *  - อัปเดต snapshot ติดต่อ (contact_*) ถ้ามีส่งมา
 */
// =========================
exports.updateReservationRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid reservation_id' });
    }

    const { status, checkin_date, checkout_date, phone, email, contact_name } = req.body;

    // validate สถานะ
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'invalid status' });
    }

    // ใช้รายการปัจจุบันเป็นฐาน
    const current = await prisma.reservation_room.findUnique({
      where: { reservation_id: id }
    });
    if (!current) return res.status(404).json({ message: 'Reservation not found' });

    const data = {};

    if (status) data.status = status;
    if (contact_name !== undefined) data.contact_name = (contact_name || '').trim() || null;
    if (phone !== undefined) data.contact_phone = normalizePhoneTH(phone) || null;
    if (email !== undefined) data.contact_email = email || null;

    if (checkin_date) {
      const parsedIn = parseDateInput(checkin_date);
      if (!parsedIn) return res.status(400).json({ message: 'Invalid checkin_date' });
      data.checkin_date = toUtcMidnight(parsedIn);
    }

    if (checkout_date) {
      const parsedOut = parseDateInput(checkout_date);
      if (!parsedOut) return res.status(400).json({ message: 'Invalid checkout_date' });
      data.checkout_date = toUtcMidnight(parsedOut);
    }

    // ถ้าแก้วัน → ตรวจลำดับวันและกันทับซ้อน
    if (data.checkin_date || data.checkout_date) {
      const newIn  = data.checkin_date  || current.checkin_date;
      const newOut = data.checkout_date || current.checkout_date;

      if (!(newIn < newOut)) {
        return res.status(400).json({ message: 'checkin_date must be before checkout_date' });
      }

      const now = new Date();
      const clash = await prisma.reservation_room.findFirst({
        where: {
          reservation_id: { not: id },
          room_id: current.room_id,
          AND: [
            {
              OR: [
                { status: { in: ['confirmed', 'checked_in'] } },
                { AND: [{ status: 'pending' }, { expires_at: { gt: now } }] }
              ]
            },
            { checkin_date:  { lt: newOut } },
            { checkout_date: { gt: newIn } },
          ],
        },
        select: { reservation_id: true }
      });
      if (clash) {
        return res.status(409).json({ message: 'Room is not available in selected dates' });
      }
    }

    const updated = await prisma.reservation_room.update({
      where: { reservation_id: id },
      data,
      select: {
        reservation_id: true,
        reservation_code: true,
        status: true,
        checkin_date: true,
        checkout_date: true,
        expires_at: true,
        payment_due_at: true
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

// =========================
// DELETE (admin)
// =========================
exports.deleteReservationRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid reservation_id' });
    }

    await prisma.reservation_room.delete({ where: { reservation_id: id } });
    res.json({ status: 'ok', message: `Reservation ${id} deleted` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// =========================
// STATUS BY CODE (Public)
// =========================
exports.getReservationRoomStatusByCode = async (req, res) => {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) return res.status(400).json({ message: 'reservation_code is required' });

    const reservation = await prisma.reservation_room.findUnique({
      where: { reservation_code: code },
      include: {
        room: { select: { room_id: true, room_number: true } },
        customer: { select: { customer_id: true, first_name: true, last_name: true } },
        payment_room: { orderBy: { payment_id: 'desc' }, take: 1 }
      }
    });

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    const lastPayment = reservation.payment_room?.[0] || null;

    res.json({
      code: reservation.reservation_code,
      status: reservation.status,
      expires_at: reservation.expires_at,
      payment_due_at: reservation.payment_due_at,
      pay_account_snapshot: reservation.pay_account_snapshot || null,
      checkin_date: reservation.checkin_date,
      checkout_date: reservation.checkout_date,
      last_payment_status: lastPayment ? lastPayment.payment_status : 'none',
      amount: lastPayment ? lastPayment.amount : null,
      paid_at: lastPayment ? lastPayment.paid_at : null,
      room: reservation.room,
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
