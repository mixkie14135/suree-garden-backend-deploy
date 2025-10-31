import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Stepper from "../../components/Stepper";
import {
  reservationApi,
  reservationBanquetApi,
  banquetApi,
  roomApi,
  paymentApi,
  reservationResolverApi,
} from "../../lib/api";

/* ------------------ helpers ------------------ */
function asNumber(x) {
  if (x == null) return NaN;
  if (typeof x === "number") return x;
  const s = String(x).replace(/[, ]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}
function fmtDate(d) {
  if (!d) return "-";
  const x = new Date(d);
  return isNaN(x) ? "-" : x.toLocaleDateString("th-TH");
}
function fmtTime(t) {
  const m = String(t || "").match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : (t || "-");
}
function diffHours(_event_date, start_time, end_time) {
  if (!start_time || !end_time) return 0;
  const m1 = String(start_time).match(/(\d{2}):(\d{2})/);
  const m2 = String(end_time).match(/(\d{2}):(\d{2})/);
  if (!m1 || !m2) return 0;
  const sh = parseInt(m1[1], 10), sm = parseInt(m1[2], 10);
  const eh = parseInt(m2[1], 10), em = parseInt(m2[2], 10);
  const minutes = (eh * 60 + em) - (sh * 60 + sm);
  const h = minutes / 60;
  return h > 0 ? h : 0;
}
function mapPayStatus(s) {
  switch (s) {
    case "unpaid": return "ยังไม่ชำระ";
    case "pending": return "รอตรวจสอบ";
    case "confirmed": return "อนุมัติแล้ว";
    case "rejected": return "ตีกลับ";
    default: return "ยังไม่ชำระ";
  }
}
function bookingStatusDisplay(resStatus, payStatus, isBanquet = false) {
  if (payStatus === "pending") return "อยู่ระหว่างตรวจสอบหลักฐาน (ยังไม่ยืนยัน)";
  switch (resStatus) {
    case "pending": return "รอการชำระ/แนบสลิป";
    case "confirmed": return "ยืนยันแล้ว";
    case "checked_in": return isBanquet ? "ใช้งานแล้ว" : "เข้าพักแล้ว";
    case "checked_out": return isBanquet ? "สิ้นสุดงานแล้ว" : "เช็คเอาท์แล้ว";
    case "cancelled": return "ยกเลิก";
    case "expired": return "หมดเวลา";
    default: return resStatus || "-";
  }
}

/* ------------------ MAIN ------------------ */
export default function BookingStatus() {
  const nav = useNavigate();
  const { state } = useLocation();
  const [sp] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [type, setType] = useState(null); // "room" | "banquet"
  const [code, setCode] = useState(sp.get("code") || state?.reservation_code || "");

  // โหลดข้อมูลเมื่อ URL query เปลี่ยน (จากช่อง search บน Navbar)
  useEffect(() => {
    const v = sp.get("code")?.trim();
    if (!v) {
      setData(null);
      setErr("");
      return;
    }
    resolveAndFetch(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  async function resolveAndFetch(vcode) {
    if (!vcode) return;
    setLoading(true);
    setErr("");
    try {
      const r = await reservationResolverApi.resolve(vcode, { cache: "no-store" });
      if (r?.type === "room") {
        const res = await reservationApi.getStatusByCode(vcode);
        setType("room");
        setData(res && res.data ? res.data : res);
      } else if (r?.type === "banquet") {
        const res = await reservationBanquetApi.getStatusByCode(vcode);
        setType("banquet");
        setData(res && res.data ? res.data : res);
      } else {
        setType(null);
        setData(null);
        setErr("ไม่พบรหัสการจองนี้");
      }
    } catch (e) {
      setType(null);
      setData(null);
      setErr(e?.message || "ไม่พบรหัสการจองนี้");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- คำนวณ ---------- */
  const isBanquet = type === "banquet";

  const nights = useMemo(() => {
    if (!data?.checkin_date || !data?.checkout_date) return 0;
    const ci = new Date(String(data.checkin_date));
    const co = new Date(String(data.checkout_date));
    if (isNaN(ci) || isNaN(co)) return 0;
    const d = (co - ci) / 86400000;
    return d > 0 ? d : 0;
  }, [data]);

  const hours = useMemo(() => diffHours(data?.event_date, data?.start_time, data?.end_time), [data]);

  const [roomPrice, setRoomPrice] = useState(NaN);
  const [pricePerHour, setPricePerHour] = useState(NaN);

  useEffect(() => {
    let alive = true;
    if (!data) return;
    const fromApi = asNumber(data?.total ?? data?.amount ?? data?.payment_amount);
    if (fromApi > 0) return;

    if (type === "room") {
      const rid = data?.room?.room_id || data?.room_id;
      if (!rid) return;
      roomApi.detail(rid, "type")
        .then(room => alive && setRoomPrice(asNumber(room?.price ?? room?.data?.price)))
        .catch(() => alive && setRoomPrice(NaN));
    } else if (type === "banquet") {
      const bid = data?.banquet?.banquet_id || data?.banquet_id;
      if (!bid) return;
      banquetApi.detail(bid, "images")
        .then(b => alive && setPricePerHour(asNumber(b?.price_per_hour ?? b?.price)))
        .catch(() => alive && setPricePerHour(NaN));
    }
    return () => { alive = false; };
  }, [data, type]);

  const autoAmount = useMemo(() => {
    const fromApi = asNumber(data?.total ?? data?.amount ?? data?.payment_amount);
    if (fromApi > 0) return fromApi;
    if (type === "room") {
      const p = asNumber(data?.price_per_night || roomPrice);
      return p > 0 && nights > 0 ? p * nights : NaN;
    } else if (type === "banquet") {
      const p = asNumber(pricePerHour);
      return p > 0 && hours > 0 ? p * hours : NaN;
    }
    return NaN;
  }, [data, type, nights, roomPrice, hours, pricePerHour]);

  const deadline = useMemo(() => {
    const d = data?.payment_due_at || data?.expires_at;
    return d ? new Date(d) : null;
  }, [data]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rawPay = data?.last_payment_status;
  const payStatus = (["unpaid", "pending", "confirmed", "rejected"].includes(rawPay) ? rawPay : "unpaid");
  const isExpired = deadline && deadline.getTime() - now <= 0;
  const countdown = useMemo(() => {
    if (!deadline || payStatus === "pending") return "";
    const ms = deadline.getTime() - now;
    if (ms <= 0) return "หมดเวลาชำระ";
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [deadline, now, payStatus]);

  /* ---------- Upload Slip ---------- */
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState("");
  const [uploading, setUploading] = useState(false);

  function onPickFile(f) {
    if (!f) { setFile(null); setFileInfo(""); return; }
    const ok = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/heic"];
    if (!ok.includes(f.type)) return alert("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, HEIC)");
    if (f.size > 5 * 1024 * 1024) return alert("ไฟล์ใหญ่เกินไป (จำกัด 5MB)");
    setFile(f);
    setFileInfo(`${f.name} • ${(f.size / (1024 * 1024)).toFixed(2)} MB`);
  }

  async function uploadSlip(e) {
    e.preventDefault();
    if (!file) return alert("กรุณาแนบสลิป");
    setUploading(true);
    try {
      await paymentApi.verifyAndApply({
        type: type === "banquet" ? "banquet" : "room",
        reservation_code: sp.get("code"),
        amount: Math.round(autoAmount),
        file,
      });
      alert("อัปโหลดสลิปเรียบร้อย! กำลังตรวจสอบ");
      await resolveAndFetch(sp.get("code"));
      setFile(null);
      setFileInfo("");
    } catch (e2) {
      alert(e2?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  const acc = data?.pay_account_snapshot || null;
  const showStepper = state?.from === "success";

  /* ---------- UI ---------- */
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "28px 0 60px" }}>
        {showStepper && <Stepper step={3} />}

        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : err ? (
          <div className="emptyBox" style={{ color: "crimson" }}>{err}</div>
        ) : data ? (
          <div className="bpGrid">
            {/* ซ้าย: สรุปสถานะ */}
            <aside className="bpCard">
              <h3 className="bpCardTitle">{isBanquet ? "สถานะการจองจัดเลี้ยง" : "สถานะการจองห้องพัก"}</h3>

              {payStatus === "pending" && (
                <div className="emptyBox" style={{ background:"#fff8e6", borderColor:"#ffe1a6", color:"#a36100" }}>
                  เราได้รับหลักฐานการชำระแล้ว กำลังตรวจสอบ กรุณารอการยืนยัน
                </div>
              )}
              {payStatus === "confirmed" && (
                <div className="emptyBox" style={{ background:"#ecfff1", borderColor:"#a7f3c4", color:"#0f7a3b" }}>
                  การชำระเงินได้รับการยืนยันแล้ว ขอบคุณค่ะ
                </div>
              )}
              {payStatus === "rejected" && (
                <div className="emptyBox" style={{ background:"#fff3f3", borderColor:"#ffc9c9", color:"#a30000" }}>
                  หลักฐานถูกตีกลับ โปรดอัปโหลดใหม่หรือติดต่อเจ้าหน้าที่
                </div>
              )}

              <dl className="bpList">
                <div><dt>รหัสการจอง</dt><dd>{data.code}</dd></div>
                {isBanquet ? (
                  <>
                    <div><dt>ห้อง</dt><dd>{data?.banquet?.name || "-"}</dd></div>
                    <div><dt>วัน–เวลา</dt><dd>{fmtDate(data?.event_date)} ({fmtTime(data?.start_time)}–{fmtTime(data?.end_time)}) • {hours} ชม.</dd></div>
                  </>
                ) : (
                  <>
                    <div><dt>ห้อง</dt><dd>{data?.room?.room_number || "-"}</dd></div>
                    <div><dt>ช่วงวัน</dt><dd>{fmtDate(data?.checkin_date)} – {fmtDate(data?.checkout_date)} ({nights} คืน)</dd></div>
                  </>
                )}
                <div><dt>สถานะการจอง</dt><dd>{bookingStatusDisplay(data?.status, payStatus, isBanquet)}</dd></div>
                <div><dt>สถานะการชำระ</dt><dd>{mapPayStatus(payStatus)}</dd></div>
                {Number.isFinite(autoAmount) && autoAmount > 0 && (
                  <div><dt>ยอดที่ต้องชำระ</dt><dd style={{ color:"#b30000" }}>{Math.round(autoAmount).toLocaleString("th-TH")} บาท</dd></div>
                )}
              </dl>

              {!!deadline && payStatus !== "pending" && (
                <div className="bpDeadline">
                  <div>ชำระก่อน:</div>
                  <div className="bpDeadlineTime">{deadline.toLocaleString("th-TH")}</div>
                  <div className={`bpCountdown ${isExpired ? "bpCountdown--over" : ""}`}>{countdown}</div>
                </div>
              )}
            </aside>

            {/* ขวา: ช่องทางการชำระ */}
            <section className="bpCard">
              <h3 className="bpCardTitle">การชำระเงิน</h3>
              {acc ? (
                <div className="bpAccount" style={{ marginBottom: 12 }}>
                  <div className="bpAccRow"><span>ธนาคาร</span><strong>{acc.bank_name}</strong></div>
                  <div className="bpAccRow"><span>เลขบัญชี</span><strong>{acc.account_number}</strong></div>
                  <div className="bpAccRow"><span>ชื่อบัญชี</span><strong>{acc.account_name}</strong></div>
                  {acc.promptpay_id && (
                    <div className="bpAccRow"><span>พร้อมเพย์</span><strong>{acc.promptpay_id}</strong></div>
                  )}
                </div>
              ) : (
                <div className="emptyBox">ยังไม่มีบัญชีชำระเงิน</div>
              )}

              {(payStatus === "unpaid" || payStatus === "rejected") ? (
                <form className="bpPayForm" onSubmit={uploadSlip}>
                  <label className="bpField">
                    <div>ยอดที่ต้องชำระ (บาท)</div>
                    <input className="bkInput" readOnly value={Number.isFinite(autoAmount) ? Math.round(autoAmount).toLocaleString("th-TH") : "-"} />
                  </label>

                  <label className="bpField">
                    <div>แนบสลิป *</div>
                    <input className="bkInput" type="file" accept="image/*" onChange={(e) => onPickFile(e.target.files?.[0] || null)} />
                    {fileInfo && <div className="bpHelp" style={{ fontSize:12 }}>{fileInfo}</div>}
                  </label>

                  <div style={{ display:"flex", gap:10 }}>
                    <button type="submit" className="btnPrimary" disabled={uploading || !file || isExpired}>
                      {uploading ? "กำลังอัปโหลด..." : "อัปโหลดหลักฐานการโอน"}
                    </button>
                    <button type="button" className="btnGhost" onClick={() => resolveAndFetch(sp.get("code"))}>รีเฟรช</button>
                  </div>
                </form>
              ) : payStatus === "pending" ? (
                <div className="emptyBox">กำลังตรวจสอบหลักฐาน โปรดรอการยืนยัน</div>
              ) : (
                <div className="emptyBox" style={{ background:"#ecfff1", borderColor:"#a7f3c4", color:"#0f7a3b" }}>
                  การชำระเงินได้รับการยืนยันแล้ว ขอบคุณค่ะ
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="emptyBox">ไม่พบข้อมูลการจอง</div>
        )}

        <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"center" }}>
          <button className="btnGhost" onClick={() => nav("/", { replace:true })}>กลับหน้าหลัก</button>
        </div>
      </main>
    </>
  );
}
