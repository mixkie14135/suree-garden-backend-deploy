// src/pages/AdminBanquets.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  apiGet, apiPost, apiPut, apiDelete, apiUpload, fileUrl, toArray,
} from "../lib/api.js";

const FILTER_OPTIONS = [
  { value: "all",         label: "ทั้งหมด" },
  { value: "available",   label: "ว่าง" },
  { value: "occupied",    label: "ไม่ว่าง" },
  { value: "maintenance", label: "ระหว่างซ่อม" },
];

const normalizePath = (s) => String(s || "").replace(/\\/g, "/");

function NoImage({ title = "ไม่มีรูป" }) {
  return (
    <div title={title} style={{
      width:"100%",height:"100%",border:"1px dashed #cfd6bf",borderRadius:8,
      display:"grid",placeItems:"center",color:"#9aa18c",fontSize:12,background:"#fafcf7"
    }}>
      No image
    </div>
  );
}

// ปรับ map ให้เข้ากับ backend ของ banquets
function toViewBanquet(row) {
  return {
    id: row.banquet_id ?? row.id,
    number: row.banquet_number ?? row.name ?? row.code ?? "",  // แล้วแต่หลังบ้าน
    typeId: row.banquet_type_id ?? "",
    type: row.banquet_type?.type_name || row.type_name || "",
    capacity: row.capacity ?? 0,
    price: Number(row.price ?? 0),
    status: row.status || "available",
    detail: row.description || "",
    images: Array.isArray(row.images || row.banquet_image)
      ? (row.images || row.banquet_image)
          .map((i)=>({ id:i.image_id ?? i.id, url: normalizePath(i?.image_url || i?.url) }))
          .filter((i)=>!!i.url)
      : [],
  };
}

export default function AdminBanquets({ embedded = false }) {
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // สำหรับ CRUD/Upload จะทำคล้าย rooms — ใส่ placeholder function ไว้ก่อน
  // คุณสามารถ copy logic จาก AdminRooms มาใช้ได้ 1:1 แล้วแค่เปลี่ยน endpoint เป็น /banquets

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError("");
        // ถ้ามีชนิดห้องจัดเลี้ยง
        try {
          const tps = await apiGet("/banquet-types");
          setTypes(tps || []);
        } catch (_) { /* เงียบไว้ถ้ายังไม่มี */ }
        await refresh();
      } catch (err) {
        setError(String(err?.message || err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refresh() {
    const rs = await apiGet("/banquets", { include: "type,images", limit: 200 });
    const arr = (rs?.items || rs || []).map(toViewBanquet);
    setItems(arr);
  }

  const compareNo = (a, b) => {
    const na = String(a ?? ""), nb = String(b ?? "");
    const cmp = na.localeCompare(nb, undefined, { numeric:true, sensitivity:"base" });
    return sortDir === "asc" ? cmp : -cmp;
  };

  const view = useMemo(() => {
    let list = [...items];
    if (filter !== "all") list = list.filter((r) => r.status === filter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        String(r.number).toLowerCase().includes(q) ||
        String(r.type).toLowerCase().includes(q) ||
        String(r.detail).toLowerCase().includes(q)
      );
    }
    list.sort((a,b)=>compareNo(a.number,b.number));
    return list;
  }, [items, filter, search, sortDir]);

  return (
    <div className="adminPage">
      {!embedded && (
        <div className="adminPageHeader">
          <h2>จัดการห้องจัดเลี้ยง</h2>
        </div>
      )}

      {/* Toolbar ตาม figma */}
      <div className="toolbar">
        <div className="leftStack">
          <div className="info">
            <span className="icon">🏬</span>
            ห้องจัดเลี้ยงทั้งหมด ({view.length} ห้อง)
          </div>
          <input
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="ค้นหา : เลขห้อง / ประเภท / รายละเอียด"
          />
        </div>
        <div className="controls">
          <label className="filter">
            <span>Filter:</span>
            <select value={filter} onChange={(e)=>setFilter(e.target.value)} aria-label="banquet-filter">
              {FILTER_OPTIONS.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          {/* ปุ่มอื่น ๆ (เพิ่ม/แก้ไข/ลบ/อัปโหลดรูป) จะเติมหลังเชื่อม CRUD */}
          <button className="btnPrimary" onClick={()=>setSortDir((d)=>(d==="asc"?"desc":"asc"))}>
            จัดเรียงเลขห้อง {sortDir==="asc"?"↑":"↓"}
          </button>
        </div>
      </div>

      {error && <div style={{ color:"#b00020", marginBottom:12 }}>{error}</div>}
      {loading && <div style={{ marginBottom:12 }}>กำลังโหลด...</div>}

      {/* ตาราง (โครงเดียวกับ rooms) */}
      <div className="card table adminRooms">
        <div className="tHead">
          <div>ห้อง</div>
          <div>ประเภท</div>
          <div className="center">จำนวนคน</div>
          <div className="right">ราคา/ครั้ง</div>
          <div className="center">สถานะ</div>
          <div className="right">รูปภาพ</div>
        </div>

        {view.map((r)=>(
          <div className="tRow" key={r.id}>
            <div className="cell--room">
              <div className="roomMeta">
                <span className="roomNo" title={`ห้องจัดเลี้ยง ${r.number}`}>{r.number}</span>
              </div>
            </div>

            <div>{r.type || types.find((t)=>t.banquet_type_id===Number(r.typeId))?.type_name || "-"}</div>
            <div className="center">{r.capacity}</div>
            <div className="right"><span className="priceTag">{Number(r.price||0).toLocaleString()} <small>บาท</small></span></div>
            <div className="center"><StatusBadge status={r.status} /></div>

            <div className="right cell--thumb">
              <div className="thumbMini" style={{ cursor:"default" }}>
                {r.images[0]?.url ? <img src={fileUrl(r.images[0].url)} alt="" loading="lazy" /> : <NoImage />}
                <span className="count">{r.images?.length || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const label = status==="available" ? "ว่าง" : status==="maintenance" ? "ระหว่างซ่อม" : "ไม่ว่าง";
  const cls = status==="available" ? "ok" : status==="maintenance" ? "" : "bad";
  return <span className={"pill " + cls}>{label}</span>;
}
