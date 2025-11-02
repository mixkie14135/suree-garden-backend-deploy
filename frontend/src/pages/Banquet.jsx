import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { banquetApi, fileUrl } from "../lib/api";

/* -------------------------------------------------------
   ไอคอน (เก็บไว้เหมือนเดิม)
------------------------------------------------------- */
import diningIcon from "../icons/mdi_food.svg";       // โต๊ะสำหรับนั่งทานอาหาร
import usersIcon from "../icons/bi_people-fill.svg";  // ความจุคน
import micIcon from "../icons/maki_karaoke.svg";      // คาราโอเกะ

// แมพ key -> icon
const BQ_ICON = {
  dining: diningIcon,
  capacity: usersIcon,
  karaoke: micIcon,
};

/* ---------------- Helper: เลือกรูปการ์ด ---------------- */
function pickCardImage(b) {
  const img = b?.banquet_image?.[0]?.image_url || b?.image_url || null;
  return img ? fileUrl(img) : null; // ไม่มี fallback แล้ว
}

/* ---------------- Helper: ฟีเจอร์การ์ด ---------------- */
function computeFeatures(b) {
  const feats = [];
  feats.push({ key: "dining", label: "โต๊ะสำหรับนั่งทานอาหาร" });

  if (Number(b?.capacity) > 0) {
    feats.push({
      key: "capacity",
      label: `จุได้สูงสุด ${Number(b.capacity).toLocaleString()} คน`,
    });
  }

  const hasKaraoke =
    /คาราโอเกะ/i.test(String(b?.description || "")) ||
    b?.banquet_id === 2 ||
    b?.banquet_id === 3;

  if (hasKaraoke) feats.push({ key: "karaoke", label: "คาราโอเกะ" });

  return feats.slice(0, 4);
}

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

export default function Banquet() {
  const navigate = useNavigate();

  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    document.title = "ห้องจัดเลี้ยง | Suree Garden Resort";
    window.scrollTo(0, 0);
  }, []);

  const fetchList = useCallback(
    async (pageNum = 1) => {
      setLoadingList(true);
      setError("");
      try {
        const res = await banquetApi.list({ include: "images", page: pageNum, limit });
        const list = Array.isArray(res) ? res.slice() : (res.items || []).slice();
        setItems(list);
        setPage(!Array.isArray(res) ? res.page || pageNum : pageNum);
        setTotalPages(!Array.isArray(res) ? res.totalPages || 1 : 1);
      } catch (e) {
        setError(e?.message || "โหลดรายการห้องจัดเลี้ยงไม่สำเร็จ");
        setItems([]);
        setPage(1);
        setTotalPages(1);
      } finally {
        setLoadingList(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  // HERO: ใช้รูปแรก ถ้าไม่มี → ไม่ตั้ง background
  const heroUrl = useMemo(() => {
    const first = items?.[0] ? pickCardImage(items[0]) : null;
    return first || null;
  }, [items]);

  return (
    <main className="typePage">
      {/* HERO */}
      <section
        className="typeHero"
        style={heroUrl ? { backgroundImage: `url(${heroUrl})` } : undefined}
      >
        <div className="typeHeroVeil" />
        <div className="typeHeroTitle">
          <div>
            <h1>ห้องจัดเลี้ยง</h1>
            <div className="typeHeroSub">Banquet room</div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="container" style={{ color: "crimson", padding: "16px 0" }}>
          {error}
        </div>
      )}

      {/* LIST */}
      <section className="container typeRooms">
        {loadingList ? (
          <div className="loading">กำลังโหลดห้องจัดเลี้ยง...</div>
        ) : items.length === 0 ? (
          <div className="emptyBox">ยังไม่มีห้องจัดเลี้ยงในระบบ</div>
        ) : (
          items.map((b) => {
            const img = pickCardImage(b);
            const price = Number(b?.price_per_hour ?? b?.price ?? 0);
            const features = computeFeatures(b);
            const canBook = b?.status === "available";

            return (
              <article key={b.banquet_id} className="roomCard">
                {/* รูป */}
                <div className="rtCardImg" style={{ position:"relative" }}>
                  <StatusRibbon show={!canBook} />
                  {img ? (
                    <img
                      src={img}
                      alt={b?.name || `Banquet #${b?.banquet_id}`}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#f5f5f5",
                        color: "#999",
                        fontWeight: 700,
                      }}
                    >
                      ไม่มีรูป
                    </div>
                  )}
                </div>

                {/* เนื้อหา */}
                <div className="roomBody">
                  <header className="roomHeader">
                    <h3 className="roomTitle">{b?.name || `Hall #${b?.banquet_id}`}</h3>
                    <div className="roomSub">Banquet Hall</div>
                  </header>

                  <hr className="roomDivider" />

                  {!!features.length && (
                    <ul className="facts">
                      {features.map((f) => (
                        <li key={f.key}>
                          {BQ_ICON[f.key] && (
                            <img src={BQ_ICON[f.key]} className="factIc" alt="" />
                          )}
                          <span>{f.label}</span>
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
                      onClick={() => canBook && navigate(`/bookings/bookingbanquet/${b.banquet_id}`)}
                      aria-label={`จองห้องจัดเลี้ยง ${b?.name || b?.banquet_id}`}
                      title={canBook ? "เริ่มจองห้องนี้" : "ห้องนี้ยังไม่พร้อมให้จอง"}
                      style={!canBook ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                    >
                      <span className="baht">฿</span>
                      <strong>{(price || 0).toLocaleString()}</strong>
                      <span className="per">บาท / ชั่วโมง</span>
                    </button>
                    {!canBook && <div style={{ fontSize:12, color:"#b00020", marginTop:6 }}>ไม่พร้อมให้จอง</div>}

                    {false && (
                      <button
                        type="button"
                        className="detailBtn"
                        onClick={() => canBook && navigate(`/banquet/${b.banquet_id}`)}
                      >
                        รายละเอียด
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M8 5l8 7-8 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Pagination */}
      {!loadingList && totalPages > 1 && (
        <div
          className="container"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            margin: "24px 0 48px",
          }}
        >
          <button className="pageBtn" disabled={page <= 1} onClick={() => fetchList(page - 1)}>
            ก่อนหน้า
          </button>
          <div className="pageIndicator">Page {page} of {totalPages}</div>
          <button className="pageBtn" disabled={page >= totalPages} onClick={() => fetchList(page + 1)}>
            ถัดไป
          </button>
        </div>
      )}
    </main>
  );
}
