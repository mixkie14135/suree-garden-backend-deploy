import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Stepper from "../../components/Stepper";
import { reservationBanquetApi, paymentBanquetApi, banquetApi, reservationResolverApi } from "../../lib/api";

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
function bookingStatusDisplay(resStatus, payStatus) {
  if (payStatus === "pending") return "อยู่ระหว่างตรวจสอบหลักฐาน (ยังไม่ยืนยัน)";
  switch (resStatus) {
    case "pending": return "รอการชำระ/แนบสลิป";
    case "confirmed": return "ยืนยันแล้ว";
    case "cancelled": return "ยกเลิก";
    case "expired": return "หมดเวลา";
    default: return resStatus || "-";
  }
}

export default function BookingStatusBanquet() {
  const nav = useNavigate();
  const { state } = useLocation();
  const [sp, setSp] = useSearchParams();

  const initCode = sp.get("code") || state?.reservation_code || "";
  const [code, setCode] = useState(initCode);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const runTokenRef = useRef(0);

  async function fetchStatus(vcode) {
    if (!vcode) return;
    setLoading(true);
    setErr("");
    try {
      const res = await reservationBanquetApi.getStatusByCode(vcode);
      setData(res && res.data ? res.data : res);
    } catch (e) {
      setErr(e?.message || "โหลดสถานะไม่สำเร็จ");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // เข้าหน้านี้ด้วย ?code=... ให้เช็คผ่าน resolver ก่อนเสมอ
  useEffect(() => {
    let alive = true;
    (async () => {
      const v = initCode?.trim();
      if (!v) return;
      try {
        const r = await reservationResolverApi.resolve(v, { cache: "no-store" });
        if (!alive) return;
        if (r?.type === "banquet") {
          fetchStatus(v);
        } else if (r?.type === "room") {
          nav(`/bookings/status?code=${encodeURIComponent(v)}`, { replace: true });
        } else {
          setErr("ไม่พบรหัสการจองนี้");
          setData(null);
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "ไม่พบรหัสการจองนี้");
        setData(null);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initCode]);

  const hours = useMemo(() => diffHours(data?.event_date, data?.start_time, data?.end_time), [data]);

  const [pricePerHour, setPricePerHour] = useState(NaN);
  useEffect(() => {
    let alive = true;
    const need = !(asNumber(data?.total ?? data?.amount ?? data?.payment_amount) > 0);
    const bid = data?.banquet?.banquet_id || data?.banquet_id;
    if (!data || !need || !bid) return;

    banquetApi.detail(bid, "images")
      .then(b => {
        if (!alive) return;
        setPricePerHour(asNumber(b?.price_per_hour ?? b?.price));
      })
      .catch(() => alive && setPricePerHour(NaN));

    return () => { alive = false; };
  }, [data]);

  const autoAmount = useMemo(() => {
    const fromApi = asNumber(data?.total ?? data?.amount ?? data?.payment_amount);
    if (fromApi > 0) return fromApi;
    const p = asNumber(pricePerHour);
    if (p > 0 && hours > 0) return p * hours;
    return NaN;
  }, [data, pricePerHour, hours]);

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

  const showStepper = state?.from === "success";
  const showCountdown = data && payStatus !== "pending";
  const countdown = useMemo(() => {
    if (!deadline || !showCountdown) return "";
    const ms = deadline.getTime() - now;
    if (ms <= 0) return "หมดเวลาชำระ";
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [deadline, now, showCountdown]);

  const isExpired = useMemo(() => {
    if (!deadline) return false;
    return deadline.getTime() - now <= 0;
  }, [deadline, now]);

  // validate file
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState("");
  const [uploading, setUploading] = useState(false);
  function onPickFile(f) {
    if (!f) { setFile(null); setFileInfo(""); return; }
    const maxMB = 5;
    if (f.size > maxMB * 1024 * 1024) {
      setErr(`ไฟล์ใหญ่เกินไป (จำกัด ${maxMB}MB)`); 
      setFile(null); setFileInfo(""); 
      return;
    }
    const ok = ["image/jpeg","image/png","image/webp","image/jpg","image/heic"];
    if (!ok.includes(f.type)) {
      setErr("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, HEIC)");
      setFile(null); setFileInfo("");
      return;
    }
    setErr("");
    setFile(f);
    setFileInfo(`${f.name} • ${(f.size/(1024*1024)).toFixed(2)} MB`);
  }

  async function uploadSlip(e) {
    e.preventDefault();
    if (!code) { setErr("กรุณากรอกรหัสการจอง"); return; }
    if (!file) { setErr("กรุณาแนบสลิป"); return; }
    if (!Number.isFinite(autoAmount) || autoAmount <= 0) {
      setErr("ไม่พบยอดชำระที่ถูกต้อง"); return;
    }
    if (isExpired) { setErr("เกินกำหนดชำระแล้ว ไม่สามารถอัปโหลดได้"); return; }

    setErr("");
    setUploading(true);
    try {
      await paymentBanquetApi.uploadSlip({
        reservation_code: code,
        amount: Math.round(autoAmount),
        file
      });
      alert("อัปโหลดสลิปเรียบร้อย! กำลังตรวจสอบ");
      await fetchStatus(code);
      setFile(null); setFileInfo("");
    } catch (e2) {
      setErr(e2?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  // 🔁 on-page search: ใช้ resolver เสมอ เพื่อสลับหน้าให้ถูก
  async function resolveAndRoute(e) {
    e.preventDefault();
    const v = code.trim();
    if (!v) return;

    const myToken = ++runTokenRef.current;
    const stillMine = () => myToken === runTokenRef.current;

    try {
      const r = await reservationResolverApi.resolve(v, { cache: "no-store" });
      if (!stillMine()) return;

      const next = new URLSearchParams(sp);
      next.set("code", v);

      if (r?.type === "banquet") {
        setSp(next, { replace: true });
        fetchStatus(v);
      } else if (r?.type === "room") {
        nav(`/bookings/status?code=${encodeURIComponent(v)}`);
      } else {
        setErr("ไม่พบรหัสการจองนี้");
        setData(null);
      }
    } catch (e) {
      if (!stillMine()) return;
      setErr(e?.message || "ไม่พบรหัสการจองนี้");
      setData(null);
    }
  }

  const acc = data?.pay_account_snapshot || null;

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "28px 0 60px" }}>
        {showStepper && <Stepper step={3} />}

        {/* Search by code (ใช้ resolver) */}
        <form
          onSubmit={resolveAndRoute}
          style={{ display: "flex", gap: 8, margin: "12px 0 20px" }}
          aria-label="ค้นหาจากรหัสการจองจัดเลี้ยง"
        >
          <input
            className="bkInput"
            placeholder="กรอกรหัสการจอง (เช่น BNQ1ABCD)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="btnPrimary" type="submit" disabled={!code.trim()}>
            ตรวจสถานะ
          </button>
          {data && (
            <button type="button" className="btnGhost" onClick={() => fetchStatus(code)} title="รีเฟรช">
              รีเฟรช
            </button>
          )}
        </form>

        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : err ? (
          <div className="emptyBox" style={{ color: "crimson" }}>{err}</div>
        ) : data ? (
          <div className="bpGrid">
            {/* ซ้าย: สรุป/สถานะ */}
            <aside className="bpCard">
              <h3 className="bpCardTitle">สถานะการจองจัดเลี้ยง</h3>

              {payStatus === "pending" && (
                <div className="emptyBox" style={{ background:"#fff8e6", borderColor:"#ffe1a6", color:"#a36100", marginBottom:12 }}>
                  เราได้รับหลักฐานการชำระแล้ว กำลังตรวจสอบ กรุณารอการยืนยัน
                </div>
              )}
              {payStatus === "rejected" && (
                <div className="emptyBox" style={{ background:"#fff3f3", borderColor:"#ffc9c9", color:"#a30000", marginBottom:12 }}>
                  หลักฐานการชำระถูกตีกลับ โปรดอัปโหลดใหม่หรือติดต่อเจ้าหน้าที่
                </div>
              )}
              {payStatus === "confirmed" && (
                <div className="emptyBox" style={{ background:"#ecfff1", borderColor:"#a7f3c4", color:"#0f7a3b", marginBottom:12 }}>
                  การชำระเงินได้รับการยืนยันแล้ว ขอบคุณค่ะ
                </div>
              )}

              <dl className="bpList">
                <div><dt>รหัสการจอง</dt><dd>{data.code}</dd></div>
                <div><dt>ห้อง</dt><dd>{data?.banquet?.name || "-"}</dd></div>
                <div><dt>วัน–เวลา</dt><dd>{fmtDate(data?.event_date)} ({fmtTime(data?.start_time)}–{fmtTime(data?.end_time)}) • {hours} ชม.</dd></div>
                <div><dt>สถานะการจอง</dt><dd>{bookingStatusDisplay(data?.status, payStatus)}</dd></div>
                <div><dt>สถานะการชำระ</dt><dd>{mapPayStatus(payStatus)}</dd></div>
                {Number.isFinite(autoAmount) && autoAmount > 0 && (
                  <div style={{borderBottom:0}}>
                    <dt>ยอดที่ต้องชำระ</dt>
                    <dd style={{ color:"#b30000" }}>{Math.round(autoAmount).toLocaleString("th-TH")} บาท</dd>
                  </div>
                )}
              </dl>

              {!!deadline && showCountdown && (
                <div className="bpDeadline">
                  <div>ชำระก่อน:</div>
                  <div className="bpDeadlineTime">{deadline.toLocaleString("th-TH")}</div>
                  <div className={`bpCountdown ${isExpired ? "bpCountdown--over" : ""}`}>
                    {isExpired ? "หมดเวลาชำระ" : countdown}
                  </div>
                </div>
              )}
            </aside>

            {/* ขวา: ช่องทาง & อัปโหลด */}
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
                    {Number.isFinite(autoAmount) && autoAmount > 0 ? (
                      <>
                        <input className="bkInput" readOnly value={Math.round(autoAmount).toLocaleString("th-TH")} />
                        <input type="hidden" name="amount" value={Math.round(autoAmount)} />
                      </>
                    ) : (
                      <div className="emptyBox" style={{ color:"#b30000" }}>
                        ไม่พบยอดชำระ โปรดลองรีเฟรชหรือทำรายการใหม่
                      </div>
                    )}
                  </label>

                  <label className="bpField">
                    <div>แนบสลิป *</div>
                    <input
                      className="bkInput"
                      type="file"
                      accept="image/*"
                      onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                    />
                    {fileInfo && <div className="bpHelp" style={{ fontSize:12, opacity:0.9 }}>{fileInfo}</div>}
                  </label>

                  <div style={{ display:"flex", gap:10 }}>
                    <button
                      type="submit"
                      className="btnPrimary"
                      disabled={ uploading || !file || !Number.isFinite(autoAmount) || autoAmount <= 0 || isExpired }
                      title={isExpired ? "เลยกำหนดชำระแล้ว" : uploading ? "กำลังอัปโหลด..." : undefined}
                    >
                      {uploading ? "กำลังอัปโหลด..." : "อัปโหลดหลักฐานการโอน"}
                    </button>
                    <button type="button" className="btnGhost" onClick={() => fetchStatus(code)} title="รีเฟรช">
                      รีเฟรช
                    </button>
                  </div>

                  <div className="bpNote">เมื่อส่งหลักฐานแล้ว ระบบจะตรวจสอบและแจ้งผล</div>
                </form>
              ) : payStatus === "pending" ? (
                <div className="emptyBox">กำลังตรวจสอบหลักฐาน โปรดรอการยืนยัน</div>
              ) : (
                <div className="emptyBox" style={{ background:"#ecfff1", borderColor:"#a7f3c4", color:"#0f7a3b" }}>
                  ชำระเงินเรียบร้อยแล้ว
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="emptyBox">กรอกรหัสการจองแล้วกด “ตรวจสถานะ” เพื่อดูรายละเอียด</div>
        )}

        <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"center" }}>
          <button className="btnGhost" onClick={() => nav("/", { replace:true })}>กลับหน้าหลัก</button>
        </div>
      </main>
    </>
  );
}
