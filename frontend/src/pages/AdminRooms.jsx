// src/pages/AdminRooms.jsx
import { useEffect, useMemo, useState } from "react";
import roomA from "../assets/room.jpg";
import pond from "../assets/pond.jpg";
import veranda from "../assets/veranda.jpg";

const seedRooms = [
  { id: 0, number: "0", detail: "เตียงใหญ่ + เตียงเล็ก", capacity: 3, type: "Deluxe Triple", price: 650, status: "vacant", images: [pond] },
  { id: 1, number: "1", detail: "เตียงเดี่ยว 1 เตียง",     capacity: 2, type: "Deluxe Double",     price: 550, status: "vacant", images: [veranda] },
  { id: 2, number: "2", detail: "เตียงเล็ก 2 เตียง",        capacity: 2, type: "Deluxe Twin",       price: 550, status: "occupied", images: [roomA] },
  { id: 3, number: "3", detail: "เตียงเดี่ยว 1 เตียง",     capacity: 2, type: "Deluxe Double",     price: 550, status: "vacant", images: [roomA] },
  { id: 4, number: "4", detail: "เตียงเดี่ยว 1 เตียง",     capacity: 2, type: "Deluxe Double",     price: 550, status: "vacant", images: [veranda] },
];

const FACILITY_LIST = [
  { key: "bed",       label: "เตียงใหญ่" },
  { key: "electric",  label: "ไฟฟ้า" },
  { key: "shelf",     label: "ชั้นวางของ" },
  { key: "tv",        label: "ทีวี" },
  { key: "fridge",    label: "ตู้เย็น" },
  { key: "bathroom",  label: "ห้องน้ำส่วนตัว" },
  { key: "air",       label: "แอร์" },
  { key: "waterHeat", label: "เครื่องทำน้ำอุ่น" },
  { key: "wardrobe",  label: "ตู้เสื้อผ้า" },
];

const ROOM_TYPES = [
  "Deluxe Double",
  "Premier Double Room",
  "Deluxe Twin",
  "Superior Double Room",
  "Deluxe Triple",
  "Family Suite",
  "Standard Villa",
];

