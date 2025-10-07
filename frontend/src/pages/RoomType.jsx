// src/pages/RoomType.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { roomApi, fileUrl } from "../lib/api";

// ---- ไอคอนจาก Figma (วางไฟล์ .svg ตามพาธนี้) ----
import iconBed from "../icons/bed.svg";
import iconArea from "../icons/area.svg";
import iconView from "../icons/view.svg";
import iconBath from "../icons/bath-room.svg";

// map key -> icon
const SPEC_ICON = {
  bed: iconBed,
  area: iconArea,
  view: iconView,
  bathroom: iconBath,
};



// รูป fallback เวลาไม่มีรูปเลย
import fallbackHero from "../assets/room.jpg";

export default function RoomType() {
  const { slug } = useParams();

  const [loadingType, setLoadingType] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState("");

  const [typeInfo, setTypeInfo] = useState(null); // { room_type_id, type_name, type_name_en, amenities, ... }
  const [rooms, setRooms] = useState([]);         // items[]
  const [page, setPage] = useState(1);
  const [limit] = useState(6);                    // ปรับจำนวนต่อหน้าได้
  const [totalPages, setTotalPages] = useState(1);

  // ==================== โหลดข้อมูลประเภทตาม slug ====================
  useEffect(() => {
    let alive = true;
    setLoadingType(true);
    setError("");

    roomApi
      .typeBySlug(slug) // <- /api/room-types/slug/:slug
      .then((data) => {
        if (!alive) return;
        setTypeInfo(data);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "โหลดข้อมูลประเภทไม่สำเร็จ");
      })
      .finally(() => alive && setLoadingType(false));

    return () => {
      alive = false;
    };
  }, [slug]);

  // ==================== โหลดลิสต์ห้องของประเภทนั้น ๆ ====================
  const fetchRooms = useCallback(
    (pageNum) => {
      if (!typeInfo?.room_type_id) return;
      setLoadingRooms(true);
      setError("");

      roomApi
        .list({
          typeId: typeInfo.room_type_id,
          include: "images,type",
          page: pageNum,
          limit,
        })
        .then((res) => {
          const items = (res.items || [])
            .slice()
            .sort((a, b) => Number(a.room_number) - Number(b.room_number)); // เรียงเลขห้อง
          setRooms(items);
          setTotalPages(res.totalPages || 1);
          setPage(res.page || pageNum);
        })
        .catch((err) => setError(err.message || "โหลดรายชื่อห้องไม่สำเร็จ"))
        .finally(() => setLoadingRooms(false));
    },
    [typeInfo?.room_type_id, limit]
  );

  useEffect(() => {
    if (typeInfo?.room_type_id) fetchRooms(1);
  }, [typeInfo?.room_type_id, fetchRooms]);

  // ==================== คัดเฉพาะ spec สำหรับการ์ด (4 แถว) ====================
  const cardSpecs = useMemo(() => {
    const arr = Array.isArray(typeInfo?.amenities) ? typeInfo.amenities : [];
    return arr
      .filter((a) => a?.group === "spec")
      .sort((a, b) => (a?.priority ?? 999) - (b?.priority ?? 999))
      .slice(0, 4);
  }, [typeInfo?.amenities]);

  // ==================== เลือกรูป hero ====================
  const heroUrl = useMemo(() => {
    const firstImg = rooms?.[0]?.room_image?.[0]?.image_url;
    return firstImg ? fileUrl(firstImg) : fallbackHero;
  }, [rooms]);

  if (!loadingType && !typeInfo && !error) {
    // slug ไม่พบ → กลับหน้าแรก
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Navbar />

      <main className="typePage">
        {/* ==================== Hero ==================== */}
        <section
          className="typeHero"
          style={{ backgroundImage: `url(${heroUrl})` }}
        >
          <div className="typeHeroVeil" />
          <div className="typeHeroTitle">
            <div>
              <h1>
                {loadingType ? "กำลังโหลด..." : `ประเภท${typeInfo?.type_name || "ประเภทห้อง"}`}
              </h1>
              <div className="typeHeroSub">
                {typeInfo?.type_name_en || ""}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== Error ==================== */}
        {error && (
          <div
            className="container"
            style={{ color: "crimson", padding: "16px 0" }}
          >
            {error}
          </div>
        )}

        {/* ==================== รายการห้อง ==================== */}
        <section className="container typeRooms">
          {loadingRooms ? (
            <div className="loading">กำลังโหลดห้อง...</div>
          ) : rooms.length === 0 ? (
            <div className="emptyBox">ยังไม่มีห้องในประเภทนี้</div>
          ) : (
            rooms.map((r) => {
              const img = r?.room_image?.[0]?.image_url
                ? fileUrl(r.room_image[0].image_url)
                : fallbackHero;

              return (
                <article className="roomCard" key={r.room_id}>
                <div className="roomImgWrap">
                  <img className="roomImg" src={img} alt={`${r.room_number}`} loading="lazy" />
                </div>

                <div className="roomBody">
                  <div className="roomInfo">
                    <h3 className="roomTitle">{r.room_number}</h3>
                    <div className="roomSub">{typeInfo?.type_name_en}</div>

                    {cardSpecs.length > 0 && (
                      <ul className="facts">
                        {cardSpecs.map((s) => (
                          <li key={s.key}>
                            {SPEC_ICON[s.key] && (
                              <img className="factIc" src={SPEC_ICON[s.key]} alt="" aria-hidden />
                            )}
                            {s.text || s.key}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="roomActions">
                    <button className="priceBtn" type="button">
                      <span className="baht">฿</span>
                      <strong>{Number(r.price).toLocaleString()}</strong>
                      <span className="per">บาท/คืน</span>
                    </button>

                    <a className="detailBtn" href="#">
                      <span>รายละเอียด</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M8 5l8 7-8 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </article>

              );
            })
          )}
        </section>

        {/* ==================== เพจจิ้ง ==================== */}
        {!loadingRooms && totalPages > 1 && (
          <div
            className="container"
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              margin: "24px 0 48px",
            }}
          >
            <button
              className="pageBtn"
              disabled={page <= 1}
              onClick={() => fetchRooms(page - 1)}
            >
              ก่อนหน้า
            </button>
            <div className="pageIndicator">
              Page {page} of {totalPages}
            </div>
            <button
              className="pageBtn"
              disabled={page >= totalPages}
              onClick={() => fetchRooms(page + 1)}
            >
              ถัดไป
            </button>
          </div>
        )}

        {/* ==================== Contact & Footer ==================== */}
        <section className="contact">
          <div className="container">
            <h3 className="contactTitle">ติดต่อเรา</h3>
            <ul className="contactList">
              <li>
                123 หมู่6 ใกล้แยก รร การบิน ถนน บางเลน ตำบล ห้วยขวาง อำเภอกำแพงแสน
                นครปฐม 73180
              </li>
              <li>082 466 6689</li>
            </ul>
          </div>
        </section>

        <footer className="bottomBar">
          <div className="container">
            © 2025 สุรีย์การ์เด้น รีสอร์ท. สงวนสิทธิ์ทั้งหมด
          </div>
        </footer>
      </main>
    </>
  );
}


