// src/modules/payment/slipok.controller.js
const prisma = require('../../config/prisma');
const policy = require('../../config/reservationPolicy');
const {
  verifySlipWithSlipOK,
  bankCodeToCanonical,
  normalizeName,
  last4FromMasked,
  parseAliases,
} = require('../../utils/slipok.service');

const { uploadPrivate, signPrivate } = require('../../utils/storage'); // << ใช้ helper อัปโหลด

// ----- VERSION TAG -----
const CTRL_VERSION = 'slipok.controller v3-flex';
const STRICT = String(process.env.SLIPOK_STRICT_MATCH || 'false') === 'true';

// ENV บัญชีเรา
const OUR_BANK_NAME       = process.env.OUR_BANK_NAME || '';
const OUR_ACCOUNT_NAMEENV = process.env.OUR_ACCOUNT_NAME || '';
const OUR_ACCOUNT_LAST4   = (process.env.OUR_ACCOUNT_LAST4 || '').replace(/[^0-9]/g, '');

const NAME_ALIASES   = parseAliases(OUR_ACCOUNT_NAMEENV).map(normalizeName);
const OUR_BANK_CANON = bankCodeToCanonical(OUR_BANK_NAME);

function verdictPayload(ok, detail) { return { ok, detail }; }

/** รองรับรูปแบบ response หลายแบบของ SlipOK */
function extractSlipPayload(slipRaw) {
  if (slipRaw?.slip && typeof slipRaw.slip === 'object') {
    return { ok: slipRaw.slip.success === true, data: slipRaw.slip.data || null };
  }
  if (slipRaw?.status === 'success' && slipRaw?.data) {
    return { ok: true, data: slipRaw.data };
  }
  if (slipRaw?.success === true && slipRaw?.data) {
    return { ok: true, data: slipRaw.data };
  }
  return { ok: false, data: null };
}

