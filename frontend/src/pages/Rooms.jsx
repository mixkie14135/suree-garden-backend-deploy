// frontend/src/pages/Rooms.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { roomApi, banquetApi, fileUrl } from "../lib/api";

// ไอคอนของ "ห้องพัก"
import iconBed from "../icons/bed.svg";
import iconArea from "../icons/area.svg";
import iconView from "../icons/view.svg";
import iconBath from "../icons/bath-room.svg";

// ไอคอนของ "ห้องจัดเลี้ยง"
import diningIcon from "../icons/mdi_food.svg";
import usersIcon  from "../icons/bi_people-fill.svg";
import micIcon    from "../icons/maki_karaoke.svg";

const PER_PAGE = 4;

/* ---------- ICON map ---------- */
const SPEC_ICON = { bed: iconBed, area: iconArea, view: iconView, bathroom: iconBath };
const BQ_ICON   = { dining: diningIcon, capacity: usersIcon, karaoke: micIcon };

/* ---------- เลือกรูป (ไม่มี fallback) ---------- */
function pickRoomImage(r) {
  const img = r?.room_image?.[0]?.image_url || null;
  return img ? fileUrl(img) : null;
}
function pickBanquetImage(b) {
  const img = b?.banquet_image?.[0]?.image_url || b?.image_url || null;
  return img ? fileUrl(img) : null;
}

/* ---------- ฟีเจอร์ห้องจัดเลี้ยง ---------- */
function computeBanquetFeatures(b) {
  const feats = [{ key: "dining", label: "โต๊ะสำหรับนั่งทานอาหาร" }];
  if (Number(b?.capacity) > 0) {
    feats.push({ key: "capacity", label: `จุได้สูงสุด ${Number(b.capacity).toLocaleString()} คน` });
  }
  const hasKaraoke = /คาราโอเกะ/i.test(String(b?.description || "")) || b?.banquet_id === 2 || b?.banquet_id === 3;
  if (hasKaraoke) feats.push({ key: "karaoke", label: "คาราโอเกะ" });
  return feats.slice(0, 4);
}

