const prisma = require('../../../config/prisma');
const { genReservationCode } = require('../../../utils/code_reservation');

const PENDING_MINUTES = 15; // เวลาจำกัดแนบสลิป

// สร้างการจองห้องพัก
exports.createReservationRoom = async (req, res) => {
  try {
    const {
      customer_id,
      first_name, last_name, // ใช้ตอนลูกค้าไม่ได้ล็อกอิน
      phone, email,
      room_id,
      checkin_date, // 'YYYY-MM-DD'
      checkout_date // 'YYYY-MM-DD'
    } = req.body;

    if (!room_id || !checkin_date || !checkout_date) {
      return res.status(400).json({ message: 'room_id, checkin_date, checkout_date required' });
    }

    const inDate  = new Date(checkin_date);
    const outDate = new Date(checkout_date);
    if (!(inDate < outDate)) return res.status(400).json({ message: 'checkin_date must be before checkout_date' });

    // หาลูกค้า (ถ้าไม่ส่ง customer_id มา)
    let cid = customer_id ? Number(customer_id) : null;
    if (!cid) {
      if (!first_name || !last_name) {
        return res.status(400).json({ message: 'first_name & last_name required when no customer_id' });
      }
      // พยายามหาเดิมจาก phone/email (ถ้าให้มา)
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

    // กันซ้อนทับ (pending|confirmed|checked_in)
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
    if (overlap) return res.status(409).json({ message: 'Room is not available in selected dates' });

     // gen code (พยายามให้ unique)
    let code = genReservationCode(8);
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.reservation_room.findUnique({ where: { reservation_code: code } }).catch(() => null);
      if (!exists) break;
      code = genReservationCode(8);
    }
    const expiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    // create
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
        reservation_id: true, reservation_code: true, status: true,
        checkin_date: true, checkout_date: true, expires_at: true
      }
    });

    // ใช้ reservation_id เป็น "รหัสการจอง" เบื้องต้น
    res.status(201).json({
      status: 'ok',
      message: 'Reservation created (pending). Use reservation_id as your reference.',
      data: created
      //data: { ...created, reservation_code: String(created.reservation_id) }
    });
  } catch (err) {
    // กันเคสชน unique โดยสุ่มใหม่อีกรอบให้เลย (ไม่บังคับ ทำได้ถ้าอยากชัวร์)
    if (err.code === 'P2002' && err.meta?.target?.includes('reservation_code')) {
      return res.status(409).json({ message: 'Reservation code collision, please retry' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ดูสถานะการจองห้องพัก (ด้วย reservation_id)
exports.getReservationRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
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
      status: r.status,
      checkin_date: r.checkin_date,
      checkout_date: r.checkout_date,
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
