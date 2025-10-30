// backend/src/modules/payment/banquet/paymentBanquet.controller.js
const prisma = require('../../../config/prisma');
const policy = require('../../../config/reservationPolicy');
const { uploadPrivate, signPrivate } = require('../../../utils/storage');

// ลูกค้าอัปสลิป → เก็บ objectPath (private) ลง field slip_url
exports.uploadSlipBanquet = async (req, res) => {
  try {
    const { reservation_code, amount, method = 'bank_transfer' } = req.body;
    if (!reservation_code || !amount) {
      return res.status(400).json({ message: 'reservation_code and amount are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'slip file is required (key: slip)' });
    }

    const r = await prisma.reservation_banquet.findUnique({
      where: { reservation_code },
      select: { reservation_id: true, status: true, expires_at: true }
    });
    if (!r) return res.status(404).json({ message: 'Reservation not found' });
    if (r.status !== 'pending' || (r.expires_at && r.expires_at < new Date())) {
      return res.status(400).json({ message: 'Reservation is not eligible for payment' });
    }

    const { objectPath } = await uploadPrivate({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      folder: `slips/banquet_${r.reservation_id}`,
    });

    const newExpire = new Date(Date.now() + policy.pendingWithSlipExpireMinutes * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment_banquet.create({
        data: {
          reservation_id: r.reservation_id,
          method,
          amount: String(amount),
          payment_status: 'pending',
          slip_url: objectPath, // เก็บ path private
        },
        select: { payment_id: true, payment_status: true, slip_url: true }
      });

      await tx.reservation_banquet.update({
        where: { reservation_id: r.reservation_id },
        data: { expires_at: newExpire }
      });

      return pay;
    });

    res.status(201).json({
      status: 'ok',
      message: `Slip uploaded (pending). Hold +${policy.pendingWithSlipExpireMinutes}m`,
      data: result
    });
  } catch (e) {
    if (e instanceof Error && e.message && /Invalid file type|File too large/i.test(e.message)) {
      return res.status(400).json({ message: e.message });
    }
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// เอา signed URL ให้แอดมินดู
exports.viewSlipBanquetAdmin = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const by = (req.query.by === 'payment') ? 'payment' : 'reservation';

    let path;
    if (by === 'payment') {
      const row = await prisma.payment_banquet.findUnique({ where: { payment_id: id }, select: { slip_url: true } });
      if (!row?.slip_url) return res.status(404).json({ message: 'No slip' });
      path = row.slip_url;
    } else {
      const row = await prisma.payment_banquet.findFirst({
        where: { reservation_id: id, slip_url: { not: null } },
        orderBy: { created_at: 'desc' },
        select: { slip_url: true }
      });
      if (!row?.slip_url) return res.status(404).json({ message: 'No slip' });
      path = row.slip_url;
    }

    const url = await signPrivate(path, { expiresIn: 60 * 30 });
    res.json({ url });
  } catch (e) {
    res.status(500).json({ message: 'Cannot sign URL' });
  }
};

// ที่เหลือคงเดิม
exports.approveBanquetPayment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment_banquet.update({
        where: { payment_id: id },
        data: { payment_status: 'confirmed', paid_at: new Date() },
        select: { payment_id: true, reservation_id: true }
      });

      await tx.payment_banquet.updateMany({
        where: { reservation_id: p.reservation_id, payment_id: { not: p.payment_id }, payment_status: 'pending' },
        data: { payment_status: 'rejected' }
      });

      await tx.reservation_banquet.update({
        where: { reservation_id: p.reservation_id },
        data: { status: 'confirmed', expires_at: null }
      });

      return p;
    });

    res.json({ status: 'ok', message: 'Payment confirmed', data: updated });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Payment not found' });
    res.status(500).json({ status: 'error', message: e.message });
  }
};

exports.rejectBanquetPayment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment_banquet.update({
        where: { payment_id: id },
        data: { payment_status: 'rejected' },
        select: { payment_id: true, reservation_id: true }
      });

      await tx.reservation_banquet.update({
        where: { reservation_id: pay.reservation_id },
        data: { status: 'cancelled' }
      });

      return pay;
    });

    res.json({ status: 'ok', message: 'Payment rejected, reservation cancelled', data: p });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Payment not found' });
    res.status(500).json({ status: 'error', message: e.message });
  }
};

exports.getBanquetPaymentById = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ status:'error', message:'invalid id' });
  const p = await prisma.payment_banquet.findUnique({ where: { payment_id: id } });
  if (!p) return res.status(404).json({ status:'error', message:'not found' });
  res.json({ status:'ok', data: p });
};

exports.listBanquetPayments = async (req, res) => {
  const reservationId = req.query.reservation_id ? Number(req.query.reservation_id) : undefined;
  const where = reservationId ? { reservation_id: reservationId } : {};
  const list = await prisma.payment_banquet.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { payment_id: 'desc' }]
  });
  res.json({ status:'ok', data: list });
};