exports.verifyAndApplyRoom = async (req, res) => {
  try {
    console.log(`[CTRL] ${CTRL_VERSION} hit /verify-and-apply`);

    const { reservation_code, amount } = req.body;
    if (!reservation_code || !amount)
      return res.status(400).json({ message: 'reservation_code and amount are required' });
    if (!req.file)
      return res.status(400).json({ message: 'slip file is required (key: slip)' });

    // 1) หา reservation
    const r = await prisma.reservation_room.findUnique({
      where: { reservation_code },
      select: { reservation_id: true, status: true, expires_at: true },
    });
    if (!r) return res.status(404).json({ message: 'Reservation not found' });
    if (r.status !== 'pending' || (r.expires_at && r.expires_at < new Date()))
      return res.status(400).json({ message: 'Reservation is not eligible for payment' });

    // 2) ส่งไปตรวจที่ SlipOK
    const slipRaw = await verifySlipWithSlipOK({
      buffer: req.file.buffer,
      filename: req.file.originalname || 'slip.jpg',
      amount: Number(amount),
    });

    const parsed = extractSlipPayload(slipRaw);
    if (!parsed.ok || !parsed.data) {
      return res.status(400).json({ message: 'Slip verification failed', slip: slipRaw });
    }
    const data = parsed.data;

    // 3) ดึงค่าที่ต้องใช้เทียบ
    const receivingBankCanon = bankCodeToCanonical(data.receivingBank);   // e.g. "014" → "SCB"
    const receiverMaskedAcc  = data?.receiver?.account?.value || '';      // "XXX-X-XX193-6"
    const receiverNameTH     = data?.receiver?.displayName || '';
    const receiverNameEN     = data?.receiver?.name || '';
    const slipAmount         = Number(data?.amount ?? 0);
    const last4              = last4FromMasked(receiverMaskedAcc);

    // 4) เงื่อนไขผ่าน/ตก
    const reqAmount  = Number(amount);
    const amountPass = Math.abs(slipAmount - reqAmount) < 1e-6;
    const bankPass   = OUR_BANK_CANON ? (receivingBankCanon === OUR_BANK_CANON) : true;
    const accPass    = OUR_ACCOUNT_LAST4 ? (last4 === OUR_ACCOUNT_LAST4) : true;

    const nameNormTH = normalizeName(receiverNameTH);
    const nameNormEN = normalizeName(receiverNameEN);
    const namePass = (NAME_ALIASES.length === 0)
      ? true
      : NAME_ALIASES.some(a =>
          nameNormTH.includes(a) || nameNormEN.includes(a) ||
          a.includes(nameNormTH) || a.includes(nameNormEN)
        );

    const passed = STRICT
      ? (amountPass && bankPass && accPass && namePass)
      : (amountPass && bankPass && accPass);

    const detail = {
      ctrlVersion: CTRL_VERSION,
      amountPass, bankPass, accPass, namePass,
      expected: { bankCanon: OUR_BANK_CANON, last4: OUR_ACCOUNT_LAST4, aliases: NAME_ALIASES },
      receive: {
        bank: data.receivingBank,
        bankCanon: receivingBankCanon,
        nameTH: receiverNameTH,
        nameEN: receiverNameEN,
        maskedAccount: receiverMaskedAcc,
        last4,
      }
    };

    // 5) อัปโหลดสลิปขึ้น Supabase (private)
    const extFromName = (req.file.originalname || '').split('.').pop() || 'jpg';
    const safeExt = extFromName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

    let objectPath = null;
    try {
      const uploaded = await uploadPrivate({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype || 'image/jpeg',
        folder: `slips/room_${r.reservation_id}`,
        filename: `slip_${Date.now()}.${safeExt}`,
      });
      objectPath = uploaded.objectPath;
    } catch (e) {
      console.warn('Upload slip to Supabase failed:', e.message);
      // ไม่บล็อค flow การยืนยันสลิป — จะยังคงผ่านการจ่ายได้ แต่ไม่มีไฟล์เก็บไว้
    }

    // 6) เขียน DB
    const result = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment_room.create({
        data: {
          reservation_id: r.reservation_id,
          method: 'bank_transfer',
          amount: String(amount),
          payment_status: passed ? 'confirmed' : 'pending',
          slip_url: objectPath,            // << เก็บ path private (อาจเป็น null ถ้าอัปโหลดล้มเหลว)
          gateway_provider: 'slipok',
          gateway_raw: slipRaw,            // เก็บ raw ไว้ตรวจย้อนหลัง
          paid_at: passed ? new Date() : null,
        },
        select: { payment_id: true, payment_status: true },
      });

      if (passed) {
        await tx.payment_room.updateMany({
          where: { reservation_id: r.reservation_id, payment_id: { not: pay.payment_id }, payment_status: 'pending' },
          data: { payment_status: 'rejected' },
        });
        await tx.reservation_room.update({
          where: { reservation_id: r.reservation_id },
          data: { status: 'confirmed', expires_at: null },
        });
      } else {
        const holdMs = policy.pendingWithSlipExpireMinutes * 60 * 1000;
        await tx.reservation_room.update({
          where: { reservation_id: r.reservation_id },
          data: { expires_at: new Date(Date.now() + holdMs) },
        });
      }
      return pay;
    });

    // 7) (optional) signed preview 10 นาที สำหรับ debug
    let signedUrl = null;
    if (objectPath) {
      try { signedUrl = await signPrivate(objectPath, { expiresIn: 60 * 10 }); } catch (_) {}
    }

    return res.status(200).json({
      status: 'ok',
      verdict: verdictPayload(passed, detail),
      data: {
        payment_id: result.payment_id,
        payment_status: result.payment_status,
        slip_summary: {
          amount: slipAmount,
          receivingBank: data.receivingBank,
          receiverNameTH,
          receiverNameEN,
          receiverMaskedAccount: receiverMaskedAcc,
          transDate: data.transDate || null,
          transTime: data.transTime || null,
          transTimestamp: data.transTimestamp || null,
        },
        slip_url: objectPath,
        slip_signed_preview: signedUrl,
      }
    });

  } catch (e) {
    console.error('verifyAndApplyRoom error:', e);
    return res.status(500).json({ status: 'error', message: e.message });
  }
};


