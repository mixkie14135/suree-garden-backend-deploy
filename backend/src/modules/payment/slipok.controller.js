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
const { uploadPrivate, signPrivate } = require('../../utils/storage');

const CTRL_VERSION = 'slipok.controller v3-flex';
const STRICT = String(process.env.SLIPOK_STRICT_MATCH || 'false') === 'true';

const OUR_BANK_NAME       = process.env.OUR_BANK_NAME || '';
const OUR_ACCOUNT_NAMEENV = process.env.OUR_ACCOUNT_NAME || '';
const OUR_ACCOUNT_LAST4   = (process.env.OUR_ACCOUNT_LAST4 || '').replace(/[^0-9]/g, '');

const NAME_ALIASES   = parseAliases(OUR_ACCOUNT_NAMEENV).map(normalizeName);
const OUR_BANK_CANON = bankCodeToCanonical(OUR_BANK_NAME);

// ---------- small helpers ----------
function verdictPayload(ok, detail) { return { ok, detail }; }

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

const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
]);

function sniffImageFormat(buf = Buffer.alloc(0)) {
  if (buf.length < 8) return null;
  // JPEG: FF D8
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf.slice(0,8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]))) return 'png';
  // WEBP: "RIFF" .... "WEBP"
  if (buf.slice(0,4).toString('ascii') === 'RIFF' && buf.slice(8,12).toString('ascii') === 'WEBP') return 'webp';
  // HEIC/HEIF: ftypheic / ftypheif / ftypmif1 / ftypmsf1 etc. at bytes 4-12
  const brand = buf.slice(4,12).toString('ascii');
  if (/^(ftypheic|ftypheif|ftypmif1|ftypmsf1)/.test(brand)) return 'heic';
  return null;
}

function basicImageGuards(file) {
  if (!file) {
    return { ok: false, http: 400, status: 'invalid_file', message: 'INVALID_FILE: กรุณาแนบไฟล์สลิปรูปภาพ (คีย์ slip)' };
  }
  const mime = String(file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    return { ok: false, http: 415, status: 'invalid_file', message: 'INVALID_FILE_TYPE: รองรับเฉพาะรูปภาพ JPG/PNG/WEBP/HEIC' };
  }
  if (!file.buffer || !Buffer.isBuffer(file.buffer) || file.buffer.length < 8192) { // < 8KB มักเป็นไฟล์ไม่สมบูรณ์
    return { ok: false, http: 400, status: 'invalid_image', message: 'INVALID_IMAGE_TOO_SMALL: ไฟล์รูปภาพไม่ถูกต้องหรือมีขนาดเล็กเกินไป' };
  }
  const fmt = sniffImageFormat(file.buffer);
  if (!fmt) {
    return { ok: false, http: 400, status: 'invalid_image', message: 'INVALID_IMAGE_FORMAT: ไม่ใช่ไฟล์รูปภาพที่ถูกต้อง หรือไฟล์เสีย' };
  }
  return { ok: true };
}

/* --------------------------------------------------
 * ROOM: verify and apply payment slip
 * -------------------------------------------------- */