export default function Rooms() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("all"); // all | room | banquet
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rooms, setRooms] = useState([]);
  const [banquets, setBanquets] = useState([]);

  useEffect(() => { document.title = "จอง | Suree Garden Resort"; window.scrollTo(0, 0); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const [r, b] = await Promise.all([
        roomApi.list({ include: "images,type", page: 1, limit: 1000 }),
        banquetApi.list({ include: "images", page: 1, limit: 1000 }),
      ]);
      const rList = Array.isArray(r) ? r.slice() : (r.items || []).slice();
      const bList = Array.isArray(b) ? b.slice() : (b.items || []).slice();
      rList.sort((a, b) => Number(a.room_number) - Number(b.room_number));
      setRooms(rList); setBanquets(bList); setPage(1);
    } catch (e) { setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const merged = useMemo(() => {
    if (tab === "room") return rooms.map((x) => ({ kind: "room", data: x }));
    if (tab === "banquet") return banquets.map((x) => ({ kind: "banquet", data: x }));
    return [...rooms.map((x) => ({ kind: "room", data: x })), ...banquets.map((x) => ({ kind: "banquet", data: x }))];
  }, [tab, rooms, banquets]);

  const totalPages = Math.max(1, Math.ceil(merged.length / PER_PAGE));
  const pagedItems = useMemo(() => merged.slice((page - 1) * PER_PAGE, (page - 1) * PER_PAGE + PER_PAGE), [merged, page]);
  const onTab = (next) => { setTab(next); setPage(1); };

  return (
    <main className="typePage">
      {/* ตัวกรอง */}
      <section className="container" style={{ marginTop: 28 }}>
        <div className="sectionHeader">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="h2">กรอง:</div>
            <div className="browseTabs" role="tablist" aria-label="ตัวกรองประเภท">
              <button role="tab" aria-selected={tab === "all"} className={`browseTab ${tab === "all" ? "is-active" : ""}`} onClick={() => onTab("all")}>ทั้งหมด</button>
              <button role="tab" aria-selected={tab === "room"} className={`browseTab ${tab === "room" ? "is-active" : ""}`} onClick={() => onTab("room")}>ห้องพัก</button>
              <button role="tab" aria-selected={tab === "banquet"} className={`browseTab ${tab === "banquet" ? "is-active" : ""}`} onClick={() => onTab("banquet")}>ห้องจัดเลี้ยง</button>
            </div>
          </div>
        </div>
      </section>

      {/* รายการการ์ด */}
      <section className="container typeRooms" style={{ marginTop: 24 }}>
        {loading ? (
          <div className="loading">กำลังโหลด...</div>
        ) : err ? (
          <div className="emptyBox" style={{ color: "crimson" }}>{err}</div>
        ) : pagedItems.length === 0 ? (
          <div className="emptyBox">ไม่พบรายการ</div>
        ) : (
          pagedItems.map((it) => {
            if (it.kind === "room") {
              const r = it.data;
              const img = pickRoomImage(r);
              const specAmenities = Array.isArray(r?.room_type?.amenities)
                ? r.room_type.amenities.filter((a) => a?.group === "spec")
                    .sort((a, b) => (a?.priority ?? 999) - (b?.priority ?? 999))
                    .slice(0, 4)
                : [];
              return (
                <article key={`room-${r.room_id}`} className="roomCard">
                  <div className="rtCardImg">
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
                    {specAmenities.length > 0 ? (
                      <ul className="facts">
                        {specAmenities.map((s) => (
                          <li key={s.key}>
                            {SPEC_ICON[s.key] && <img src={SPEC_ICON[s.key]} className="factIc" alt="" />}
                            <span>{s.text || s.key}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="facts">
                        <li><img src={iconBed} className="factIc" alt=""/><span>เตียง: {r?.room_type?.bed_desc || "-"}</span></li>
                        <li><img src={iconArea} className="factIc" alt=""/><span>ขนาดห้อง: {r?.room_type?.area_desc || "-"}</span></li>
                        <li><img src={iconView} className="factIc" alt=""/><span>{r?.room_type?.view_desc || "วิวมาตรฐาน"}</span></li>
                        <li><img src={iconBath} className="factIc" alt=""/><span>ห้องน้ำส่วนตัว</span></li>
                      </ul>
                    )}
                    <div className="roomActions">
                      <button type="button" className="priceBtn" onClick={() => navigate(`/bookings/bookingroom/${r.room_id}`)} aria-label={`จองห้อง ${r.room_number}`}>
                        <span className="baht">฿</span><strong>{Number(r.price).toLocaleString()}</strong><span className="per">บาท / คืน</span>
                      </button>
                      <a href="#" className="detailBtn">รายละเอียด
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </article>
              );
            }

            // banquet
            const b = it.data;
            const img = pickBanquetImage(b);
            const price = Number(b?.price_per_hour ?? b?.price ?? 0);
            const features = computeBanquetFeatures(b);

            return (
              <article key={`banquet-${b.banquet_id}`} className="roomCard">
                <div className="rtCardImg">
                  {img ? (
                    <img src={img} alt={b.name} loading="lazy" />
                  ) : (
                    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f5f5",color:"#999",fontWeight:700}}>
                      ไม่มีรูป
                    </div>
                  )}
                </div>
                <div className="roomBody">
                  <header className="roomHeader">
                    <h3 className="roomTitle">{b.name}</h3>
                    <div className="roomSub">ห้องจัดเลี้ยง</div>
                  </header>
                  <hr className="roomDivider" />
                  {!!features.length && (
                    <ul className="facts">
                      {features.map((f) => (
                        <li key={f.key}>
                          {BQ_ICON[f.key] && <img src={BQ_ICON[f.key]} className="factIc" alt="" />}
                          <span>{f.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="roomActions">
                    <button type="button" className="priceBtn" onClick={() => navigate(`/bookings/bookingbanquet/${b.banquet_id}`)} aria-label={`จองห้องจัดเลี้ยง ${b.name}`}>
                      <span className="baht">฿</span><strong>{price.toLocaleString()}</strong><span className="per">บาท / ชั่วโมง</span>
                    </button>
                    <a href="#" className="detailBtn">รายละเอียด
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Pagination */}
      {!loading && merged.length > 0 && (
        <div className="paginationWrap">
          <div className="pageIndicator">Page {page} of {totalPages}</div>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`numPageBtn ${n === page ? "is-active" : ""}`} onClick={() => setPage(n)}>{n}</button>
          ))}
        </div>
      )}
    </main>
  );
}