exports.verifyAndApplyBanquet = async (req, res) => {
  try {
    console.log(`[CTRL] ${CTRL_VERSION} hit /verify-and-apply (banquet)`);

    const { reservation_code, amount } = req.body;
    if (!reservation_code || !amount)
      return res.status(400).json({ message: 'reservation_code and amount are required' });
    if (!req.file)
      return res.status(400).json({ message: 'slip file is required (key: slip)' });

    // 1) หา reservation_banquet
    const r = await prisma.reservation_banquet.findUnique({
      where: { reservation_code },
      select: { reservation_id: true, status: true, expires_at: true },
    });
    if (!r) return res.status(404).json({ message: 'Reservation not found' });
    if (r.status !== 'pending' || (r.expires_at && r.expires_at < new Date()))
      return res.status(400).json({ message: 'Reservation is not eligible for payment' });

    // 2) ตรวจ SlipOK
    const slipRaw = await verifySlipWithSlipOK({
      buffer: req.file.buffer,
      filename: req.file.originalname || 'slip.jpg',
      amount: Number(amount),
    });

    const parsed = extractSlipPayload(slipRaw);
    if (!parsed.ok || !parsed.data) {
      return res.status(400).json({ message: 'Slip verification failed', slip: slipRaw });
    }
    const data = parsed.data;

    // 3) เทียบค่า
    const receivingBankCanon = bankCodeToCanonical(data.receivingBank);
    const receiverMaskedAcc  = data?.receiver?.account?.value || '';
    const receiverNameTH     = data?.receiver?.displayName || '';
    const receiverNameEN     = data?.receiver?.name || '';
    const slipAmount         = Number(data?.amount ?? 0);
    const last4              = last4FromMasked(receiverMaskedAcc);

    const reqAmount  = Number(amount);
    const amountPass = Math.abs(slipAmount - reqAmount) < 1e-6;
    const bankPass   = OUR_BANK_CANON ? (receivingBankCanon === OUR_BANK_CANON) : true;
    const accPass    = OUR_ACCOUNT_LAST4 ? (last4 === OUR_ACCOUNT_LAST4) : true;

    const nameNormTH = normalizeName(receiverNameTH);
    const nameNormEN = normalizeName(receiverNameEN);
    const namePass = (NAME_ALIASES.length === 0)
      ? true
      : NAME_ALIASES.some(a =>
          nameNormTH.includes(a) || nameNormEN.includes(a) ||
          a.includes(nameNormTH) || a.includes(nameNormEN)
        );

    const passed = STRICT
      ? (amountPass && bankPass && accPass && namePass)
      : (amountPass && bankPass && accPass);

    const detail = {
      ctrlVersion: CTRL_VERSION,
      amountPass, bankPass, accPass, namePass,
      expected: { bankCanon: OUR_BANK_CANON, last4: OUR_ACCOUNT_LAST4, aliases: NAME_ALIASES },
      receive: {
        bank: data.receivingBank,
        bankCanon: receivingBankCanon,
        nameTH: receiverNameTH,
        nameEN: receiverNameEN,
        maskedAccount: receiverMaskedAcc,
        last4,
      }
    };

    // 4) อัปโหลดสลิปเข้า Supabase (private)
    const extFromName = (req.file.originalname || '').split('.').pop() || 'jpg';
    const safeExt = extFromName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

    let objectPath = null;
    try {
      const { objectPath: op } = await uploadPrivate({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype || 'image/jpeg',
        folder: `slips/banquet_${r.reservation_id}`,
        filename: `slip_${Date.now()}.${safeExt}`,
      });
      objectPath = op;
    } catch (e) {
      console.warn('Upload slip (banquet) to Supabase failed:', e.message);
    }

    // 5) เขียน DB (payment_banquet + อัปเดต reservation_banquet)
    const result = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment_banquet.create({
        data: {
          reservation_id: r.reservation_id,
          method: 'bank_transfer',
          amount: String(amount),
          payment_status: passed ? 'confirmed' : 'pending',
          slip_url: objectPath,
          gateway_provider: 'slipok',
          gateway_raw: slipRaw,
          paid_at: passed ? new Date() : null,
        },
        select: { payment_id: true, payment_status: true },
      });

      if (passed) {
        await tx.payment_banquet.updateMany({
          where: { reservation_id: r.reservation_id, payment_id: { not: pay.payment_id }, payment_status: 'pending' },
          data: { payment_status: 'rejected' },
        });
        await tx.reservation_banquet.update({
          where: { reservation_id: r.reservation_id },
          data: { status: 'confirmed', expires_at: null },
        });
      } else {
        const holdMs = policy.pendingWithSlipExpireMinutes * 60 * 1000;
        await tx.reservation_banquet.update({
          where: { reservation_id: r.reservation_id },
          data: { expires_at: new Date(Date.now() + holdMs) },
        });
      }
      return pay;
    });

    // 6) (optional) signed preview 10 นาที
    let signedUrl = null;
    if (objectPath) {
      try { signedUrl = await signPrivate(objectPath, { expiresIn: 60 * 10 }); } catch (_) {}
    }

    return res.status(200).json({
      status: 'ok',
      verdict: verdictPayload(passed, detail),
      data: {
        payment_id: result.payment_id,
        payment_status: result.payment_status,
        slip_summary: {
          amount: slipAmount,
          receivingBank: data.receivingBank,
          receiverNameTH,
          receiverNameEN,
          receiverMaskedAccount: receiverMaskedAcc,
          transDate: data.transDate || null,
          transTime: data.transTime || null,
          transTimestamp: data.transTimestamp || null,
        },
        slip_url: objectPath,
        slip_signed_preview: signedUrl,
      }
    });

  } catch (e) {
    console.error('verifyAndApplyBanquet error:', e);
    return res.status(500).json({ status: 'error', message: e.message });
  }
};
