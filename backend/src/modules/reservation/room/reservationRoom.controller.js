const prisma = require('../../../config/prisma');
const { genReservationCode } = require('../../../utils/code_reservation');
const {
  parseDateInput,
  toUtcMidnight     
} = require('../../../utils/date');

const PENDING_MINUTES = 15; // เวลาจำกัดแนบสลิป (นาที)


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

    const inDate  = toUtcMidnight(parseDateInput(checkin_date));
    const outDate = toUtcMidnight(parseDateInput(checkout_date));
    if (!(inDate < outDate)) {
      return res.status(400).json({ message: 'checkin_date must be before checkout_date' });
    }

    // หา/สร้างลูกค้าเมื่อไม่ระบุ customer_id
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

    // กันจองซ้อน (ช่วงวันทับ) สำหรับสถานะที่ถือว่าจองจริง
    const overlap = await prisma.reservation_room.findFirst({
      where: {
        room_id: Number(room_id),
        status: { in: ['pending', 'confirmed', 'checked_in'] },
        AND: [
          { checkin_date:  { lt: outDate } },
          { checkout_date: { gt: inDate } },
        ],
      },
    });
    if (overlap) {
      return res.status(409).json({ message: 'Room is not available in selected dates' });
    }

    // สุ่ม reservation_code (ลองใหม่สูงสุด 5 รอบถ้าชน)
    let code = genReservationCode(8);
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.reservation_room
        .findUnique({ where: { reservation_code: code } })
        .catch(() => null);
      if (!exists) break;
      code = genReservationCode(8);
    }

    const expiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    // บันทึก
    const created = await prisma.reservation_room.create({
      data: {
        customer_id: cid,
        room_id: Number(room_id),
        checkin_date: inDate,
        checkout_date: outDate,
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
        checkin_date: true,
        checkout_date: true,
        expires_at: true,
        room: { select: { room_id: true, room_number: true } },
        customer: { select: { customer_id: true, first_name: true, last_name: true } }
      }
    });

    // ✅ ส่ง reservation_code + expires_at ให้ลูกค้าใช้ทันที
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
        room: created.room,
        customer: {
          id: created.customer.customer_id,
          first_name: created.customer.first_name,
          last_name: created.customer.last_name
        }
      }
    });
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('reservation_code')) {
      return res.status(409).json({ message: 'Reservation code collision, please retry' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// =========================
// LIST: รายการจอง (optional ใช้ฝั่ง admin / ภายใน)
// =========================
exports.getReservationRooms = async (_req, res) => {
  try {
    const items = await prisma.reservation_room.findMany({
      orderBy: { reservation_id: 'desc' },
      select: {
        reservation_id: true,
        reservation_code: true,
        status: true,
        checkin_date: true,
        checkout_date: true,
        expires_at: true,
        room: { select: { room_id: true, room_number: true } },
        customer: { select: { customer_id: true, first_name: true, last_name: true } }
      }
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// =========================
// GET BY ID: รายละเอียด (ใช้ฝั่ง admin/backoffice)
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
      last_payment_status: r.payment_room[0]?.payment_status || 'none',
      paid_at: r.payment_room[0]?.paid_at || null,
      amount: r.payment_room[0]?.amount || null,
      room: { room_id: r.room_id, room_number: r.room.room_number },
      customer: { id: r.customer_id, first_name: r.customer.first_name, last_name: r.customer.last_name }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// =========================
// UPDATE (optional; ส่วนใหญ่ฝั่ง admin)
// =========================

exports.updateReservationRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid reservation_id' });
    }

    const { status, checkin_date, checkout_date, phone, email } = req.body;

    // ใช้รายการปัจจุบันเป็นฐาน
    const current = await prisma.reservation_room.findUnique({
      where: { reservation_id: id }
    });
    if (!current) return res.status(404).json({ message: 'Reservation not found' });

    const data = {};

    // (ออปชัน) กันค่า status แปลก ๆ
    if (typeof status === 'string' && status.trim()) {
      data.status = status.trim();
    }

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

    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;

    // ถ้าแก้วัน → ตรวจลำดับวันและกันทับซ้อน
    if (data.checkin_date || data.checkout_date) {
      const newIn  = data.checkin_date  || current.checkin_date;
      const newOut = data.checkout_date || current.checkout_date;

      if (!(newIn < newOut)) {
        return res.status(400).json({ message: 'checkin_date must be before checkout_date' });
      }

      const clash = await prisma.reservation_room.findFirst({
        where: {
          reservation_id: { not: id },
          room_id: current.room_id,
          status: { in: ['pending', 'confirmed', 'checked_in'] },
          AND: [
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
        expires_at: true
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
// DELETE (optional; ส่วนใหญ่ฝั่ง admin)
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
// STATUS BY CODE: ลูกค้าเช็กสถานะด้วย reservation_code
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

    const lastPayment = reservation.payment_room[0] || null;

    res.json({
      code: reservation.reservation_code,
      status: reservation.status,
      expires_at: reservation.expires_at,
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

