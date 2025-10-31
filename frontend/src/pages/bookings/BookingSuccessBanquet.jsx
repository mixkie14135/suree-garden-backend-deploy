import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Stepper from "../../components/Stepper";
import { reservationBanquetApi } from "../../lib/api";

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
function thaiStatus(s){
  switch (s) {
    case "pending": return "รอชำระ/รอตรวจสอบ";
    case "confirmed": return "ยืนยันแล้ว";
    case "cancelled": return "ยกเลิก";
    case "expired": return "หมดเวลา";
    default: return s || "-";
  }
}

export default function BookingSuccessBanquet() {
  const nav = useNavigate();
  const { state } = useLocation();
  const [sp] = useSearchParams();

  const initCode = state?.reservation_code || sp.get("code") || "";
  const [code] = useState(initCode);

  const [loading, setLoading] = useState(!!code);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!code) return;
    setLoading(true);
    setErr("");
    reservationBanquetApi
      .getStatusByCode(code)
      .then((res) => {
        if (!alive) return;
        setData(res && res.data ? res.data : res);
      })
      .catch((e) => alive && setErr(e?.message || "โหลดข้อมูลการจองไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [code]);

  const hours = useMemo(() => {
    return diffHours(data?.event_date, data?.start_time, data?.end_time);
  }, [data]);

  const goHome = () => nav("/", { replace: true });
  const viewStatus = () => {
    if (code) {
      // 🔄 เปลี่ยนให้ไปหน้าเดียว
      nav(`/bookings/status?code=${encodeURIComponent(code)}`, {
        state: { from: "success", reservation_code: code },
      });
    }
  };

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding:"28px 0 60px" }}>
        <Stepper step={3} />

        <div className="bpCard" style={{ marginBottom: 16, textAlign:"center" }}>
          <h2 style={{ margin:"0 0 8px" }}>ส่งหลักฐานการชำระเงินเรียบร้อย</h2>
          <p style={{ margin:0, color:"#555" }}>
            เราได้รับสลิปของคุณแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบ
            {code ? <> (รหัสการจอง <strong>{code}</strong>)</> : null}
          </p>
        </div>

        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : err ? (
          <div className="emptyBox" style={{ color:"crimson" }}>{err}</div>
        ) : data ? (
          <div className="bpCard">
            <h3 className="bpCardTitle">สรุปการจองจัดเลี้ยง</h3>
            <dl className="bpList">
              <div><dt>รหัสการจอง</dt><dd>{data.code}</dd></div>
              <div><dt>ห้อง</dt><dd>{data?.banquet?.name || "-"}</dd></div>
              <div><dt>วัน–เวลา</dt><dd>{fmtDate(data?.event_date)} ({fmtTime(data?.start_time)}–{fmtTime(data?.end_time)}) • {hours} ชม.</dd></div>
              <div><dt>สถานะ</dt><dd>{thaiStatus(data?.status)}</dd></div>
            </dl>
          </div>
        ) : (
          <div className="emptyBox">กรุณาบันทึกรหัสการจองไว้เพื่อตรวจสอบสถานะภายหลัง</div>
        )}

        <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"center" }}>
          <button className="btnGhost" onClick={goHome}>กลับหน้าหลัก</button>
          {code ? (
            <button className="btnPrimary" onClick={viewStatus}>
              ดูสถานะการจอง
            </button>
          ) : null}
        </div>
      </main>
    </>
  );
}
