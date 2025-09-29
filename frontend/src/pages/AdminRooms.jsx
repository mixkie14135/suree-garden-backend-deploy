// src/pages/AdminRooms.jsx
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api.js";
import roomA from "../assets/room.jpg";

/** map สถานะระหว่าง UI ↔︎ Backend */
const STATUS_UI_TO_API = { vacant: "available", occupied: "occupied" };
const STATUS_API_TO_UI = { available: "vacant", occupied: "occupied", maintenance: "occupied" };

/** แปลง room จาก backend ให้เป็น shape ที่หน้า UI ใช้ง่าย */
function toViewRoom(row) {
  return {
    id: row.room_id,
    number: row.room_number,
    typeId: row.room_type_id ?? "",
    type: row.room_type?.type_name || "",
    capacity: row.capacity ?? 0,
    price: Number(row.price ?? 0),
    status: STATUS_API_TO_UI[row.status] || "vacant",
    detail: row.description || "",
    images: Array.isArray(row.room_image)
      ? row.room_image.map((i) => i?.image_url || i?.url).filter(Boolean)
      : [],
  };
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);           // [{room_type_id, type_name, ...}]
  const [filter, setFilter] = useState("all");      // all | vacant | occupied
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // modal/edit/create
  const [editing, setEditing] = useState(false);    // true = เปิดโมดัล
  const [form, setForm] = useState(emptyForm());    // ใช้ฟอร์มเดียวกัน เพิ่ม/แก้ไข

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const tps = await apiGet("/room-types");
        setTypes(tps || []);

        await refreshRooms();
      } catch (err) {
        setError(String(err?.message || err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** กรองตามสถานะ UI */
  const view = useMemo(() => {
    if (filter === "all") return rooms;
    return rooms.filter((r) =>
      filter === "vacant" ? r.status === "vacant" : r.status !== "vacant"
    );
  }, [rooms, filter]);

  function emptyForm() {
    return {
      id: null,
      number: "",
      typeId: "",
      detail: "",
      capacity: "2",
      price: "0",
      status: "vacant",
      images: [],
    };
  }

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  /** เปิดโมดัล “เพิ่มห้อง” */
  function openCreate() {
    setForm(emptyForm());
    setEditing(true);
  }

  /** เปิดโมดัล “แก้ไขห้อง” */
  function openEdit(room) {
    setForm({
      id: room.id,
      number: room.number,
      typeId: room.typeId || "",
      detail: room.detail || "",
      capacity: String(room.capacity ?? "2"),
      price: String(room.price ?? "0"),
      status: room.status || "vacant",
      images: room.images || [],
    });
    setEditing(true);
  }

  function closeModal() {
    setEditing(false);
    setForm(emptyForm());
  }

  async function refreshRooms() {
    const rs = await apiGet("/rooms", { include: "type,images", limit: 200 });
    setRooms((rs?.items || []).map(toViewRoom));
  }

  /** ลบห้อง */
  const onDelete = async (id) => {
    if (!confirm("ลบห้องนี้?")) return;
    try {
      setLoading(true);
      setError("");
      await apiDelete(`/rooms/${id}`);
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  /** บันทึก (ถ้า form.id ว่าง = เพิ่มใหม่, ถ้ามี = แก้ไข) */
  const onSave = async () => {
    try {
      // validate อย่างง่าย
      if (!form.number?.trim()) throw new Error("กรุณากรอกหมายเลขห้อง");
      if (!form.typeId)        throw new Error("กรุณาเลือกประเภทห้อง");
      if (Number(form.capacity) <= 0) throw new Error("จำนวนคนต่อห้องต้องมากกว่า 0");
      if (Number(form.price) < 0)     throw new Error("ราคา/คืน ต้องเป็นจำนวนบวก");

      setLoading(true);
      setError("");

      const payload = {
        room_number: form.number,
        room_type_id: Number(form.typeId),
        capacity: Number(form.capacity || 0),
        price: String(form.price ?? "0"),
        status: STATUS_UI_TO_API[form.status] || "available",
        description: form.detail || "",
      };

      if (!form.id) {
        await apiPost(`/rooms`, payload);   // CREATE
      } else {
        await apiPut(`/rooms/${form.id}`, payload); // UPDATE
      }

      closeModal();
      await refreshRooms();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const isCreate = !form.id;

  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <h2>
          <span className="headIcon"><BedIcon /></span> ห้องพักทั้งหมด
          <small style={{ marginLeft: 10, color: "#6b745f" }}>({rooms.length} ห้อง)</small>
        </h2>

        <div className="tools">
          <label className="filter">
            <span>Filter:</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">ทั้งหมด</option>
              <option value="vacant">ว่าง</option>
              <option value="occupied">ไม่ว่าง</option>
            </select>
          </label>

          <button className="btnPrimary" onClick={openCreate}>
            <span className="btnIc">+</span> เพิ่มห้อง
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ marginBottom: 12 }}>กำลังโหลด...</div>}

      {/* ตาราง */}
      <div className="card table adminRooms">
        <div className="tHead">
          <div>ห้อง</div>
          <div>รายละเอียด</div>
          <div className="center">จำนวนคน</div>
          <div>ประเภท</div>
          <div className="right">ราคา/คืน</div>
          <div className="center">สถานะ</div>
          <div className="right">รูปภาพ</div>
        </div>

        {view.map((r) => (
          <div className="tRow" key={r.id}>
            {/* ห้อง: ปุ่มแก้ไขซ้าย, ขวาเป็น "ห้องเลขที่ <no>" */}
            <div className="cell--room">
              <button className="iconBtn roomEdit" title="แก้ไข" onClick={() => openEdit(r)}>
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>
              </button>

              <div className="roomMeta">
                <span className="roomTitle"></span>
                <span className="roomNo" title={`ห้องเลขที่ ${r.number}`}>{r.number}</span>
              </div>
            </div>

            {/* รายละเอียด */}
            <div className="cell--detail">
              <div className="detailClamp">{r.detail || "-"}</div>
            </div>

            {/* คนต่อห้อง */}
            <div className="center">{r.capacity}</div>

            {/* ประเภท */}
            <div>
              {r.type || (types.find(t => t.room_type_id === Number(r.typeId))?.type_name) || "-"}
            </div>
            
            {/* ราคา */}
            <div className="right"><PriceTag value={r.price} /></div>

            {/* สถานะ */}
            <div className="center"><StatusBadge status={r.status} /></div>

            {/* รูป + ลบ */}
            <div className="right cell--thumb">
              <div className="thumbMini">
                <img src={(r.images && r.images[0]) || roomA} alt="" />
                <span className="count">{(r.images?.length || 0)}</span>
              </div>
              <div className="rowActions">
                <button className="btnText danger" onClick={() => onDelete(r.id)}>ลบ</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal เพิ่ม/แก้ไข */}
      {editing && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modalCard" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="modalTitle">{isCreate ? "เพิ่มห้องใหม่" : "แก้ไขข้อมูลห้องพัก"}</h3>

            <div className="modalGrid">
              <div className="modalForm">
                <div className="fRow">
                  <label>หมายเลขห้อง</label>
                  <input
                    value={form.number}
                    onChange={(e) => setField("number", e.target.value)}
                    placeholder="เช่น 101"
                  />
                </div>

                <div className="fRow">
                  <label>ประเภทห้อง</label>
                  <select value={form.typeId} onChange={(e) => setField("typeId", e.target.value)}>
                    <option value="" disabled>-- เลือกประเภท --</option>
                    {types.map((t) => (
                      <option key={t.room_type_id} value={t.room_type_id}>{t.type_name}</option>
                    ))}
                  </select>
                </div>

                <div className="fRow">
                  <label>รายละเอียด</label>
                  <input
                    value={form.detail}
                    onChange={(e) => setField("detail", e.target.value)}
                    placeholder="คำอธิบายสั้น ๆ ของห้อง"
                  />
                </div>

                <div className="fRow two">
                  <div>
                    <label>ราคา/คืน (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => setField("price", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>จำนวนคนต่อห้อง</label>
                    <input
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={(e) => setField("capacity", e.target.value)}
                    />
                  </div>
                </div>

                <div className="fRow">
                  <label>สถานะ</label>
                  <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                    <option value="vacant">ว่าง</option>
                    <option value="occupied">ไม่ว่าง</option>
                  </select>
                </div>
              </div>

              {/* พรีวิวรูป (อัปโหลดจริงต่อ endpoint /room-images ภายหลัง) */}
              <div className="modalGallery">
                <div className="gTitle">รูปภาพ</div>
                <div className="galleryGrid">
                  {(form.images || []).length === 0 && (
                    <div className="thumb"><img src={roomA} alt="" /></div>
                  )}
                  {(form.images || []).map((src, idx) => (
                    <div className="thumb" key={`img-${idx}`}>
                      <img src={src} alt="" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modalActions">
              <button className="btnText" onClick={closeModal}>ยกเลิก</button>
              <button className="btnPrimary" onClick={onSave}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== เล็กๆ ใช้แสดงสถานะ/ราคา ===== */
function StatusBadge({ status }) {
  const ok = status === "vacant";
  return <span className={"pill " + (ok ? "ok" : "bad")}>{ok ? "ว่าง" : "ไม่ว่าง"}</span>;
}
function PriceTag({ value }) {
  return <span className="priceTag">{Number(value || 0).toLocaleString()} <small>บาท</small></span>;
}

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M2 18v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6h-2v-2H4v2H2Zm2-4h12v-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2Z"/>
    </svg>
  );
}
