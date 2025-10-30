// frontend/src/pages/bookings/BookingBanquet.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { banquetApi, fileUrl } from "../../lib/api";

function buildHourOptions(start = 0, end = 24) {
  const arr = [];
  for (let h = start; h < end; h++) {
    const label = String(h).padStart(2, "0") + ":00";
    arr.push(label);
  }
  return arr;
}

export default function BookingBanquetSelect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [banquet, setBanquet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [eventDate, setEventDate] = useState(state?.event_date || "");
  const [startTime, setStartTime] = useState(state?.start_time || "");
  const [endTime, setEndTime] = useState(state?.end_time || "");
  const [guests, setGuests] = useState(state?.guests || 1);
  const [available, setAvailable] = useState(null);

  // โหลดรายละเอียดห้องจัดเลี้ยง
  useEffect(() => {
    let alive = true;
    setLoading(true);
    banquetApi
      .detail(id, "images")
      .then((r) => alive && setBanquet(r))
      .catch((e) => alive && setErr(e.message || "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const capacity = banquet?.capacity || 1;
  useEffect(() => {
    if (guests < 1) setGuests(1);
    if (guests > capacity) setGuests(capacity);
  }, [guests, capacity]);

  // ตรวจสอบความว่าง (เรียก backend)
  useEffect(() => {
    let alive = true;
    if (!eventDate || !startTime || !endTime) {
      setAvailable(null);
      return;
    }
    banquetApi
      .available({ date: eventDate, start: startTime, end: endTime })
      .then((res) => alive && setAvailable(res?.available !== false))
      .catch(() => alive && setAvailable(null));
    return () => {
      alive = false;
    };
  }, [eventDate, startTime, endTime]);

  // hour options (ล็อกเป็นรายชั่วโมง)
  const startHourOptions = useMemo(() => buildHourOptions(0, 23), []);
  const endHourOptions = useMemo(() => {
    if (!startTime) return buildHourOptions(1, 24);
    const stHour = Number(startTime.split(":")[0] || 0);
    return buildHourOptions(stHour + 1, 24); // ต้องอย่างน้อย +1 ชั่วโมง
  }, [startTime]);

  // หากผู้ใช้เปลี่ยน startTime แล้ว endTime ไม่พอ ให้ auto ปรับตาม
  useEffect(() => {
    if (!startTime) return;
    if (!endTime) return;
    const st = Number(startTime.split(":")[0] || 0);
    const et = Number(endTime.split(":")[0] || 0);
    if (et <= st) {
      const next = String(st + 1).padStart(2, "0") + ":00";
      setEndTime(next);
    }
  }, [startTime, endTime]);

  const goConfirm = () => {
    if (!eventDate || !startTime || !endTime)
      return alert("กรุณาเลือกวันและเวลาให้ครบถ้วน");
    if (guests < 1 || guests > capacity)
      return alert(`จำนวนผู้เข้าร่วมต้องอยู่ระหว่าง 1–${capacity} คน`);
    if (available === false) return alert("ช่วงเวลานี้ไม่ว่างแล้ว");

    const q = new URLSearchParams({
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      guests: String(guests),
    });
    navigate(`/bookings/bookingbanquet/${id}/confirm?${q.toString()}`);
  };

  const hero = useMemo(() => {
    const raw =
      banquet?.banquet_image?.[0]?.image_url ||
      banquet?.images?.[0]?.image_url ||
      banquet?.images?.[0]?.path ||
      banquet?.image_url ||
      null;
    return raw ? fileUrl(raw) : null;
  }, [banquet]);

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "28px 0 60px" }}>
        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : !banquet ? (
          <div className="emptyBox">{err || "ไม่พบข้อมูลห้องจัดเลี้ยง"}</div>
        ) : (
          <>
            {/* ชื่อห้อง */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h1 className="bkH1">{banquet.name}</h1>
              <div className="bkSubTitle">ห้องจัดเลี้ยง</div>
            </div>

            {/* Hero — ใช้ background cover ให้ภาพแนวตั้ง/แนวนอนแสดงสวย */}
            {hero ? (
              <div
                className="brHero"
                style={{
                  position: "relative",
                  borderRadius: 12,
                  overflow: "hidden",
                  height: 260,
                  backgroundImage: `url(${hero})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center center",
                  backgroundRepeat: "no-repeat",
                  marginBottom: 16,
                }}
                aria-label="ภาพห้องจัดเลี้ยง"
              />
            ) : (
              <div className="brHeroPh" />
            )}

            {/* แถบเลือกข้อมูล */}
            <div className="bkBar">
              <BarCell label="วันที่จัดงาน">
                <input
                  type="date"
                  className="bkInput"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </BarCell>

              <BarCell label="เวลาเริ่ม (ชั่วโมง)">
                <select
                  className="bkInput"
                  value={startTime || ""}
                  onChange={(e) => setStartTime(e.target.value)}
                >
                  <option value="" disabled>เลือกเวลาเริ่ม</option>
                  {startHourOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </BarCell>

              <BarCell label="เวลาสิ้นสุด (ชั่วโมง)">
                <select
                  className="bkInput"
                  value={endTime || ""}
                  onChange={(e) => setEndTime(e.target.value)}
                >
                  <option value="" disabled>เลือกเวลาสิ้นสุด</option>
                  {endHourOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </BarCell>

              <BarCell
                label={
                  <div className="bkLabelWithCapacity">
                    จำนวนผู้เข้าร่วม
                    <small className="bkCapacityHelp">สูงสุด {capacity} คน</small>
                  </div>
                }
              >
                <input
                  type="number"
                  min={1}
                  max={capacity}
                  className="bkInput"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                />
              </BarCell>

              <button
                type="button"
                className="bkBarGo"
                onClick={goConfirm}
                aria-label="ถัดไป / จองเลย"
              >
                ถัดไป / จองเลย
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* แสดงสถานะความว่าง */}
            {eventDate && startTime && endTime && (
              <div style={{ marginTop: 8, color: available ? "#2e7d32" : "crimson" }}>
                {available == null
                  ? "กำลังตรวจสอบ..."
                  : available
                  ? "ช่วงเวลานี้ว่าง"
                  : "ช่วงเวลานี้ไม่ว่าง"}
              </div>
            )}

            {/* รายละเอียดเพิ่มเติม */}
            <section className="bkSection">
              <h3 className="bkSecTitle">รายละเอียดห้องจัดเลี้ยง</h3>
              <p className="bkDesc">
                {banquet.description || "ยังไม่มีรายละเอียดเพิ่มเติม"}
              </p>
            </section>
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
