// src/pages/bookings/BookingPayment.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Stepper from "../../components/Stepper";
import { reservationApi, paymentApi, roomApi } from "../../lib/api";

/* helper: แปลงค่าเป็น number แบบกันพลาด (Prisma Decimal/string) */
function asNumber(x) {
  if (x == null) return NaN;
  if (typeof x === "number") return x;
  const s = String(x).replace(/[, ]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export default function BookingPayment() {
  const nav = useNavigate();
  const { state } = useLocation();
  const [sp] = useSearchParams();

  const initCode = state?.reservation_code || sp.get("code") || "";
  const [code, setCode] = useState(initCode);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const [file, setFile] = useState(null);

  // โหลดสถานะการจอง
  useEffect(() => {
    let alive = true;
    if (!code) return;
    setLoading(true);
    setErr("");
    reservationApi.getStatusByCode(code)
      .then((res) => {
        if (!alive) return;
        // normalize: บางแบ็กเอนด์ตอบ {status:'ok', data:{...}}
        const payload = (res && typeof res === "object" && "data" in res && res.data) ? res.data : res;
        setData(payload);
        // console.debug("[STATUS RAW]", res);
        // console.debug("[STATUS PAYLOAD]", payload);
      })
      .catch((e) => alive && setErr(e.message || "โหลดข้อมูลสถานะไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [code]);

  // คืนที่พัก
  const nights = useMemo(() => {
    const ciRaw = data?.checkin_date;
    const coRaw = data?.checkout_date;
    if (!ciRaw || !coRaw) return 0;
    const ci = new Date(String(ciRaw));
    const co = new Date(String(coRaw));
    if (isNaN(ci) || isNaN(co)) return 0;
    const d = (co - ci) / 86400000;
    return d > 0 ? d : 0;
  }, [data]);

  // ดึงราคา/คืนจากห้อง ถ้า API สถานะไม่ให้มา
  const [roomPrice, setRoomPrice] = useState(NaN);
  useEffect(() => {
    let alive = true;
    // ถ้ามี total จาก state หรือมี amount จาก API แล้ว ไม่ต้องโหลดราคา
    if (asNumber(state?.total) > 0) return;
    if (asNumber(data?.total ?? data?.total_price ?? data?.amount ?? data?.payment_amount) > 0) return;

    const rid = data?.room?.room_id || data?.room_id;
    if (!rid) return;

    roomApi.detail(rid, "type")
      .then((room) => {
        if (!alive) return;
        const p =
          asNumber(room?.price) ||
          asNumber(room?.room?.price) || // เผื่อโครงสร้างหุ้มอีกชั้น
          asNumber(room?.data?.price);
        setRoomPrice(p);
      })
      .catch(() => { if (alive) setRoomPrice(NaN); });

    return () => { alive = false; };
  }, [data, state?.total]);

  // คำนวณยอดอัตโนมัติ: state.total -> data.amount -> roomPrice * nights
  const autoAmount = useMemo(() => {
    const s = asNumber(state?.total);
    if (s > 0) return s;

    const fromApi = asNumber(
      (data?.total ?? data?.total_price ?? data?.amount ?? data?.payment_amount)
    );
    if (fromApi > 0) return fromApi;

    const p = asNumber(
      data?.price_per_night ||
      data?.room_price ||
      roomPrice
    );
    if (p > 0 && nights > 0) return p * nights;

    return NaN;
  }, [state?.total, data, roomPrice, nights]);

  const deadline = useMemo(() => {
    const d = data?.payment_due_at || data?.expires_at;
    return d ? new Date(d) : null;
  }, [data]);

  // นับถอยหลัง
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const countdown = useMemo(() => {
    if (!deadline) return "";
    const ms = deadline.getTime() - now;
    if (ms <= 0) return "หมดเวลาชำระ";
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [deadline, now]);

  // อัปโหลดสลิป
  async function handleUpload(e) {
    e.preventDefault();
    if (!code) { setErr("กรุณากรอกรหัสการจอง"); return; }
    if (!file) { setErr("กรุณาแนบสลิป"); return; }
    if (!Number.isFinite(autoAmount) || autoAmount <= 0) {
      setErr("ไม่พบยอดชำระที่ถูกต้อง");
      return;
    }
    setErr("");
    try {
      await paymentApi.uploadRoomSlip({
        reservation_code: code,
        amount: autoAmount,
        file
      });
      alert("อัปโหลดสลิปเรียบร้อย! กรุณารอแอดมินตรวจสอบ");
      nav(`/bookings/success?code=${encodeURIComponent(code)}`, { replace: true });
    } catch (e2) {
      setErr(e2.message || "อัปโหลดไม่สำเร็จ");
    }
  }

  const acc = data?.pay_account_snapshot || null; // { bank_name, account_name, account_number, promptpay_id }

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding:"28px 0 60px" }}>
        <Stepper step={2} />

        {!initCode && (
          <form onSubmit={(e)=>{ e.preventDefault(); setCode(code.trim()); }} style={{ display:"flex", gap:8, margin:"12px 0 20px" }}>
            <input className="bkInput" placeholder="กรอกรหัสการจอง" value={code} onChange={e=>setCode(e.target.value)} />
            <button className="btnPrimary" type="submit">ตรวจสอบ</button>
          </form>
        )}

        {loading ? <div className="loading">กำลังโหลด...</div> : err ? (
          <div className="emptyBox" style={{ color:"crimson" }}>{err}</div>
        ) : data ? (
          <div className="bpGrid">
            {/* ซ้าย: สรุป */}
            <aside className="bpCard">
              <h3 className="bpCardTitle">รายละเอียดการจอง</h3>
              <dl className="bpList">
                <div><dt>รหัสการจอง</dt><dd>{data.code}</dd></div>
                <div><dt>ห้อง</dt><dd>{data.room?.room_number || "-"}</dd></div>
                <div><dt>ช่วงวัน</dt><dd>{fmtDate(data.checkin_date)} – {fmtDate(data.checkout_date)} ({nights} คืน)</dd></div>
                <div><dt>สถานะ</dt><dd>{thaiStatus(data.status)}</dd></div>
                {data.last_payment_status && (
                  <div><dt>ชำระล่าสุด</dt><dd>{thaiPayStatus(data.last_payment_status)}</dd></div>
                )}
                {Number.isFinite(autoAmount) && autoAmount > 0 && (
                  <div style={{borderBottom:0}}>
                    <dt>ยอดที่ต้องชำระ</dt>
                    <dd style={{ color:"#b30000" }}>{Math.round(autoAmount).toLocaleString()} บาท</dd>
                  </div>
                )}
              </dl>

              {deadline && (
                <div className="bpDeadline">
                  <div>ชำระก่อน:</div>
                  <div className="bpDeadlineTime">{deadline.toLocaleString()}</div>
                  <div className={`bpCountdown ${countdown === "หมดเวลาชำระ" ? "bpCountdown--over" : ""}`}>{countdown}</div>
                </div>
              )}
            </aside>

            {/* ขวา: ช่องทาง & อัปโหลด */}
            <section className="bpCard">
              <h3 className="bpCardTitle">ช่องทางการชำระ</h3>
              {acc ? (
                <div className="bpAccount">
                  <div className="bpAccRow"><span>ธนาคาร</span><strong>{acc.bank_name}</strong></div>
                  <div className="bpAccRow"><span>เลขบัญชี</span><strong>{acc.account_number}</strong></div>
                  <div className="bpAccRow"><span>ชื่อบัญชี</span><strong>{acc.account_name}</strong></div>
                  {acc.promptpay_id && <div className="bpAccRow"><span>พร้อมเพย์</span><strong>{acc.promptpay_id}</strong></div>}
                </div>
              ) : (
                <div className="emptyBox">ยังไม่มีบัญชีชำระเงิน</div>
              )}

              <form className="bpPayForm" onSubmit={handleUpload}>
                <label className="bpField">
                  <div>ยอดที่ต้องชำระ (บาท)</div>
                  {Number.isFinite(autoAmount) && autoAmount > 0 ? (
                    <>
                      <input className="bkInput" value={Math.round(autoAmount).toLocaleString()} readOnly />
                      <input type="hidden" name="amount" value={Math.round(autoAmount)} />
                    </>
                  ) : (
                    <div className="emptyBox" style={{color:"#b30000"}}>
                      ไม่พบยอดชำระ โปรดรีเฟรชหน้าหรือกลับไปเริ่มจองใหม่
                    </div>
                  )}
                </label>

                <label className="bpField">
                  <div>แนบสลิป *</div>
                  <input
                    className="bkInput"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e)=>setFile(e.target.files?.[0] || null)}
                  />
                </label>

                <div style={{ display:"flex", gap:10 }}>
                  <button
                    type="button"
                    className="btnGhost"
                    onClick={() => {
                      if (state?.back_url) { nav(state.back_url, { replace:true }); return; }
                      const back = state?.back_to || (data ? {
                        id: data?.room?.id || data?.room_id || data?.room?.room_id,
                        checkin: data?.checkin_date,
                        checkout: data?.checkout_date,
                        guests: data?.guests || data?.num_guests || 1,
                      } : null);
                      if (back?.id && back?.checkin && back?.checkout) {
                        const qs = new URLSearchParams({
                          checkin: back.checkin, checkout: back.checkout,
                          guests: String(back.guests || 1),
                        }).toString();
                        nav(`/bookings/bookingroom/${back.id}/confirm?${qs}`, { replace:true });
                      } else { nav(-1); }
                    }}
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    className="btnPrimary"
                    disabled={!file || !Number.isFinite(autoAmount) || autoAmount <= 0}
                  >
                    อัปโหลดหลักฐานการโอน
                  </button>
                </div>
                <div className="bpNote">เมื่อส่งหลักฐานแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบและยืนยัน</div>
              </form>
            </section>
          </div>
        ) : (
          <div className="emptyBox">ใส่รหัสการจองเพื่อดึงข้อมูล</div>
        )}
      </main>
    </>
  );
}

function fmtDate(d){
  if(!d) return "-";
  const x = new Date(d);
  if(isNaN(x)) return "-";
  return x.toLocaleDateString();
}
function thaiStatus(s){
  switch (s) {
    case "pending": return "รอชำระ/แนบสลิป";
    case "confirmed": return "ยืนยันแล้ว";
    case "checked_in": return "เข้าพักแล้ว";
    case "checked_out": return "เช็คเอาท์แล้ว";
    case "cancelled": return "ยกเลิก";
    case "expired": return "หมดเวลา";
    default: return s || "-";
  }
}
function thaiPayStatus(s){
  switch (s) {
    case "unpaid":    return "ยังไม่ชำระ";
    case "pending":   return "รอตรวจสอบ";
    case "confirmed": return "อนุมัติแล้ว";
    case "rejected":  return "ตีกลับ";
    default:          return s || "-";
  }
}