exports.verifyAndApplyRoom = async (req, res) => {
  try {
    console.log(`[CTRL] ${CTRL_VERSION} hit /verify-and-apply (room)`);

    const { reservation_code, amount } = req.body;

    if (!reservation_code || !amount) {
      return res.status(400).json({ message: 'reservation_code and amount are required' });
    }

    // guard: file + image format
    const guard = basicImageGuards(req.file);
    if (!guard.ok) {
      return res.status(guard.http).json({ status: guard.status, message: guard.message });
    }

    // find reservation
    const r = await prisma.reservation_room.findUnique({
      where: { reservation_code },
      select: { reservation_id: true, status: true, expires_at: true },
    });
    if (!r) return res.status(404).json({ message: 'NOT_FOUND: Reservation not found' });
    if (r.status !== 'pending' || (r.expires_at && r.expires_at < new Date())) {
      return res.status(400).json({ message: 'NOT_ELIGIBLE: Reservation is not eligible for payment' });
    }

    // verify with SlipOK with explicit error mapping
    let slipRaw;
    try {
      slipRaw = await verifySlipWithSlipOK({
        buffer: req.file.buffer,
        filename: req.file.originalname || 'slip.jpg',
        amount: Number(amount),
      });
    } catch (err) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || err.message;

      if (code === 1012) {
        return res.status(400).json({
          status: 'duplicate',
          message: 'DUPLICATE_SLIP: สลิปนี้เคยถูกใช้ตรวจสอบแล้ว กรุณาใช้สลิปใหม่',
          slipok_message: msg,
        });
      }
      // บางกรณี SlipOK จะตอบว่าไม่พบข้อมูลโอนในภาพ (ไม่ใช่สลิปจริง)
      if (code === 1006 || /not a slip|no.*transaction/i.test(String(msg))) {
        return res.status(400).json({
          status: 'invalid_slip',
          message: 'INVALID_SLIP: ไม่พบข้อมูลสลิปในภาพที่แนบมา กรุณาอัปโหลดภาพสลิปโอนเงินจริง',
          slipok_message: msg,
        });
      }
      return res.status(400).json({
        status: 'failed',
        message: 'VERIFY_FAILED: ไม่สามารถตรวจสอบสลิปได้',
        slipok_message: msg,
      });
    }

    const parsed = extractSlipPayload(slipRaw);
    if (!parsed.ok || !parsed.data) {
      return res.status(400).json({
        status: 'invalid_slip',
        message: 'INVALID_SLIP: ไม่พบข้อมูลสลิปในภาพที่แนบมา',
        slip: slipRaw,
      });
    }
    const data = parsed.data;

    // matching rules (amount / bank / last4 / (name if STRICT))
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
      },
    };

    // upload slip (best-effort)
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
    }

    // write DB
    const result = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment_room.create({
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
      },
    });
  } catch (e) {
    console.error('verifyAndApplyRoom error:', e);
    return res.status(500).json({ status: 'error', message: e.message });
  }
};

/* --------------------------------------------------
 * BANQUET: verify and apply payment slip
 * -------------------------------------------------- */
exports.verifyAndApplyBanquet = async (req, res) => {
  try {
    console.log(`[CTRL] ${CTRL_VERSION} hit /verify-and-apply (banquet)`);

    const { reservation_code, amount } = req.body;

    if (!reservation_code || !amount) {
      return res.status(400).json({ message: 'reservation_code and amount are required' });
    }

    // guard: file + image format
    const guard = basicImageGuards(req.file);
    if (!guard.ok) {
      return res.status(guard.http).json({ status: guard.status, message: guard.message });
    }

    // find reservation
    const r = await prisma.reservation_banquet.findUnique({
      where: { reservation_code },
      select: { reservation_id: true, status: true, expires_at: true },
    });
    if (!r) return res.status(404).json({ message: 'NOT_FOUND: Reservation not found' });
    if (r.status !== 'pending' || (r.expires_at && r.expires_at < new Date())) {
      return res.status(400).json({ message: 'NOT_ELIGIBLE: Reservation is not eligible for payment' });
    }

    // verify with SlipOK
    let slipRaw;
    try {
      slipRaw = await verifySlipWithSlipOK({
        buffer: req.file.buffer,
        filename: req.file.originalname || 'slip.jpg',
        amount: Number(amount),
      });
    } catch (err) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || err.message;

      if (code === 1012) {
        return res.status(400).json({
          status: 'duplicate',
          message: 'DUPLICATE_SLIP: สลิปนี้เคยถูกใช้ตรวจสอบแล้ว กรุณาใช้สลิปใหม่',
          slipok_message: msg,
        });
      }
      if (code === 1006 || /not a slip|no.*transaction/i.test(String(msg))) {
        return res.status(400).json({
          status: 'invalid_slip',
          message: 'INVALID_SLIP: ไม่พบข้อมูลสลิปในภาพที่แนบมา กรุณาอัปโหลดภาพสลิปโอนเงินจริง',
          slipok_message: msg,
        });
      }
      return res.status(400).json({
        status: 'failed',
        message: 'VERIFY_FAILED: ไม่สามารถตรวจสอบสลิปได้',
        slipok_message: msg,
      });
    }

    const parsed = extractSlipPayload(slipRaw);
    if (!parsed.ok || !parsed.data) {
      return res.status(400).json({
        status: 'invalid_slip',
        message: 'INVALID_SLIP: ไม่พบข้อมูลสลิปในภาพที่แนบมา',
        slip: slipRaw,
      });
    }
    const data = parsed.data;

    // matching rules
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
      },
    };

    // upload (best-effort)
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

    // write DB
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
      },
    });
  } catch (e) {
    console.error('verifyAndApplyBanquet error:', e);
    return res.status(500).json({ status: 'error', message: e.message });
  }
};
