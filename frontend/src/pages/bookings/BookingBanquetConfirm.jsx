// frontend/src/pages/bookings/BookingBanquetConfirm.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Stepper from "../../components/Stepper";
import { banquetApi, bookingBanquetApi, fileUrl } from "../../lib/api";

export default function BookingBanquetConfirm() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // -------- params from query --------
  const event_date = sp.get("event_date") || "";
  const start_time = sp.get("start_time") || "";
  const end_time   = sp.get("end_time")   || "";
  const guests     = Math.max(1, Number(sp.get("guests") || 1));

  // -------- states --------
  const [banquet, setBanquet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // lock = ห้องไม่พร้อมให้จอง (status !== available)
  const [locked, setLocked] = useState(false);

  // ตรวจความว่างช่วงเวลาที่เลือก
  const [availLoading, setAvailLoading] = useState(false);
  const [available, setAvailable] = useState(null); // true/false/null

  // -------- guard: ถ้าพารามิเตอร์ไม่ครบ ให้เด้งกลับหน้าเลือก --------
  useEffect(() => {
    if (!event_date || !start_time || !end_time) {
      navigate(`/bookings/bookingbanquet/${id}`, { replace: true });
    }
  }, [id, event_date, start_time, end_time, navigate]);

  // -------- fetch ห้อง + guard: status !== available --------
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    banquetApi
      .detail(id, "images")
      .then((r) => {
        if (!alive) return;
        setBanquet(r);
        if (r?.status && r.status !== "available") {
          setLocked(true);
          alert("ห้องจัดเลี้ยงนี้ยังไม่พร้อมให้จองในขณะนี้");
          navigate("/banquet", { replace: true });
        }
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, navigate]);

  // -------- ตรวจสอบความว่างในช่วงเวลาที่เลือก --------
  useEffect(() => {
    let alive = true;
    if (!event_date || !start_time || !end_time) {
      setAvailable(null);
      return;
    }
    setAvailLoading(true);
    setAvailable(null);
    banquetApi
      .available({ date: event_date, start: start_time, end: end_time })
      .then((res) => {
        if (!alive) return;
        // ถ้า API ส่ง available === false แปลว่าไม่ว่าง
        setAvailable(res?.available !== false);
      })
      .catch(() => alive && setAvailable(null))
      .finally(() => alive && setAvailLoading(false));
    return () => { alive = false; };
  }, [event_date, start_time, end_time]);

  // -------- คำนวณราคา/ชั่วโมง & รวม --------
  const hours = useMemo(() => {
    if (!start_time || !end_time) return 0;
    const [h1] = start_time.split(":").map(Number);
    const [h2] = end_time.split(":").map(Number);
    return h2 > h1 ? (h2 - h1) : 0;
  }, [start_time, end_time]);

  const pricePerHour = Number(banquet?.price_per_hour ?? banquet?.price ?? 0);
  const total = useMemo(() => hours * pricePerHour, [hours, pricePerHour]);

  // -------- รูป hero --------
  const hero = useMemo(() => {
    const url =
      banquet?.banquet_image?.[0]?.image_url ||
      banquet?.images?.[0]?.image_url ||
      banquet?.images?.[0]?.path ||
      banquet?.image_url ||
      null;
    return url ? fileUrl(url) : null;
  }, [banquet]);

  // -------- ความจุ --------
  const capacity = banquet?.capacity || 1;
  const overCap = guests > capacity;

  // -------- submit --------
  async function handleSubmit(e) {
    e.preventDefault();
    if (locked) return; // ห้องไม่พร้อมให้จอง
    if (available === false) { setErr("ช่วงเวลานี้ไม่ว่างแล้ว"); return; }
    if (overCap) { alert(`จำนวนผู้เข้าร่วมเกินความจุ (สูงสุด ${capacity})`); return; }

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
      const result = await bookingBanquetApi.create({
        banquet_id: Number(id),
        event_date,
        start_time,
        end_time,
        first_name, last_name, email, phone,
        guests
      });

      const rc  = result?.data?.reservation_code || result?.reservation_code;
      const sum = result?.data?.total || result?.total || total;

      navigate(`/bookings/payment-banquet?code=${encodeURIComponent(rc)}`, {
        state: {
          reservation_code: rc,
          total: sum,
          // กลับมาหน้าปัจจุบันได้ในคลิกเดียว
          back_url: location.pathname + location.search,
          // เผื่อ back_url ไม่มี ให้สร้างลิงก์ย้อนกลับได้เอง
          back_to: { id: Number(id), event_date, start_time, end_time, guests }
        }
      });
    } catch (e2) {
      setErr(e2?.message || "จองไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "28px 0 60px" }}>
        {/* ทำให้หน้า Confirm เป็นขั้นที่ 1 เหมือนฝั่งห้องพัก */}
        <Stepper step={1} />

        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : !banquet ? (
          <div className="emptyBox">{err || "ไม่พบข้อมูล"}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 28 }}>
            {/* สรุปทางซ้าย */}
            <aside style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: "0 0 12px" }}>{banquet.name}</h3>
              <div style={{ borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                {hero ? (
                  <img src={hero} alt="" style={{ width: "100%", display: "block" }} />
                ) : (
                  <div style={{ aspectRatio: "4/3", background: "#f3f3f3" }} />
                )}
              </div>

              <SummaryRow label="ประเภท">ห้องจัดเลี้ยง</SummaryRow>
              <SummaryRow label="วันที่">{event_date}</SummaryRow>
              <SummaryRow label="เวลา">
                {start_time} – {end_time} ({hours} ชม.)
              </SummaryRow>
              <SummaryRow label="จำนวนผู้เข้าร่วม">{guests} คน</SummaryRow>
              {!!capacity && <SummaryRow label="ความจุสูงสุด">{capacity} คน</SummaryRow>}
              <SummaryRow label="ราคา/ชั่วโมง">{pricePerHour.toLocaleString()} บาท</SummaryRow>

              <div style={{ marginTop: 12, fontWeight: 800, textAlign: "right" }}>
                รวมทั้งสิ้น {total.toLocaleString()} บาท
              </div>

              {/* แสดงผลตรวจสอบความว่าง */}
              {event_date && start_time && end_time && (
                <div style={{ marginTop: 8 }}>
                  {availLoading
                    ? <span style={{ color: "#666" }}>กำลังตรวจสอบความว่าง...</span>
                    : available == null
                      ? <span style={{ color: "#666" }}>ไม่สามารถตรวจสอบความว่างได้ในขณะนี้</span>
                      : available
                        ? <span style={{ color: "#2e7d32" }}>ช่วงเวลานี้ว่าง</span>
                        : <span style={{ color: "crimson" }}>ช่วงเวลานี้ไม่ว่าง</span>}
                </div>
              )}

              {overCap && (
                <div style={{ color: "crimson", marginTop: 6 }}>
                  เกินความจุสูงสุด {capacity} คน
                </div>
              )}
            </aside>

            {/* ฟอร์มทางขวา */}
            <section>
              <h3 style={{ marginTop: 0 }}>กรอกข้อมูลผู้จอง</h3>
              {err && <div style={{ color: "crimson", marginBottom: 8 }}>{err}</div>}

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label>ชื่อจริง *<input name="first_name" className="bkInput" required disabled={locked} /></label>
                  <label>นามสกุล *<input name="last_name" className="bkInput" required disabled={locked} /></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label>อีเมล *<input type="email" name="email" className="bkInput" required disabled={locked} /></label>
                  <label>หมายเลขโทรศัพท์ *<input type="tel" name="phone" className="bkInput" required disabled={locked} /></label>
                </div>
                <label>เพิ่มเติม (ไม่บังคับ)
                  <textarea className="bkInput" rows={4} placeholder="รายละเอียดเพิ่มเติม เช่น จัดเลี้ยง 50 คน ใช้ไมโครโฟน 2 ตัว" disabled={locked} />
                </label>

                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  <button
                    type="button"
                    className="btnGhost"
                    onClick={() => navigate(`/bookings/bookingbanquet/${id}`, {
                      state: { event_date, start_time, end_time, guests }
                    })}
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    className="btnPrimary"
                    disabled={
                      submitting ||
                      locked ||
                      overCap ||
                      available === false
                    }
                    title={
                      locked
                        ? "ห้องนี้ยังไม่พร้อมให้จอง"
                        : available === false
                          ? "ช่วงเวลานี้ไม่ว่าง"
                          : undefined
                    }
                  >
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
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "8px 0",
      borderBottom: "1px solid var(--line)"
    }}>
      <div style={{ color: "#666" }}>{label}</div>
      <div style={{ fontWeight: 700, textAlign: "right" }}>{children}</div>
    </div>
  );
}
