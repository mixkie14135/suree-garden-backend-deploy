// backend/src/modules/payment/room/paymentRoom.controller.js
const prisma = require('../../../config/prisma');
const policy = require('../../../config/reservationPolicy');

// ลูกค้าอัปสลิป (public)
exports.uploadSlipRoom = async (req, res) => {
  try {
    const { reservation_code, amount, method = 'bank_transfer' } = req.body;

    if (!reservation_code || !amount) {
      return res.status(400).json({ message: 'reservation_code and amount are required' });
    }

    let slipUrl = null;
    if (req.file) {
      slipUrl = `/uploads/slips/${req.file.filename}`;
    } else if (req.body.slip_url) {
      slipUrl = req.body.slip_url;
    } else {
      return res.status(400).json({ message: 'slip file is required (key: slip)' });
    }

    const r = await prisma.reservation_room.findUnique({
      where: { reservation_code },
      select: { reservation_id: true, status: true, expires_at: true }
    });
    if (!r) return res.status(404).json({ message: 'Reservation not found' });

    if (r.status !== 'pending' || (r.expires_at && r.expires_at < new Date())) {
      return res.status(400).json({ message: 'Reservation is not eligible for payment' });
    }

    const newExpire = new Date(Date.now() + policy.pendingWithSlipExpireMinutes * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment_room.create({
        data: {
          reservation_id: r.reservation_id,
          method,
          amount: String(amount),
          payment_status: 'pending',
          slip_url: slipUrl
        },
        select: { payment_id: true, payment_status: true, slip_url: true }
      });

      await tx.reservation_room.update({
        where: { reservation_id: r.reservation_id },
        data: { expires_at: newExpire }
      });

      return pay;
    });

    res.status(201).json({ status: 'ok', message: `Slip uploaded (pending). Hold +${policy.pendingWithSlipExpireMinutes}m`, data: result });
  } catch (e) {
    if (e instanceof Error && e.message && /Invalid file type|File too large/i.test(e.message)) {
      return res.status(400).json({ message: e.message });
    }
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// แอดมินอนุมัติ
exports.approveRoomPayment = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment_room.update({
        where: { payment_id: id },
        data: { payment_status: 'confirmed', paid_at: new Date() },
        select: { payment_id: true, reservation_id: true }
      });

      // ปัดตกใบอื่นที่ยัง pending ของ reservation เดียวกัน
      await tx.payment_room.updateMany({
        where: { reservation_id: p.reservation_id, payment_id: { not: p.payment_id }, payment_status: 'pending' },
        data: { payment_status: 'rejected' }
      });

      await tx.reservation_room.update({
        where: { reservation_id: p.reservation_id },
        data: { status: 'confirmed', expires_at: null }
      });

      return p;
    });

    res.json({ status: 'ok', message: 'Payment confirmed', data: updated });
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// แอดมินปฏิเสธ
exports.rejectRoomPayment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment_room.update({
        where: { payment_id: id },
        data: { payment_status: 'rejected' },
        select: { payment_id: true, reservation_id: true }
      });

      // ปล่อยคิว: ยกเลิกการจอง (ถ้าไม่อยากปล่อย ให้คอมเมนต์ส่วนนี้)
      await tx.reservation_room.update({
        where: { reservation_id: pay.reservation_id },
        data: { status: 'cancelled' }
      });

      return pay;
    });

    res.json({ status: 'ok', message: 'Payment rejected & reservation cancelled', data: p });
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(500).json({ status: 'error', message: e.message });
  }
};

exports.getRoomPaymentById = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ status:'error', message:'invalid id' });

  const p = await prisma.payment_room.findUnique({ where: { payment_id: id } });
  if (!p) return res.status(404).json({ status:'error', message:'not found' });

  res.json({ status:'ok', data: p });
};

exports.listRoomPayments = async (req, res) => {
  const reservationId = req.query.reservation_id ? Number(req.query.reservation_id) : undefined;
  const where = reservationId ? { reservation_id: reservationId } : {};
  const list = await prisma.payment_room.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { payment_id: 'desc' }]
  });
  res.json({ status:'ok', data: list });
};
