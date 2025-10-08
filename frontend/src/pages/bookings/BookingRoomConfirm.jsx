// src/pages/bookings/BookingRoomConfirm.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Stepper from "../../components/Stepper";
import { roomApi, bookingApi, fileUrl } from "../../lib/api";

export default function BookingRoomConfirm() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const checkin  = sp.get("checkin")  || "";
  const checkout = sp.get("checkout") || "";
  const guests   = Math.max(1, Number(sp.get("guests") || 1));

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!checkin || !checkout) {
      navigate(`/bookings/bookingroom/${id}`, { replace: true });
      return;
    }
    setLoading(true);
    roomApi.detail(id, "images,type")
      .then(r => alive && setRoom(r))
      .catch(e => alive && setErr(e.message || "โหลดข้อมูลห้องไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, checkin, checkout, navigate]);

  const nights = useMemo(() => {
    const ci = new Date(checkin), co = new Date(checkout);
    const d = (co - ci) / 86400000;
    return d > 0 ? d : 0;
  }, [checkin, checkout]);

  const pricePerNight = Number(room?.price || 0);
  const total = useMemo(() => nights * pricePerNight, [nights, pricePerNight]);

  const hero = useMemo(() => {
    const url = room?.room_image?.[0]?.image_url;
    return url ? fileUrl(url) : null;
  }, [room]);

  const capacity = room?.capacity || 1;
  const overCap = guests > capacity;

  async function handleSubmit(e) {
    e.preventDefault();
    if (overCap) { alert(`จำนวนผู้เข้าพักเกินความจุ (สูงสุด ${capacity})`); return; }

    const fd = new FormData(e.currentTarget);
    const first_name = (fd.get("first_name") || "").trim();
    const last_name  = (fd.get("last_name") || "").trim();
    const email = (fd.get("email") || "").trim();
    const phone = (fd.get("phone") || "").trim();

    if (!first_name || !last_name || !email || !phone) {
      setErr("กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ");
      return;
    }
    setErr("");
    setSubmitting(true);
    try {
      const result = await bookingApi.createRoomReservation({
        room_id: Number(id),
        checkin_date: checkin,
        checkout_date: checkout,
        first_name, last_name, email, phone
      });

      const rc = result?.data?.reservation_code || result?.reservation_code;
      const total = result?.data?.total || result?.total;

      navigate(`/bookings/payment?code=${encodeURIComponent(rc)}`, {
        replace: true,
        state: { reservation_code: rc, total }
      });
    } catch (e2) {
      setErr(e2.message || "จองไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "28px 0 60px" }}>
        {/* ✅ ใช้ Stepper แบบเดียวกับหน้า Payment */}
        <Stepper step={1} />

        {loading ? <div className="loading">กำลังโหลด...</div> : !room ? (
          <div className="emptyBox">{err || "ไม่พบข้อมูลห้อง"}</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:28 }}>
            {/* สรุปทางซ้าย */}
            <aside style={{ border:"1px solid var(--line)", borderRadius:8, padding:16 }}>
              <h3 style={{ margin:"0 0 12px" }}>ห้องเลขที่ {room.room_number}</h3>
              <div style={{ borderRadius:8, overflow:"hidden", marginBottom:12 }}>
                {hero ? <img src={hero} alt="" style={{ width:"100%", display:"block" }} /> : <div style={{ aspectRatio:"4/3", background:"#f3f3f3" }}/>}
              </div>

              <SummaryRow label="ประเภทห้อง">{room?.room_type?.type_name || "-"}</SummaryRow>
              <SummaryRow label="วันที่">{checkin} – {checkout} ({nights} คืน)</SummaryRow>
              <SummaryRow label="จำนวนผู้เข้าพัก">{guests} คน (สูงสุด {capacity})</SummaryRow>

              <SummaryRow label="ประเภทเตียง">เตียงใหญ่</SummaryRow>
              <SummaryRow label="จำนวนเตียง">1 เตียง</SummaryRow>

              <SummaryRow label="ราคา/คืน">{pricePerNight.toLocaleString()} บาท</SummaryRow>
              <div style={{ marginTop:12, fontWeight:800, textAlign:"right" }}>รวมทั้งสิ้น ≈ {total.toLocaleString()} บาท</div>
              {overCap && <div style={{ color:"crimson", marginTop:6 }}>เกินความจุสูงสุด {capacity} คน</div>}
            </aside>

            {/* ฟอร์มทางขวา */}
            <section>
              <h3 style={{ marginTop:0 }}>กรอกข้อมูลผู้จอง</h3>
              {err && <div style={{ color:"crimson", marginBottom:8 }}>{err}</div>}

              <form onSubmit={handleSubmit} style={{ display:"grid", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <label>ชื่อจริง *<input name="first_name" className="bkInput" required /></label>
                  <label>นามสกุล *<input name="last_name" className="bkInput" required /></label>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <label>อีเมล *<input type="email" name="email" className="bkInput" required /></label>
                  <label>หมายเลขโทรศัพท์ *<input type="tel" name="phone" className="bkInput" required /></label>
                </div>
                <label>เพิ่มเติม (ไม่บังคับ)
                  <textarea className="bkInput" rows={4} placeholder="เช่น ขอเตียงเสริม"/>
                </label>

                <div style={{ display:"flex", gap:12, marginTop:6 }}>
                  <button
                    type="button"
                    className="btnGhost"
                    onClick={()=>navigate(`/bookings/bookingroom/${id}`, { state:{ checkin, checkout, guests } })}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="btnPrimary" disabled={submitting || overCap}>
                    {submitting ? "กำลังส่ง..." : "ยืนยัน"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function SummaryRow({ label, children }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"8px 0", borderBottom:"1px solid var(--line)" }}>
      <div style={{ color:"#666" }}>{label}</div>
      <div style={{ fontWeight:700, textAlign:"right" }}>{children}</div>
    </div>
  );
}
