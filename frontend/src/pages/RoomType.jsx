import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { roomApi, fileUrl } from "../lib/api";

// ไอคอน
import iconBed from "../icons/bed.svg";
import iconArea from "../icons/area.svg";
import iconView from "../icons/view.svg";
import iconBath from "../icons/bath-room.svg";

const SPEC_ICON = { bed: iconBed, area: iconArea, view: iconView, bathroom: iconBath };

function StatusRibbon({ show, label = "สถานะ: ไม่พร้อมให้จอง" }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: -8,
        background: "crimson",
        color: "#fff",
        padding: "6px 12px",
        transform: "rotate(-8deg)",
        fontWeight: 700,
        boxShadow: "0 2px 8px rgba(0,0,0,.15)",
        borderRadius: 6,
      }}
    >
      {label}
    </div>
  );
}

export default function RoomType() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loadingType, setLoadingType] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState("");

  const [typeInfo, setTypeInfo] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let alive = true;
    setLoadingType(true); setError("");
    roomApi.typeBySlug(slug)
      .then((data) => alive && setTypeInfo(data))
      .catch((err) => alive && setError(err.message || "โหลดข้อมูลประเภทไม่สำเร็จ"))
      .finally(() => alive && setLoadingType(false));
    return () => { alive = false; };
  }, [slug]);

  const fetchRooms = useCallback((pageNum) => {
    if (!typeInfo?.room_type_id) return;
    setLoadingRooms(true); setError("");
    roomApi.list({ typeId: typeInfo.room_type_id, include: "images,type", page: pageNum, limit })
      .then((res) => {
        const items = (res.items || []).slice().sort((a, b) => Number(a.room_number) - Number(b.room_number));
        setRooms(items); setTotalPages(res.totalPages || 1); setPage(res.page || pageNum);
      })
      .catch((err) => setError(err.message || "โหลดรายชื่อห้องไม่สำเร็จ"))
      .finally(() => setLoadingRooms(false));
  }, [typeInfo?.room_type_id, limit]);

  useEffect(() => { if (typeInfo?.room_type_id) fetchRooms(1); }, [typeInfo?.room_type_id, fetchRooms]);

  const cardSpecs = useMemo(() => {
    const arr = Array.isArray(typeInfo?.amenities) ? typeInfo.amenities : [];
    return arr.filter((a) => a?.group === "spec")
      .sort((a, b) => (a?.priority ?? 999) - (b?.priority ?? 999))
      .slice(0, 4);
  }, [typeInfo?.amenities]);

  // HERO: ใช้รูปห้องแรก ถ้าไม่มี → ไม่ตั้ง background
  const heroUrl = useMemo(() => {
    const firstImg = rooms?.[0]?.room_image?.[0]?.image_url;
    return firstImg ? fileUrl(firstImg) : null;
  }, [rooms]);

  if (!loadingType && !typeInfo && !error) return <Navigate to="/" replace />;

  return (
    <>
      <Navbar />
      <main className="typePage">
        {/* HERO */}
        <section className="typeHero" style={heroUrl ? { backgroundImage: `url(${heroUrl})` } : undefined}>
          <div className="typeHeroVeil" />
          <div className="typeHeroTitle">
            <div>
              <h1>{loadingType ? "กำลังโหลด..." : `ประเภท${typeInfo?.type_name || "ประเภทห้อง"}`}</h1>
              <div className="typeHeroSub">{typeInfo?.type_name_en || ""}</div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && <div className="container" style={{ color: "crimson", padding: "16px 0" }}>{error}</div>}

        {/* LIST ROOMS */}
        <section className="container typeRooms">
          {loadingRooms ? (
            <div className="loading">กำลังโหลดห้อง...</div>
          ) : rooms.length === 0 ? (
            <div className="emptyBox">ยังไม่มีห้องในประเภทนี้</div>
          ) : (
            rooms.map((r) => {
              const img = r?.room_image?.[0]?.image_url ? fileUrl(r.room_image[0].image_url) : null;
              const canBook = r?.status === "available";
              return (
                <article key={r.room_id} className="roomCard">
                  <div className="rtCardImg" style={{ position:"relative" }}>
                    <StatusRibbon show={!canBook} />
                    {img ? (
                      <img src={img} alt={r.room_number} loading="lazy" />
                    ) : (
                      <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f5f5",color:"#999",fontWeight:700}}>
                        ไม่มีรูป
                      </div>
                    )}
                  </div>

                  <div className="roomBody">
                    <header className="roomHeader">
                      <h3 className="roomTitle">{r.room_number}</h3>
                      <div className="roomSub">{r?.room_type?.type_name || "ห้องพัก"}</div>
                    </header>

                    <hr className="roomDivider" />

                    {!!cardSpecs.length && (
                      <ul className="facts">
                        {cardSpecs.map((s) => (
                          <li key={s.key}>
                            {SPEC_ICON[s.key] && <img src={SPEC_ICON[s.key]} className="factIc" alt="" />}
                            <span>{s.text || s.key}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="roomActions">
                      <button
                        type="button"
                        className="priceBtn"
                        disabled={!canBook}
                        aria-disabled={!canBook}
                        onClick={() => canBook && navigate(`/bookings/bookingroom/${r.room_id}`)}
                        aria-label={`จองห้อง ${r.room_number}`}
                        title={canBook ? "เริ่มจองห้องนี้" : "ห้องนี้ยังไม่พร้อมให้จอง"}
                        style={!canBook ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                      >
                        <span className="baht">฿</span>
                        <strong>{Number(r.price).toLocaleString()}</strong>
                        <span className="per">บาท / คืน</span>
                      </button>
                      {!canBook && <div style={{ fontSize:12, color:"#b00020", marginTop:6 }}>ไม่พร้อมให้จอง</div>}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Pagination */}
        {!loadingRooms && totalPages > 1 && (
          <div className="container" style={{ display: "flex", gap: 8, justifyContent: "center", margin: "24px 0 48px" }}>
            <button className="pageBtn" disabled={page <= 1} onClick={() => fetchRooms(page - 1)}>ก่อนหน้า</button>
            <div className="pageIndicator">Page {page} of {totalPages}</div>
            <button className="pageBtn" disabled={page >= totalPages} onClick={() => fetchRooms(page + 1)}>ถัดไป</button>
          </div>
        )}

        {/* Contact + Footer คงเดิม */}
        <section className="contact">
          <div className="container">
            <h3 className="contactTitle">ติดต่อเรา</h3>
            <ul className="contactList">
              <li>123 หมู่6 ใกล้แยก รร การบิน ถนน บางเลน ตำบล ห้วยขวาง อำเภอกำแพงแสน นครปฐม 73180</li>
              <li>082 466 6689</li>
            </ul>
          </div>
        </section>
        <footer className="bottomBar">
          <div className="container">© 2025 สุรีย์การ์เด้น รีสอร์ท. สงวนสิทธิ์ทั้งหมด</div>
        </footer>
      </main>
    </>
  );
}
