// frontend/src/pages/bookings/BookingPaymentBanquet.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Stepper from "../../components/Stepper";
import { reservationBanquetApi, paymentBanquetApi, banquetApi } from "../../lib/api";

/* -------- helpers -------- */
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
  if (!t) return "-";
  // รองรับทั้ง "HH:mm" หรือ ISO
  const m = String(t).match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : t;
}
/** คำนวณชั่วโมงจาก event_date + start_time + end_time (ปัดเป็นจำนวนชั่วโมง) */
function diffHours(_event_date, start_time, end_time) {
  if (!start_time || !end_time) return 0;
  const m1 = String(start_time).match(/(\d{2}):(\d{2})/);
  const m2 = String(end_time).match(/(\d{2}):(\d{2})/);
  if (!m1 || !m2) return 0;
  const sh = parseInt(m1[1], 10), sm = parseInt(m1[2], 10);
  const eh = parseInt(m2[1], 10), em = parseInt(m2[2], 10);
  const minutes = (eh * 60 + em) - (sh * 60 + sm);
  const h = minutes / 60;
  // เราบังคับให้เลือกเป็นชั่วโมงถ้วนอยู่แล้ว ค่านี้ควรเป็นจำนวนเต็ม
  return h > 0 ? h : 0;
}

export default function BookingPaymentBanquet() {
  const nav = useNavigate();
  const { state } = useLocation();
  const [sp, setSp] = useSearchParams();

  const initCode = state?.reservation_code || sp.get("code") || "";
  const [code, setCode] = useState(initCode);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  // fetch status
  useEffect(() => {
    let alive = true;
    if (!code) return;
    setLoading(true);
    setErr("");
    reservationBanquetApi
      .getStatusByCode(code)
      .then((res) => {
        if (!alive) return;
        // controller คืน payload ตรง ๆ
        setData(res && res.data ? res.data : res);
      })
      .catch((e) => alive && setErr(e?.message || "โหลดข้อมูลสถานะไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [code]);

  // ราคา/ชม. จากห้องจัดเลี้ยง (กรณี API สถานะไม่คืนยอดรวม)
  const [pricePerHour, setPricePerHour] = useState(NaN);
  useEffect(() => {
    let alive = true;
    // ถ้ามียอดจาก state หรือจาก status แล้ว ไม่ต้องดึงราคา
    if (asNumber(state?.total) > 0) return;
    if (asNumber(data?.total ?? data?.amount ?? data?.payment_amount) > 0) return;

    const bid = data?.banquet?.banquet_id || data?.banquet_id;
    if (!bid) return;

    banquetApi
      .detail(bid, "images")
      .then((b) => {
        if (!alive) return;
        const p = asNumber(b?.price_per_hour ?? b?.price);
        setPricePerHour(p);
      })
      .catch(() => alive && setPricePerHour(NaN));

    return () => { alive = false; };
  }, [data, state?.total]);

  // ชั่วโมงที่ใช้งาน
  const hours = useMemo(() => {
    return diffHours(data?.event_date, data?.start_time, data?.end_time);
  }, [data]);

  // คำนวณยอด
  const autoAmount = useMemo(() => {
    const s = asNumber(state?.total);
    if (s > 0) return s;

    const fromApi = asNumber(
      data?.total ?? data?.amount ?? data?.payment_amount
    );
    if (fromApi > 0) return fromApi;

    const p = asNumber(pricePerHour);
    if (p > 0 && hours > 0) return p * hours;

    return NaN;
  }, [state?.total, data, pricePerHour, hours]);

  // deadline & countdown (ซ่อนเมื่อ pay = pending)
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
  const payStatus = (["unpaid","pending","confirmed","rejected"].includes(rawPay) ? rawPay : "unpaid");

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

  const isExpired = useMemo(() => {
    if (!deadline) return false;
    return deadline.getTime() - now <= 0;
  }, [deadline, now]);

  // อัปโหลดไฟล์ (รูป, ≤5MB)
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState("");
  function onPickFile(f) {
    if (!f) { setFile(null); setFileInfo(""); return; }
    const maxMB = 5;
    if (f.size > maxMB * 1024 * 1024) {
      setErr(`ไฟล์ใหญ่เกินไป (จำกัด ${maxMB}MB)`);
      setFile(null); setFileInfo(""); return;
    }
    const okTypes = ["image/jpeg","image/png","image/webp","image/jpg","image/heic"];
    if (!okTypes.includes(f.type)) {
      setErr("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, HEIC)");
      setFile(null); setFileInfo(""); return;
    }
    setErr("");
    setFile(f);
    setFileInfo(`${f.name} • ${(f.size/(1024*1024)).toFixed(2)} MB`);
  }

  // อัปโหลดสลิป
  async function handleUpload(e) {
    e.preventDefault();
    if (!code) { setErr("กรุณากรอกรหัสการจอง"); return; }
    if (!file) { setErr("กรุณาแนบสลิป"); return; }
    if (!Number.isFinite(autoAmount) || autoAmount <= 0) {
      setErr("ไม่พบยอดชำระที่ถูกต้อง"); return;
    }
    if (isExpired) {
      setErr("เกินกำหนดชำระแล้ว ไม่สามารถอัปโหลดได้");
      return;
    }
    setErr("");
    setUploading(true);
    try {
      await paymentBanquetApi.uploadSlip({
        reservation_code: code,
        amount: Math.round(autoAmount),
        file
      });
      alert("อัปโหลดสลิปเรียบร้อย! กรุณารอแอดมินตรวจสอบ");
      nav(`/bookings/success-banquet?code=${encodeURIComponent(code)}`, {
        replace: true,
      });
    } catch (e2) {
      setErr(e2?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  const acc = data?.pay_account_snapshot || null;

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "28px 0 60px" }}>
        <Stepper step={2} />

        {!initCode && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = code.trim();
              if (!v) return;
              const next = new URLSearchParams(sp);
              next.set("code", v);
              setSp(next, { replace: true });
              setCode(v);
            }}
            style={{ display: "flex", gap: 8, margin: "12px 0 20px" }}
          >
            <input
              className="bkInput"
              placeholder="กรอกรหัสการจองจัดเลี้ยง"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btnPrimary" type="submit" disabled={!code.trim()}>
              ตรวจสอบ
            </button>
          </form>
        )}

        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : err ? (
          <div className="emptyBox" style={{ color: "crimson" }}>{err}</div>
        ) : data ? (
          <div className="bpGrid">
            {/* ซ้าย: สรุป */}
            <aside className="bpCard">
              <h3 className="bpCardTitle">รายละเอียดการจองจัดเลี้ยง</h3>
              <dl className="bpList">
                <div><dt>รหัสการจอง</dt><dd>{data.code}</dd></div>
                <div><dt>ห้อง</dt><dd>{data?.banquet?.name || "-"}</dd></div>
                <div>
                  <dt>วัน–เวลา</dt>
                  <dd>
                    {fmtDate(data?.event_date)} ({fmtTime(data?.start_time)}–{fmtTime(data?.end_time)}) • {hours} ชม.
                  </dd>
                </div>
                <div><dt>สถานะ</dt><dd>{mapResStatus(data?.status)}</dd></div>
                {["unpaid","pending","confirmed","rejected"].includes(String(data?.last_payment_status)) && (
                  <div><dt>ชำระล่าสุด</dt><dd>{mapPayStatus(data?.last_payment_status)}</dd></div>
                )}
                {Number.isFinite(autoAmount) && autoAmount > 0 && (
                  <div style={{ borderBottom: 0 }}>
                    <dt>ยอดที่ต้องชำระ</dt>
                    <dd style={{ color: "#b30000" }}>
                      {Math.round(autoAmount).toLocaleString("th-TH")} บาท
                    </dd>
                  </div>
                )}
              </dl>

              {deadline && data?.last_payment_status !== "pending" && (
                <div className="bpDeadline">
                  <div>ชำระก่อน:</div>
                  <div className="bpDeadlineTime">{deadline.toLocaleString("th-TH")}</div>
                  <div
                    className={`bpCountdown ${
                      (deadline.getTime() - now <= 0) ? "bpCountdown--over" : ""
                    }`}
                  >
                    {countdown}
                  </div>
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
                  {acc.promptpay_id && (
                    <div className="bpAccRow"><span>พร้อมเพย์</span><strong>{acc.promptpay_id}</strong></div>
                  )}
                </div>
              ) : (
                <div className="emptyBox">ยังไม่มีบัญชีชำระเงิน</div>
              )}

              {data?.last_payment_status === "pending" && (
                <div className="emptyBox" style={{ background:"#fff8e6", borderColor:"#ffe1a6", color:"#a36100" }}>
                  เราได้รับหลักฐานการชำระแล้ว กำลังตรวจสอบ กรุณารอการยืนยัน
                </div>
              )}
              {data?.last_payment_status === "confirmed" && (
                <div className="emptyBox" style={{ background:"#ecfff1", borderColor:"#a7f3c4", color:"#0f7a3b" }}>
                  การชำระเงินได้รับการยืนยันแล้ว ขอบคุณค่ะ
                </div>
              )}
              {(data?.last_payment_status === "unpaid" || data?.last_payment_status === "rejected") && (
                <form className="bpPayForm" onSubmit={handleUpload}>
                  <label className="bpField">
                    <div>ยอดที่ต้องชำระ (บาท)</div>
                    {Number.isFinite(autoAmount) && autoAmount > 0 ? (
                      <>
                        <input className="bkInput" value={Math.round(autoAmount).toLocaleString("th-TH")} readOnly />
                        <input type="hidden" name="amount" value={Math.round(autoAmount)} />
                      </>
                    ) : (
                      <div className="emptyBox" style={{ color:"#b30000" }}>
                        ไม่พบยอดชำระ โปรดรีเฟรชหน้าหรือกลับไปเริ่มจองใหม่
                      </div>
                    )}
                  </label>

                  <label className="bpField">
                    <div>แนบสลิป *</div>
                    <input className="bkInput" type="file" accept="image/*" onChange={(e)=>onPickFile(e.target.files?.[0] || null)} />
                    {fileInfo && <div className="bpHelp" style={{ fontSize:12, opacity:0.9 }}>{fileInfo}</div>}
                  </label>

                  <div style={{ display:"flex", gap:10 }}>
                    <button
                      type="button"
                      className="btnGhost"
                      onClick={() => {
                        if (state?.back_url) {
                          nav(state.back_url, { replace: true });
                          return;
                        }
                        nav(-1);
                      }}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="btnPrimary"
                      disabled={ uploading || isExpired || !file || !Number.isFinite(autoAmount) || autoAmount <= 0 }
                      title={isExpired ? "เลยกำหนดชำระแล้ว" : uploading ? "กำลังอัปโหลด..." : undefined}
                    >
                      {uploading ? "กำลังอัปโหลด..." : "อัปโหลดหลักฐานการโอน"}
                    </button>
                  </div>
                  <div className="bpNote">เมื่อส่งหลักฐานแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบและยืนยัน</div>
                </form>
              )}
            </section>
          </div>
        ) : (
          <div className="emptyBox">ใส่รหัสการจองเพื่อดึงข้อมูล</div>
        )}
      </main>
    </>
  );
}

function mapResStatus(s) {
  switch (s) {
    case "pending": return "รอชำระ/แนบสลิป";
    case "confirmed": return "ยืนยันแล้ว";
    case "cancelled": return "ยกเลิก";
    case "expired": return "หมดเวลา";
    default: return s || "-";
  }
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
