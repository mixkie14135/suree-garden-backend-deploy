const prisma = require('../../../config/prisma');

// ลูกค้าอัปสลิป (public)
// Body: { reservation_code, amount, method? = 'bank_transfer', slip_url (ถ้ายังไม่ทำอัปโหลดไฟล์) }

exports.uploadSlipRoom = async (req, res) => {
    if (req.file) {
    slipUrl = `/uploads/slips/${req.file.filename}`;
    }

  try {
    const { reservation_code, amount, method = 'bank_transfer' } = req.body;

    if (!reservation_code || !amount) {
      return res.status(400).json({ message: 'reservation_code and amount are required' });
    }

    // ถ้ามีไฟล์จาก multer ให้ใช้ไฟล์นั้นก่อน
    let slipUrl = null;
    if (req.file) {
      // เส้นทางที่ client เข้าได้ (เพราะเราเสิร์ฟ /uploads แบบ static)
      slipUrl = `/uploads/slips/${req.file.filename}`;
    } else if (req.body.slip_url) {
      // fallback สำหรับทดสอบ (ลิงก์ภายนอก)
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

    const pay = await prisma.payment_room.create({
      data: {
        reservation_id: r.reservation_id,
        method,
        amount: String(amount),
        payment_status: 'pending',
        slip_url: slipUrl
      },
      select: { payment_id: true, payment_status: true, slip_url: true }
    });

    res.status(201).json({ status: 'ok', message: 'Slip uploaded (pending)', data: pay });
  } catch (e) {
    // จัดการ error จาก multer (เช่น ไฟล์ใหญ่/ชนิดไม่ถูกต้อง)
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

exports.getRoomPaymentById = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ status:'error', message:'invalid id' });

  const p = await prisma.payment_room.findUnique({ where: { payment_id: id } });
  if (!p) return res.status(404).json({ status:'error', message:'not found' });

  // p.slip_url จะเป็น /uploads/slips/... เปิดดูได้เลย
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

