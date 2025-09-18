const prisma = require('../../../config/prisma');

// ลูกค้าอัปสลิป (public)
// Body: { reservation_code, amount, method? = 'bank_transfer', slip_url (ถ้ายังไม่ทำอัปโหลดไฟล์) }
exports.uploadSlipRoom = async (req, res) => {
  try {
    const { reservation_code, amount, method = 'bank_transfer' } = req.body;

    // ถ้าคุณใช้ multer สำหรับไฟล์จริง:
    // const slipUrl = req.file ? `/uploads/slips/${req.file.filename}` : (req.body.slip_url || null);
    const slipUrl = req.body.slip_url || null;

    if (!reservation_code || !amount) {
      return res.status(400).json({ message: 'reservation_code and amount are required' });
    }

    const r = await prisma.reservation_room.findUnique({
      where: { reservation_code },
      select: { reservation_id: true, status: true, expires_at: true }
    });
    if (!r) return res.status(404).json({ message: 'Reservation not found' });

    // อนุญาตจ่ายเฉพาะ pending ที่ยังไม่หมดเวลา
    if (r.status !== 'pending' || (r.expires_at && r.expires_at < new Date())) {
      return res.status(400).json({ message: 'Reservation is not eligible for payment' });
    }

    const pay = await prisma.payment_room.create({
      data: {
        reservation_id: r.reservation_id,
        method, // 'bank_transfer' | 'promptpay'
        amount: String(amount),
        payment_status: 'pending',
        slip_url: slipUrl
      },
      select: { payment_id: true, payment_status: true, slip_url: true }
    });

    res.status(201).json({ status: 'ok', message: 'Slip uploaded (pending)', data: pay });
  } catch (e) {
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

      await tx.reservation_room.update({
        where: { reservation_id: p.reservation_id },
        data: { status: 'confirmed' }
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
    const p = await prisma.payment_room.update({
      where: { payment_id: id },
      data: { payment_status: 'rejected' },
      select: { payment_id: true, payment_status: true }
    });

    res.json({ status: 'ok', message: 'Payment rejected', data: p });
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(500).json({ status: 'error', message: e.message });
  }
};
