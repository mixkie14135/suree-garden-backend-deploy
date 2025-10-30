// backend/src/modules/reservation/banquet/reservationBanquet.controller.js
const prisma = require("../../../config/prisma");
const { genReservationCode } = require("../../../utils/code_reservation");
const {
  parseDateInput,
  timeToMinutes,
  isOverlapMinutes,
  combineDateAndTimeUTC,
  toUtcMidnight,
  formatDateTimeThai,
} = require("../../../utils/date");

const {
  resolveCustomerId,
  normalizePhoneTH,
} = require("../../../utils/customer");
const { sendReservationEmail } = require("../../../utils/mailer");

const PENDING_MINUTES = 15;
const ALLOWED_STATUSES = ["pending", "confirmed", "cancelled", "expired"];

/* ===== CREATE ===== */
exports.createReservationBanquet = async (req, res) => {
  const rid = req._rid || Math.random().toString(36).slice(2, 8);
  try {
    const {
      banquet_id,
      customer_id,
      first_name,
      last_name,
      phone,
      email,
      event_date,
      start_time,
      end_time,
    } = req.body;

    console.log(`[BANQ:${rid}] CREATE body=`, { banquet_id, customer_id, first_name, last_name, phone, email, event_date, start_time, end_time });

    if (!banquet_id || !event_date || !start_time || !end_time) {
      console.log(`[BANQ:${rid}] -> 400 missing required`);
      return res.status(400).json({
        message: "banquet_id, event_date, start_time, end_time required",
      });
    }
    if (!email && !customer_id) {
      console.log(`[BANQ:${rid}] -> 400 email required`);
      return res.status(400).json({ message: "email is required (or provide customer_id)" });
    }

    const day = parseDateInput(event_date);
    if (!day) {
      console.log(`[BANQ:${rid}] -> 400 invalid event_date`, event_date);
      return res.status(400).json({ message: "Invalid event_date" });
    }

    const st = combineDateAndTimeUTC(day, start_time);
    const et = combineDateAndTimeUTC(day, end_time);
    if (!(st && et)) {
      console.log(`[BANQ:${rid}] -> 400 invalid start/end`, { start_time, end_time });
      return res.status(400).json({ message: "Invalid start_time or end_time" });
    }
    if (!(st < et)) {
      console.log(`[BANQ:${rid}] -> 400 start >= end`);
      return res.status(400).json({ message: "start_time must be before end_time" });
    }

    let cid;
    try {
      cid = await resolveCustomerId(prisma, {
        customer_id, first_name, last_name, email, phone
      });
      console.log(`[BANQ:${rid}] resolveCustomerId ->`, cid);
    } catch (e) {
      console.log(`[BANQ:${rid}] resolveCustomerId ERROR`, e);
      if (e.code === "PHONE_CONFLICT") {
        return res.status(409).json({
          message: "เบอร์นี้ถูกใช้งานกับอีเมลอีกบัญชีแล้ว กรุณาใช้ข้อมูลชุดเดิมหรือยืนยันกับแอดมิน",
        });
      }
      return res.status(400).json({ message: e.message || "resolve customer failed" });
    }

    const eventDayUtc = toUtcMidnight(day);

    let code = genReservationCode(8);
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.reservation_banquet
        .findUnique({ where: { reservation_code: code } })
        .catch(() => null);
      if (!exists) break;
      console.warn(`[BANQ:${rid}] code collision -> regen`);
      code = genReservationCode(8);
    }
    const expiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    const acc = await prisma.bank_account.findFirst({
      where: { is_active: true },
      orderBy: [{ is_default: "desc" }, { bank_account_id: "asc" }],
      select: {
        bank_name: true, account_name: true, account_number: true, promptpay_id: true,
      },
    });
    console.log(`[BANQ:${rid}] bank snapshot=`, acc ? { bank_name: acc.bank_name, account_number: acc.account_number } : null);

    const created = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const overlaps = await tx.reservation_banquet.findMany({
        where: {
          banquet_id: Number(banquet_id),
          event_date: { equals: eventDayUtc },
          OR: [
            { status: "confirmed" },
            { AND: [{ status: "pending" }, { expires_at: { gt: now } }] },
          ],
        },
        select: { start_time: true, end_time: true },
      });
      console.log(`[BANQ:${rid}] overlaps count=`, overlaps.length);

      const reqStartMin = timeToMinutes(st);
      const reqEndMin = timeToMinutes(et);
      const hasOverlap = overlaps.some((o) => {
        const oStartMin = timeToMinutes(o.start_time);
        const oEndMin = timeToMinutes(o.end_time);
        return isOverlapMinutes(reqStartMin, reqEndMin, oStartMin, oEndMin);
      });
      if (hasOverlap) {
        console.log(`[BANQ:${rid}] OVERLAP`);
        const err = new Error("OVERLAP");
        err.type = "OVERLAP";
        throw err;
      }

      return tx.reservation_banquet.create({
        data: {
          customer_id: cid,
          banquet_id: Number(banquet_id),
          event_date: eventDayUtc,
          start_time: st,
          end_time: et,
          contact_name: `${first_name || ""} ${last_name || ""}`.trim(),
          contact_email: email || null,
          contact_phone: normalizePhoneTH(phone) || null,
          status: "pending",
          reservation_code: code,
          expires_at: expiresAt,
          pay_account_snapshot: acc ? {
            bank_name: acc.bank_name,
            account_name: acc.account_name,
            account_number: acc.account_number,
            promptpay_id: acc.promptpay_id || null,
          } : null,
          payment_due_at: expiresAt,
        },
        select: {
          reservation_id: true, reservation_code: true, status: true,
          event_date: true, start_time: true, end_time: true,
          expires_at: true, payment_due_at: true, pay_account_snapshot: true,
          banquet_room: { select: { banquet_id: true, name: true } },
          customer: { select: { customer_id: true, first_name: true, last_name: true } },
        },
      });
    });

    console.log(`[BANQ:${rid}] CREATED code=${created.reservation_code} status=${created.status}`);

    if (email) {
      const accountHtml = created.pay_account_snapshot ? `
        <li>โอนเข้าบัญชี: <b>${created.pay_account_snapshot.bank_name}</b>
            เลขที่ <b>${created.pay_account_snapshot.account_number}</b>
            ชื่อบัญชี <b>${created.pay_account_snapshot.account_name}</b></li>` : "";
      const summaryHtml = `
        <ul>
          <li>ห้องจัดเลี้ยง: <b>${created.banquet_room.name}</b></li>
          <li>วันที่เวลา: <b>${event_date} ตั้งแต่ ${start_time}–${end_time}</b></li>
          ${accountHtml}
          <li>ชำระก่อน: <b>${formatDateTimeThai(created.payment_due_at || created.expires_at)}</b></li>
          <li>รหัสการจอง: <b>${created.reservation_code}</b></li>
        </ul>`;
      sendReservationEmail(email, {
        name: first_name || created.customer.first_name || "",
        code: created.reservation_code,
        summaryHtml,
      }).then(() => {
        console.log(`[BANQ:${rid}] email sent -> ${email}`);
      }).catch(e => {
        console.warn(`[BANQ:${rid}] email failed -> ${email}`, e?.message);
      });
    }

    res.status(201).json({
      status: "ok",
      message: "Banquet reservation created (pending)",
      data: created,
    });
  } catch (err) {
    console.error(`[BANQ:${rid}] CREATE ERROR`, err);
    if (err.type === "OVERLAP") {
      return res.status(409).json({ message: "Banquet room is not available in selected time range" });
    }
    if (err.code === "P2002" && err.meta?.target?.includes("reservation_code")) {
      return res.status(409).json({ message: "Reservation code collision, please retry" });
    }
    res.status(500).json({ status: "error", message: err.message });
  }
};

