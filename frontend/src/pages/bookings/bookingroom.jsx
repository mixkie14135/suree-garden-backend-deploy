import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { roomApi, fileUrl } from "../../lib/api";

export default function BookingRoomSelect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [checkin, setCheckin]   = useState(state?.checkin || "");
  const [checkout, setCheckout] = useState(state?.checkout || "");
  const [guests, setGuests]     = useState(state?.guests || 1);
  const [available, setAvailable] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    roomApi
      .detail(id, "images,type")               // ✅ ดึง type ด้วย (มี description + amenities)
      .then(r => alive && setRoom(r))
      .catch(e => alive && setErr(e.message || "โหลดข้อมูลห้องไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  const capacity = room?.capacity || 1;

  useEffect(() => {
    if (guests < 1) setGuests(1);
    if (guests > capacity) setGuests(capacity);
  }, [guests, capacity]);

  const nights = useMemo(() => {
    if (!checkin || !checkout) return 0;
    const ci = new Date(checkin), co = new Date(checkout);
    const d = (co - ci) / 86400000;
    return d > 0 ? d : 0;
  }, [checkin, checkout]);

  useEffect(() => {
    let alive = true;
    if (!checkin || !checkout || nights <= 0) { setAvailable(null); return; }
    roomApi
      .availability(id, checkin, checkout)
      .then(res => alive && setAvailable(!!res?.available))
      .catch(() => alive && setAvailable(null));
    return () => { alive = false; };
  }, [id, checkin, checkout, nights]);

  const goConfirm = () => {
    if (!checkin || !checkout || nights <= 0) return alert("กรุณาเลือกวันเช็คอิน/เช็คเอาท์ให้ถูกต้อง");
    if (guests < 1 || guests > capacity) return alert(`จำนวนผู้เข้าพักต้องอยู่ระหว่าง 1–${capacity}`);
    if (available === false) return alert("ช่วงวันที่เลือกไม่ว่าง");
    const q = new URLSearchParams({ checkin, checkout, guests: String(guests) });
    navigate(`/bookings/bookingroom/${id}/confirm?${q.toString()}`);
  };

  const hero = useMemo(() => {
    const url = room?.room_image?.[0]?.image_url;
    return url ? fileUrl(url) : null;
  }, [room]);

  // ===== amenities จาก room_type.amenities (เป็น JSON) =====
  const amenities = useMemo(() => {
    const arr = Array.isArray(room?.room_type?.amenities) ? room.room_type.amenities : [];
    // โชว์เฉพาะ group === "amenity" หรือถ้าไม่ได้แบ่ง group ก็โชว์ทั้งหมด
    const filtered = arr.filter(a => !a.group || a.group === "amenity");
    return filtered.map(a => a.text || a.key).filter(Boolean);
  }, [room?.room_type?.amenities]);

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "28px 0 60px" }}>
        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : !room ? (
          <div className="emptyBox">{err || "ไม่พบข้อมูลห้อง"}</div>
        ) : (
          <>
            {/* ชื่อห้อง + ประเภท EN */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h1 className="bkH1">{room.room_number}</h1>
              <div className="bkSubTitle">{room.room_type?.type_name_en || ""}</div>
            </div>

            {/* Hero: ปรับสัดส่วนให้เตี้ยลง + cover */}
            <div className="brHero">
              {hero ? (
                <img src={hero} alt="" />
              ) : (
                <div className="brHeroPh" />
              )}
            </div>

            
<div className="bkBar">
  <BarCell label="ประเภทห้อง">
    <div className="bkType">
      {room?.room_type?.type_name || "-"}
      {room?.capacity ? <small> (สูงสุด {room.capacity} คน)</small> : null}
    </div>
  </BarCell>

  <BarCell label="เช็คอิน">
    <input type="date" className="bkInput" value={checkin} onChange={e=>setCheckin(e.target.value)} />
  </BarCell>

  <BarCell label="เช็คเอาท์">
    <input type="date" className="bkInput" value={checkout} onChange={e=>setCheckout(e.target.value)} />
  </BarCell>

 <BarCell label={
  <div className="bkLabelWithCapacity">
    จำนวนผู้เข้าพัก
    <small className="bkCapacityHelp">
      สูงสุด {capacity} คน
    </small>
  </div>
  }>
  <div className="bkGuests">
    <input
      type="number"
      min={1}
      max={capacity}
      className="bkInput"
      value={guests}
      onChange={e=>setGuests(Number(e.target.value))}
    />
  </div>
</BarCell>

   {/* บล็อกสีเขียวทั้งช่อง */}
  <button type="button" className="bkBarGo" onClick={goConfirm} aria-label="ถัดไป / จองเลย">
    ถัดไป / จองเลย
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </button>
</div>
{/* จบแถบเลือกวัน/แขก + ปุ่มไปขั้นถัดไป

            {/* สถานะความว่าง */}
            {checkin && checkout && (
              <div style={{ marginTop: 8, color: available ? "#2e7d32" : "crimson" }}>
                {available == null
                  ? "กำลังตรวจสอบ..."
                  : available
                  ? "ช่วงวันที่เลือก: ว่าง"
                  : "ช่วงวันที่เลือก: ไม่ว่าง"}
              </div>
            )}

            {/* ===== Description (จาก room_type.description ถ้าไม่มีใช้ room.description) ===== */}
            <section className="bkSection">
                <h3 className="bkSecTitle">
                    ห้อง{room.room_type?.type_name || "—"} {/* <--- โค้ดใหม่ */}
                </h3>
                <p className="bkDesc">
                    {room.room_type?.description || room.description || "—"}
                </p>
            </section>

            {/* ===== Amenities ===== */}
            {!!amenities.length && (
              <section className="bkSection">
                <h3 className="bkSecTitle">สิ่งอำนวยความสะดวก</h3>
                <ul className="bkAmenGrid">
                  {amenities.map((t, i) => (
                    <li key={i} className="bkAmenItem">{t}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

function BarCell({ label, children }) {
  const isString = typeof label === "string" || typeof label === "number";
  return (
    <div className="bkCell">
      {label && (isString ? <div className="bkLabel">{label}</div> : label)}
      {children}
    </div>
  );
}
