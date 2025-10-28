// src/pages/bookings/BookingSuccess.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Stepper from "../../components/Stepper";
import { reservationApi } from "../../lib/api";

export default function BookingSuccess() {
  const nav = useNavigate();
  const { state } = useLocation();
  const [sp] = useSearchParams();

  // รับรหัสจาก state หรือ query ?code=
  const initCode = state?.reservation_code || sp.get("code") || "";
  const [code] = useState(initCode);

  const [loading, setLoading] = useState(!!code);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  // ดึงรายละเอียดการจองเพื่อสรุป (รองรับรีเฟรช)
  useEffect(() => {
    let alive = true;
    if (!code) return;
    setLoading(true);
    setErr("");
    reservationApi.getStatusByCode(code)
      .then((res) => alive && setData(res))
      .catch((e) => alive && setErr(e.message || "โหลดข้อมูลการจองไม่สำเร็จ"))
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

  // helper เล็ก ๆ
  function fmtDate(d) {
    if (!d) return "-";
    const x = new Date(d);
    if (isNaN(x)) return "-";
    return x.toLocaleDateString();
  }
  function thaiStatus(s){
    switch (s) {
      case "pending": return "รอชำระ/รอตรวจสอบ";
      case "confirmed": return "ยืนยันแล้ว";
      case "checked_in": return "เข้าพักแล้ว";
      case "checked_out": return "เช็คเอาท์แล้ว";
      case "cancelled": return "ยกเลิก";
      case "expired": return "หมดเวลา";
      default: return s || "-";
    }
  }

  // ปุ่มลัด
  const goHome = () => nav("/", { replace: true });
  const viewPayment = () => {
    if (code) nav(`/bookings/payment?code=${encodeURIComponent(code)}`);
  };

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding:"28px 0 60px" }}>
        {/* Stepper เข้าขั้นตอนที่ 3 */}
        <Stepper step={3} />

        {/* ส่วนหัวข้อความสำเร็จ */}
        <div className="bpCard" style={{ marginBottom: 16, textAlign:"center" }}>
          <h2 style={{ margin:"0 0 8px" }}>ส่งหลักฐานการชำระเงินเรียบร้อย</h2>
          <p style={{ margin:"0", color:"#555" }}>
            เราได้รับสลิปของคุณแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบ
            {code ? <> (รหัสการจอง <strong>{code}</strong>)</> : null}
          </p>
        </div>

        {/* แสดงสรุปการจอง ถ้ามีข้อมูล */}
        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : err ? (
          <div className="emptyBox" style={{ color:"crimson" }}>{err}</div>
        ) : data ? (
          <div className="bpCard">
            <h3 className="bpCardTitle">สรุปการจอง</h3>
            <dl className="bpList">
              <div><dt>รหัสการจอง</dt><dd>{data.code}</dd></div>
              <div><dt>ห้อง</dt><dd>{data.room?.room_number || "-"}</dd></div>
              <div><dt>ช่วงวัน</dt><dd>{fmtDate(data.checkin_date)} – {fmtDate(data.checkout_date)} ({nights} คืน)</dd></div>
              <div><dt>สถานะ</dt><dd>{thaiStatus(data.status)}</dd></div>
            </dl>
          </div>
        ) : (
          <div className="emptyBox">กรุณาบันทึกรหัสการจองไว้เพื่อตรวจสอบสถานะภายหลัง</div>
        )}

        {/* ปุ่มการนำทาง */}
        <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"center" }}>
          <button className="btnGhost" onClick={goHome}>กลับหน้าหลัก</button>
          {code ? (
            <button className="btnPrimary" onClick={viewPayment}>
              ดูสถานะ/อัปเดตการชำระเงิน
            </button>
          ) : null}
        </div>
      </main>
    </>
  );
}
