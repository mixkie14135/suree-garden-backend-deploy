// src/pages/RoomType.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { roomApi, fileUrl } from "../lib/api";

// ไอคอนจากไฟล์ SVG
import iconBed from "../icons/bed.svg";
import iconArea from "../icons/area.svg";
import iconView from "../icons/view.svg";
import iconBath from "../icons/bath-room.svg";

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
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);

  // โหลดข้อมูลประเภทตาม slug
  useEffect(() => {
    let alive = true;
    setLoadingType(true);
    setError("");

    roomApi
      .typeBySlug(slug) // /api/room-types/slug/:slug
      .then((data) => {
        if (!alive) return;
        setTypeInfo(data);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "โหลดข้อมูลประเภทไม่สำเร็จ");
      })
      .finally(() => alive && setLoadingType(false));

    return () => { alive = false; };
  }, [slug]);

  // โหลดลิสต์ห้องของประเภทนั้น ๆ
  const fetchRooms = useCallback((pageNum) => {
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
          .sort((a, b) => Number(a.room_number) - Number(b.room_number));
        setRooms(items);
        setTotalPages(res.totalPages || 1);
        setPage(res.page || pageNum);
      })
      .catch((err) => setError(err.message || "โหลดรายชื่อห้องไม่สำเร็จ"))
      .finally(() => setLoadingRooms(false));
  }, [typeInfo?.room_type_id, limit]);

  useEffect(() => {
    if (typeInfo?.room_type_id) fetchRooms(1);
  }, [typeInfo?.room_type_id, fetchRooms]);

  // คัดเฉพาะ spec สำหรับการ์ด (4 แถว)
  const cardSpecs = useMemo(() => {
    const arr = Array.isArray(typeInfo?.amenities) ? typeInfo.amenities : [];
    return arr
      .filter((a) => a?.group === "spec")
      .sort((a, b) => (a?.priority ?? 999) - (b?.priority ?? 999))
      .slice(0, 4);
  }, [typeInfo?.amenities]);

  // เลือกรูป hero
  const heroUrl = useMemo(() => {
    const firstImg = rooms?.[0]?.room_image?.[0]?.image_url;
    return firstImg ? fileUrl(firstImg) : fallbackHero;
  }, [rooms]);

  if (!loadingType && !typeInfo && !error) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Navbar />

      <main className="typePage">
        {/* ============= Hero: full-bleed + cover 420px ============= */}
        <section
          className="typeHero"
          style={{ backgroundImage: `url(${heroUrl})` }}
        >
          <div className="typeHeroVeil" />
          <div className="typeHeroTitle">
            <div>
              <h1>{loadingType ? "กำลังโหลด..." : `ประเภท${typeInfo?.type_name || "ประเภทห้อง"}`}</h1>
              <div className="typeHeroSub">{typeInfo?.type_name_en || ""}</div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="container" style={{ color: "crimson", padding: "16px 0" }}>
            {error}
          </div>
        )}

        {/* ============= รายการห้อง (การ์ด) ============= */}
        <section className="container typeRooms">
          {loadingRooms ? (
            <div className="loading">กำลังโหลดห้อง...</div>
          ) : rooms.length === 0 ? (
            <div className="emptyBox">ยังไม่มีห้องในประเภทนี้</div>
          ) : (
            rooms.map((r) => {
              const img = r?.room_image?.[0]?.image_url ? fileUrl(r.room_image[0].image_url) : fallbackHero;

              return (
                <article
                  key={r.room_id}
                  className="
                    roomCard group flex flex-col overflow-hidden rounded-[12px] bg-white
                    border border-[var(--color-line,#e9e9e9)]
                    shadow-[0_4px_20px_rgba(0,0,0,.08)]
                    transition-[transform,box-shadow] duration-200
                    hover:-translate-y-[3px] hover:shadow-[0_6px_24px_rgba(0,0,0,.12)]
                  "
                >
                  {/* รูปบนสุด: คุมด้วย .cardImg เพื่อให้สัดส่วน 4:3 + cover */}
                  <div className="cardImg">
                    <img src={img} alt={r.room_number} loading="lazy" />
                  </div>

                  {/* เนื้อหา */}
                  <div className="px-6 pt-6 pb-6 md:px-7 md:pt-7">
                    {/* หัวการ์ด */}
                    <header className="mb-5">
                      <h3 className="text-[22px] md:text-[24px] font-extrabold leading-[1.15] text-[#1f1f1f]">
                        {r.room_number}
                      </h3>
                      <div className="text-[14px] md:text-[15px] text-[#222]/80 mt-1">
                        {typeInfo?.type_name_en}
                      </div>
                    </header>

                    {/* เส้นคั่น */}
                    <div className="h-px w-full bg-[var(--color-line,#e9e9e9)] mb-5" />

                    {/* สเปก 4 แถว */}
                    {!!cardSpecs.length && (
                      <ul className="space-y-3 mb-6">
                        {cardSpecs.map((s) => (
                          <li key={s.key} className="flex items-center gap-3 text-[15px] md:text-[16px] text-[#1f1f1f]">
                            {SPEC_ICON[s.key] && (
                              <img
                                src={SPEC_ICON[s.key]}
                                aria-hidden
                                className="h-[22px] w-[22px] flex-shrink-0
                                           [filter:brightness(0)_saturate(100%)_invert(45%)_sepia(19%)_saturate(774%)_hue-rotate(41deg)_brightness(95%)_contrast(85%)]"
                              />
                            )}
                            <span className="font-semibold">{s.text || s.key}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* ปุ่มราคา + ลิงก์รายละเอียด */}
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        className="
                          inline-flex items-baseline gap-2 rounded-[10px]
                          px-5 py-3 md:px-6 md:py-3.5
                          bg-[#7c813e] text-white font-extrabold
                          shadow-[0_8px_18px_rgba(111,140,71,.28)]
                          transition-all hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(111,140,71,.32)]
                        "
                      >
                        <span className="translate-y-[-1px] text-[16px] md:text-[18px]">฿</span>
                        <strong className="text-[18px] md:text-[20px] tracking-[.2px]">
                          {Number(r.price).toLocaleString()}
                        </strong>
                        <span className="text-[12px] md:text-[13px] opacity-95">บาท / คืน</span>
                      </button>

                      <a
                        href="#"
                        className="
                          group/link inline-flex items-center gap-2 text-[15px] md:text-[16px]
                          font-extrabold text-[#1f1f1f] no-underline
                        "
                      >
                        รายละเอียด
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            className="transition-transform group-hover/link:translate-x-1" aria-hidden>
                          <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* เพจจิ้ง */}
        {!loadingRooms && totalPages > 1 && (
          <div className="container" style={{ display: "flex", gap: 8, justifyContent: "center", margin: "24px 0 48px" }}>
            <button className="pageBtn" disabled={page <= 1} onClick={() => fetchRooms(page - 1)}>ก่อนหน้า</button>
            <div className="pageIndicator">Page {page} of {totalPages}</div>
            <button className="pageBtn" disabled={page >= totalPages} onClick={() => fetchRooms(page + 1)}>ถัดไป</button>
          </div>
        )}

        {/* Contact & Footer */}
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
