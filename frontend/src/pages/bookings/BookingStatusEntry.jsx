// src/pages/bookings/BookingStatusEntry.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { reservationResolverApi } from "../../lib/api";

export default function BookingStatusEntry() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [code, setCode] = useState(sp.get("code") || "");

  // token ป้องกันผลรอบเก่ามาเขียนทับ
  const runTokenRef = useRef(0);

  async function resolveAndGo(raw) {
    const c = String(raw || "").trim();
    if (!c) return;

    const myToken = ++runTokenRef.current;
    const stillMine = () => myToken === runTokenRef.current;

    try {
      const r = await reservationResolverApi.resolve(c, { cache: "no-store" });
      if (!stillMine()) return;

      if (r?.type === "room") {
        nav(`/bookings/status?code=${encodeURIComponent(c)}`, { replace: true });
      } else if (r?.type === "banquet") {
        nav(`/bookings/status-banquet?code=${encodeURIComponent(c)}`, { replace: true });
      } else {
        alert("ไม่พบรหัสการจองนี้ กรุณาตรวจสอบอีกครั้ง");
      }
    } catch (e) {
      if (!stillMine()) return;
      alert(e?.message || "ไม่พบรหัสการจองนี้ กรุณาตรวจสอบอีกครั้ง");
    }
  }

  useEffect(() => {
    if (code) resolveAndGo(code);
    return () => { runTokenRef.current++; }; // ทำให้ผลรอบเก่ากลายเป็นโมฆะ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go() {
    resolveAndGo(code);
  }

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "28px 0 60px" }}>
        <h2 style={{ marginTop: 0 }}>ตรวจสถานะการจอง</h2>
        <div style={{ display: "flex", gap: 8, maxWidth: 520 }}>
          <input
            className="bkInput"
            placeholder="กรอกรหัสการจอง (เช่น FW6JFJ6A หรือ NP9WK482)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
          <button className="btnPrimary" onClick={go} disabled={!code.trim()}>
            ตรวจสอบ
          </button>
        </div>
        <div style={{ marginTop: 10, color: "#666" }}>
          * ระบบจะตรวจอัตโนมัติว่ารหัสเป็นของ “ห้องพัก” หรือ “ห้องจัดเลี้ยง” ผ่านเส้นเดียว
        </div>
      </main>
    </>
  );
}