/* ===== STATUS BY CODE ===== */
exports.getReservationBanquetStatusByCode = async (req, res) => {
  const rid = req._rid || Math.random().toString(36).slice(2, 8);
  try {
    const code = String(req.query.code || '').trim();
    console.log(`[BNQ:${rid}] STATUS called code="${code}" url=${req.originalUrl}`);

    if (!code) {
      console.log(`[BNQ:${rid}] -> 400 code missing`);
      return res.status(400).json({ message: 'reservation_code is required' });
    }

    // ✅ ใช้ findUnique แทน และไม่ใช้ mode
    console.log(`[BNQ:${rid}] prisma.reservation_banquet.findUnique`);
    let reservation = await prisma.reservation_banquet.findUnique({
      where: { reservation_code: code },
      include: {
        banquet_room: { select: { banquet_id: true, name: true } },
        customer:     { select: { customer_id: true, first_name: true, last_name: true } },
        payment_banquet: { orderBy: { payment_id: 'desc' }, take: 1 }
      }
    });

    if (!reservation) {
      console.log(`[BNQ:${rid}] not found via findUnique, fallback findFirst in:[code,UPPER,LOWER]`);
      const upper = code.toUpperCase();
      const lower = code.toLowerCase();
      reservation = await prisma.reservation_banquet.findFirst({
        where: { reservation_code: { in: [code, upper, lower] } },
        include: {
          banquet_room: { select: { banquet_id: true, name: true } },
          customer:     { select: { customer_id: true, first_name: true, last_name: true } },
          payment_banquet: { orderBy: { payment_id: 'desc' }, take: 1 }
        }
      });
    }

    if (!reservation) {
      console.log(`[BNQ:${rid}] NOT FOUND code="${code}"`);
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const lastPayment = reservation.payment_banquet?.[0] || null;

    const payload = {
      code: reservation.reservation_code,
      status: reservation.status,
      expires_at: reservation.expires_at,
      payment_due_at: reservation.payment_due_at,
      pay_account_snapshot: reservation.pay_account_snapshot || null,
      event_date: reservation.event_date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      last_payment_status: lastPayment ? lastPayment.payment_status : 'unpaid',
      amount: lastPayment ? lastPayment.amount : null,
      paid_at: lastPayment ? lastPayment.paid_at : null,
      banquet: reservation.banquet_room,
      customer: {
        id: reservation.customer.customer_id,
        first_name: reservation.customer.first_name,
        last_name: reservation.customer.last_name
      }
    };

    console.log(`[BNQ:${rid}] FOUND code=${payload.code} status=${payload.status} last_payment=${payload.last_payment_status}`);
    res.json(payload);
  } catch (err) {
    console.error(`[BNQ:${rid}] STATUS ERROR`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/* ===== Admin list/get/update/delete (คงเดิม เพิ่ม log บางจุด) ===== */
exports.getReservationBanquets = async (req, res) => {
  const rid = req._rid || Math.random().toString(36).slice(2, 8);
  try {
    console.log(`[BANQ:${rid}] ADMIN LIST query=`, req.query);
    const { status, date_from, date_to, banquet_id } = req.query;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (banquet_id) where.banquet_id = Number(banquet_id);

    const from = date_from ? parseDateInput(date_from) : null;
    const to = date_to ? parseDateInput(date_to) : null;
    if (from || to) {
      where.event_date = {};
      if (from) where.event_date.gte = toUtcMidnight(from);
      if (to) where.event_date.lte = toUtcMidnight(to);
    }

    const [items, total] = await Promise.all([
      prisma.reservation_banquet.findMany({
        where,
        orderBy: { reservation_id: "desc" },
        skip,
        take: limit,
        select: {
          reservation_id: true,
          reservation_code: true,
          status: true,
          event_date: true,
          start_time: true,
          end_time: true,
          expires_at: true,
          payment_due_at: true,
          banquet_room: { select: { banquet_id: true, name: true } },
          customer: {
            select: { customer_id: true, first_name: true, last_name: true },
          },
        },
      }),
      prisma.reservation_banquet.count({ where }),
    ]);

    console.log(`[BANQ:${rid}] ADMIN LIST -> total=${total} items=${items.length}`);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    console.error(`[BANQ:${rid}] ADMIN LIST ERROR`, err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getReservationBanquet = async (req, res) => {
  const rid = req._rid || Math.random().toString(36).slice(2, 8);
  try {
    const id = Number(req.params.id);
    console.log(`[BANQ:${rid}] ADMIN GET id=${id}`);
    const r = await prisma.reservation_banquet.findUnique({
      where: { reservation_id: id },
      include: {
        banquet_room: true,
        customer: true,
        payment_banquet: {
          orderBy: { payment_id: "desc" },
          take: 1,
          select: { payment_status: true, paid_at: true, amount: true },
        },
      },
    });
    if (!r) {
      console.log(`[BANQ:${rid}] ADMIN GET -> 404`);
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json({
      reservation_id: r.reservation_id,
      reservation_code: r.reservation_code,
      status: r.status,
      event_date: r.event_date,
      start_time: r.start_time,
      end_time: r.end_time,
      expires_at: r.expires_at,
      payment_due_at: r.payment_due_at,
      pay_account_snapshot: r.pay_account_snapshot || null,
      last_payment_status: r.payment_banquet?.[0]?.payment_status || "none",
      paid_at: r.payment_banquet?.[0]?.paid_at || null,
      amount: r.payment_banquet?.[0]?.amount || null,
      banquet: { banquet_id: r.banquet_id, name: r.banquet_room.name },
      customer: {
        id: r.customer_id,
        first_name: r.customer.first_name,
        last_name: r.customer.last_name,
      },
    });
  } catch (err) {
    console.error(`[BANQ:${rid}] ADMIN GET ERROR`, err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.updateReservationBanquet = async (req, res) => {
  const rid = req._rid || Math.random().toString(36).slice(2, 8);
  try {
    const id = Number(req.params.id);
    const { status, event_date, start_time, end_time, phone, email, contact_name } = req.body;
    console.log(`[BANQ:${rid}] ADMIN UPDATE id=${id} body=`, req.body);

    if (status && !ALLOWED_STATUSES.includes(status)) {
      console.log(`[BANQ:${rid}] -> 400 invalid status`);
      return res.status(400).json({ message: "invalid status" });
    }

    const current = await prisma.reservation_banquet.findUnique({
      where: { reservation_id: id },
    });
    if (!current) {
      console.log(`[BANQ:${rid}] -> 404 not found`);
      return res.status(404).json({ message: "Reservation not found" });
    }

    const data = {};
    if (status) data.status = status;
    if (contact_name !== undefined) data.contact_name = (contact_name || "").trim() || null;
    if (phone !== undefined) data.contact_phone = normalizePhoneTH(phone) || null;
    if (email !== undefined) data.contact_email = email || null;

    let dayUTC = current.event_date;
    if (event_date) {
      const parsed = parseDateInput(event_date);
      if (!parsed) {
        console.log(`[BANQ:${rid}] -> 400 invalid event_date`);
        return res.status(400).json({ message: "Invalid event_date" });
      }
      dayUTC = toUtcMidnight(parsed);
      data.event_date = dayUTC;
    }

    let s = current.start_time;
    let e = current.end_time;

    if (start_time !== undefined) {
      if (!start_time) return res.status(400).json({ message: "Invalid start_time" });
      s = combineDateAndTimeUTC(dayUTC, start_time);
      data.start_time = s;
    }
    if (end_time !== undefined) {
      if (!end_time) return res.status(400).json({ message: "Invalid end_time" });
      e = combineDateAndTimeUTC(dayUTC, end_time);
      data.end_time = e;
    }
    if (!(s < e)) {
      console.log(`[BANQ:${rid}] -> 400 start >= end`);
      return res.status(400).json({ message: "start_time must be before end_time" });
    }

    if (data.event_date || data.start_time || data.end_time) {
      const day = data.event_date || current.event_date;
      const newS = data.start_time || s;
      const newE = data.end_time || e;

      const now = new Date();
      const overlaps = await prisma.reservation_banquet.findMany({
        where: {
          reservation_id: { not: id },
          banquet_id: current.banquet_id,
          event_date: { equals: day },
          OR: [
            { status: "confirmed" },
            { AND: [{ status: "pending" }, { expires_at: { gt: now } }] },
          ],
        },
        select: { start_time: true, end_time: true },
      });

      const sMin = timeToMinutes(newS);
      const eMin = timeToMinutes(newE);
      const hasOverlap = overlaps.some((o) => {
        const oStartMin = timeToMinutes(o.start_time);
        const oEndMin = timeToMinutes(o.end_time);
        return isOverlapMinutes(sMin, eMin, oStartMin, oEndMin);
      });

      if (hasOverlap) {
        console.log(`[BANQ:${rid}] -> 409 overlap`);
        return res.status(409).json({ message: "Banquet room is not available in selected time range" });
      }
    }

    const updated = await prisma.reservation_banquet.update({
      where: { reservation_id: id },
      data,
      select: {
        reservation_id: true, reservation_code: true, status: true,
        event_date: true, start_time: true, end_time: true,
        expires_at: true, payment_due_at: true,
      },
    });

    console.log(`[BANQ:${rid}] ADMIN UPDATE -> ok code=${updated.reservation_code} status=${updated.status}`);

    res.json({ status: "ok", message: "Reservation updated", data: updated });
  } catch (err) {
    console.error(`[BANQ:${rid}] ADMIN UPDATE ERROR`, err);
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Reservation not found" });
    }
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.deleteReservationBanquet = async (req, res) => {
  const rid = req._rid || Math.random().toString(36).slice(2, 8);
  try {
    const id = Number(req.params.id);
    console.log(`[BANQ:${rid}] ADMIN DELETE id=${id}`);
    await prisma.reservation_banquet.delete({ where: { reservation_id: id } });
    res.json({ status: "ok", message: `Reservation ${id} deleted` });
  } catch (err) {
    console.error(`[BANQ:${rid}] ADMIN DELETE ERROR`, err);
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Reservation not found" });
    }
    res.status(500).json({ status: "error", message: err.message });
  }
};
