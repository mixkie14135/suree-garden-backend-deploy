// src/pages/bookings/BookingPayment.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Stepper from "../../components/Stepper";
import { reservationApi, paymentApi } from "../../lib/api"; // ✅ เอา fileUrl ออก

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
  const [amount, setAmount] = useState(state?.total || ""); // ถ้า Confirm ส่ง total มาก็ prefill

  // โหลดสถานะ
  useEffect(() => {
    let alive = true;
    if (!code) return;
    setLoading(true);
    setErr("");
    reservationApi.getStatusByCode(code)
      .then(res => {
        if (!alive) return;
        setData(res);
      })
      .catch(e => alive && setErr(e.message || "โหลดข้อมูลสถานะไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [code]);

  const nights = useMemo(() => {
    if (!data?.checkin_date || !data?.checkout_date) return 0;
    const ci = new Date(data.checkin_date);
    const co = new Date(data.checkout_date);
    const d = (co - ci) / 86400000;
    return d > 0 ? d : 0;
  }, [data]);

  const deadline = useMemo(() => {
    const d = data?.payment_due_at || data?.expires_at;
    return d ? new Date(d) : null;
  }, [data]);

  // นับถอยหลัง (display)
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
    setErr("");
    try {
      await paymentApi.uploadRoomSlip({ reservation_code: code, amount, file });
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
        {/* ✅ Stepper: step 2 กำลังทำงาน, step 1 เป็น completed มีเส้นไหลเชื่อม */}
        <Stepper step={2} />

        {/* ค้นหาด้วย code กรณีเข้าหน้านี้ตรง ๆ */}
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
            {/* ซ้าย: สรุปการจอง */}
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
                {amount && (
                  <div style={{borderBottom:0}}>
                    <dt>ยอดที่ต้องชำระ</dt>
                    <dd style={{ color:"#b30000" }}>{Number(amount).toLocaleString()} บาท</dd>
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

            {/* ขวา: วิธีชำระ & อัปโหลดสลิป */}
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
                  <div>ยอดที่โอน (บาท)</div>
                  <input className="bkInput" type="number" min="0" step="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="ใส่ยอดที่โอนจริง" />
                </label>
                <label className="bpField">
                  <div>แนบสลิป *</div>
                  <input className="bkInput" type="file" accept="image/*,application/pdf" onChange={e=>setFile(e.target.files?.[0] || null)} />
                </label>
                <div style={{ display:"flex", gap:10 }}>
                  <button type="button" className="btnGhost" onClick={()=>nav(-1)}>ยกเลิก</button>
                  <button type="submit" className="btnPrimary">อัปโหลดหลักฐานการโอน</button>
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
