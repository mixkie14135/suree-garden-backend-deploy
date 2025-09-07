const prisma = require('../../../config/prisma');

const toTimeOnDate = (dateStr, timeHHmm) => {
  // สร้าง Date จาก event_date + เวลา (Prisma/MySQL TIME จะเก็บเฉพาะเวลา)
  return new Date(`${dateStr}T${timeHHmm}:00`);
};

exports.createReservationBanquet = async (req, res) => {
  try {
    const {
      customer_id,
      first_name, last_name,
      phone, email,
      banquet_id,
      event_date,   // 'YYYY-MM-DD'
      start_time,   // 'HH:mm'
      end_time      // 'HH:mm'
    } = req.body;

    if (!banquet_id || !event_date || !start_time || !end_time) {
      return res.status(400).json({ message: 'banquet_id, event_date, start_time, end_time required' });
    }

    const st = toTimeOnDate(event_date, start_time);
    const en = toTimeOnDate(event_date, end_time);
    if (!(st < en)) return res.status(400).json({ message: 'start_time must be before end_time' });

    // ลูกค้า
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

    // กันซ้อนทับ (วันเดียวกัน + เวลา overlap)
    const overlap = await prisma.reservation_banquet.findFirst({
      where: {
        banquet_id: Number(banquet_id),
        status: { in: ['pending','confirmed'] },
        event_date: new Date(event_date),
        AND: [
          { start_time: { lt: en } },
          { end_time:   { gt: st } },
        ],
      }
    });
    if (overlap) return res.status(409).json({ message: 'Banquet room is not available in selected time range' });

    const created = await prisma.reservation_banquet.create({
      data: {
        customer_id: cid,
        banquet_id: Number(banquet_id),
        event_date: new Date(event_date),
        start_time: st,
        end_time: en,
        phone: phone || null,
        email: email || null,
        status: 'pending',
      },
      select: {
        reservation_id: true, status: true, event_date: true, start_time: true, end_time: true
      }
    });

    res.status(201).json({
      status: 'ok',
      message: 'Banquet reservation created (pending). Use reservation_id as your reference.',
      data: { ...created, reservation_code: String(created.reservation_id) }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