/* ===== helper: แปลงไฟล์ -> data URL เพื่อเก็บถาวร ===== */
const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);   // data URL string
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function AdminRooms() {
  const [rooms, setRooms] = useState(seedRooms);
  const [filter, setFilter] = useState("all");

  // ===== modal state =====
  const [editing, setEditing] = useState(null); // object ของห้องที่กำลังแก้ไข
  const [form, setForm] = useState(emptyForm());
  const [previews, setPreviews] = useState([]); // ไฟล์ใหม่ที่เพิ่งเลือก: [{file, url}]

  useEffect(() => {
    // TODO: โหลดจาก API จริง
    // fetch('/api/rooms').then(r => r.json()).then(setRooms);
  }, []);

  // กรองรายการ
  const view = useMemo(() => {
    if (filter === "all") return rooms;
    return rooms.filter(r =>
      filter === "vacant" ? r.status === "vacant" : r.status !== "vacant"
    );
  }, [rooms, filter]);

  // เปิด modal + เติม form
  const openEdit = (room) => {
    setEditing(room);
    setForm({
      id: room.id,
      number: room.number,
      detail: room.detail,
      capacity: String(room.capacity),
      type: room.type,
      price: String(room.price),
      status: room.status,
      facilities: room.facilities || {},
      images: room.images || [],        // รูปเดิม
    });
    setPreviews([]);                    // เคลียร์รูปใหม่
  };

  const closeModal = () => {
    setEditing(null);
    // revoke url ของพรีวิวก่อนปิด
    setPreviews(prev => {
      prev.forEach(p => { try { URL.revokeObjectURL(p.url); } catch {} });
      return [];
    });
  };

  // ปิดสกรอลพื้นหลังตอนเปิด modal + esc เพื่อปิด
  useEffect(() => {
    if (!editing) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [editing]);

  // เพิ่มห้อง (เดโม่)
  const onAdd = () => {
    const newRoom = {
      id: Date.now(),
      number: String(rooms.length),
      detail: "เตียงเดี่ยว 1 เตียง",
      capacity: 2,
      type: "ดีลักซ์เตียงใหญ่",
      price: 550,
      status: "vacant",
      images: [roomA],
    };
    setRooms(prev => [newRoom, ...prev]);
  };

  // ลบห้อง
  const onDelete = (id) => {
    if (!confirm("ลบห้องนี้?")) return;
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  // ===== form utils =====
  function emptyForm() {
    return {
      id: null,
      number: "",
      detail: "",
      capacity: "2",
      type: "",
      price: "0",
      status: "vacant",
      facilities: {},
      images: [], // รูปเดิม
    };
  }

  const setField = (name, value) => setForm(f => ({ ...f, [name]: value }));

  const toggleFacility = (key) =>
    setForm(f => ({ ...f, facilities: { ...f.facilities, [key]: !f?.facilities?.[key] } }));

  // เลือกไฟล์หลายไฟล์ (รูปใหม่)
  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPreviews(prev => [...prev, ...urls]);
  };

  // ลบ "รูปใหม่ (พรีวิว)"
  const removePreview = (idx) => {
    setPreviews(prev => {
      const arr = [...prev];
      try { URL.revokeObjectURL(arr[idx]?.url); } catch {}
      arr.splice(idx, 1);
      return arr;
    });
  };

  // ลบ "รูปเดิม"
  const removeOldImage = (idx) => {
    setForm(f => {
      const imgs = (f.images || []).filter((_, i) => i !== idx);
      return { ...f, images: imgs };
    });
  };

  // บันทึก (แปลงไฟล์พรีวิวเป็น data URL ก่อน)
  const onSave = async () => {
    // แปลงไฟล์ใหม่ทั้งหมดเป็น data URL เพื่อเก็บถาวร
    const uploadedDataUrls = await Promise.all(
      previews.map(p => fileToDataURL(p.file))
    );

    const patched = {
      ...form,
      capacity: Number(form.capacity || 0),
      price: Number(form.price || 0),
      // รวมรูปเดิม (หลังจากอาจลบบางรูป) + รูปใหม่ที่เพิ่งแปลง
      images: [ ...(form.images || []), ...uploadedDataUrls ],
    };

    setRooms(prev => prev.map(r => (r.id === form.id ? patched : r)));

    // เก็บกวาด objectURL ชั่วคราว
    previews.forEach(p => { try { URL.revokeObjectURL(p.url); } catch {} });
    setPreviews([]);
    closeModal();
  };

  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <h2><span className="headIcon"><BedIcon /></span> ห้องพักทั้งหมด</h2>

        <div className="tools">
          <label className="filter">
            <span>Filter:</span>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">ทั้งหมด</option>
              <option value="vacant">ว่าง</option>
              <option value="occupied">ไม่ว่าง</option>
            </select>
          </label>

          <button className="btnPrimary" onClick={onAdd}>
            <span className="btnIc">+</span> เพิ่มห้อง
          </button>
        </div>
      </div>

      {/* ===== ตารางห้อง ===== */}
      <div className="card table">
        <div className="tHead">
          <div>ห้อง</div>
          <div>รายละเอียด</div>
          <div className="center">จำนวนคนต่อห้อง</div>
          <div className="typeCol">ประเภท</div>
          <div className="priceCol">ราคา/คืน</div>
          <div className="center">สถานะ</div>
          <div className="right">รูปภาพ</div>
        </div>

        {view.map((r, i) => (
          <div className={"tRow " + (i % 2 ? "alt" : "")} key={r.id}>
            <div className="cell no">
              <button className="iconBtn" title="แก้ไข" onClick={() => openEdit(r)}>
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>
              </button>
              <span>{r.number}</span>
            </div>

            <div>{r.detail}</div>
            <div className="center">{r.capacity}</div>
            <div className="typeCol">{r.type}</div>
            <div className="priceCol">{r.price.toLocaleString()} บาท</div>

            <div className="center">
              <span className={"pill " + (r.status === "vacant" ? "ok" : "bad")}>
                {r.status === "vacant" ? "ว่าง" : "ไม่ว่าง"}
              </span>
            </div>

            <div className="thumbCell">
              <img src={(r.images && r.images[0]) || roomA} alt="" />
              <button className="delBtn" onClick={() => onDelete(r.id)}>ลบ</button>
            </div>
          </div>
        ))}
      </div>

      {/* ===== MODAL แก้ไข ===== */}
      {editing && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modalCard" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
            <h3 className="modalTitle">แก้ไขข้อมูลห้องพัก</h3>

            <div className="modalGrid">
              <div className="modalForm">
                <div className="fRow">
                  <label>ห้อง</label>
                  <input value={form.number} onChange={e=>setField("number", e.target.value)} />
                </div>

                <div className="fRow">
                  <label>ประเภทห้อง</label>
                  <select value={form.type} onChange={e => setField("type", e.target.value)}>
                    {!ROOM_TYPES.includes(form.type) && form.type && (
                      <option value={form.type}>{form.type} (เดิม)</option>
                    )}
                    {ROOM_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="fRow">
                  <label>รายละเอียด</label>
                  <input value={form.detail} onChange={e=>setField("detail", e.target.value)} />
                </div>

                <div className="fRow two">
                  <div>
                    <label>ราคา/คืน</label>
                    <input type="number" value={form.price} onChange={e=>setField("price", e.target.value)} />
                  </div>
                  <div>
                    <label>จำนวนคนต่อห้อง</label>
                    <input type="number" value={form.capacity} onChange={e=>setField("capacity", e.target.value)} />
                  </div>
                </div>

                <div className="fRow">
                  <label>สถานะ</label>
                  <select value={form.status} onChange={e=>setField("status", e.target.value)}>
                    <option value="vacant">ว่าง</option>
                    <option value="occupied">ไม่ว่าง</option>
                  </select>
                </div>

                <div className="fRow">
                  <label>สิ่งอำนวยความสะดวก</label>
                  <div className="facilityGrid">
                    {FACILITY_LIST.map(fa => (
                      <label key={fa.key} className="chk">
                        <input
                          type="checkbox"
                          checked={!!form.facilities?.[fa.key]}
                          onChange={()=>toggleFacility(fa.key)}
                        />
                        <span>{fa.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="fRow">
                  <label>เลือกรูปภาพ</label>
                  <input type="file" accept="image/*" multiple onChange={onPickFiles} />
                </div>
              </div>

              {/* รูปเดิม + พรีวิวรูปใหม่ */}
              <div className="modalGallery">
                <div className="gTitle">รูปเดิม</div>
                <div className="galleryGrid">
                  {(form.images || []).map((src, idx) => (
                    <div className="thumb" key={`old-${idx}`}>
                      <img src={src} alt="" />
                      <button className="thumbDel" onClick={()=>removeOldImage(idx)}>×</button>
                    </div>
                  ))}
                </div>

                <div className="gTitle">รูปที่เพิ่มใหม่ (พรีวิว)</div>
                <div className="galleryGrid">
                  {previews.map((p, idx) => (
                    <div className="thumb" key={`new-${idx}`}>
                      <img src={p.url} alt="" />
                      <button className="thumbDel" onClick={()=>removePreview(idx)}>×</button>
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

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M2 18v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6h-2v-2H4v2H2Zm2-4h12v-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2Z"/>
    </svg>
  );
}
