// src/pages/AdminBanquets.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiUpload,
  fileUrl,
  toArray,
} from "../lib/api.js";

/* ====== Filter เหมือน Rooms ====== */
const FILTER_OPTIONS = [
  { value: "all",         label: "ทั้งหมด" },
  { value: "available",   label: "ว่าง" },
  { value: "occupied",    label: "ไม่ว่าง" },
  { value: "maintenance", label: "ระหว่างซ่อม" },
];

const normalizePath = (s) => String(s || "").replace(/\\/g, "/");

function NoImage({ title = "ไม่มีรูป" }) {
  return (
    <div
      title={title}
      style={{
        width: "100%",
        height: "100%",
        border: "1px dashed #cfd6bf",
        borderRadius: 8,
        display: "grid",
        placeItems: "center",
        color: "#9aa18c",
        fontSize: 12,
        background: "#fafcf7",
      }}
    >
      No image
    </div>
  );
}

/* ====== map row → view ====== */
function toViewBanquet(row) {
  return {
    id: row.banquet_id,
    name: row.name || "",
    capacity: Number(row.capacity ?? 0),
    pricePerHour: Number(row.price_per_hour ?? 0),
    status: row.status || "available",
    detail: row.description || "",
    images: Array.isArray(row.banquet_image)
      ? row.banquet_image
          .map((i) => ({ id: i.image_id, url: normalizePath(i?.image_url || i?.url) }))
          .filter((i) => !!i.url)
      : [],
  };
}

/* ====== backend อาจคืนรูปแบบไม่เหมือนกัน → ดึง id ให้ได้ ====== */
function extractBanquetId(created) {
  if (!created || typeof created !== "object") return null;
  return (
    created.banquet_id ??
    created.id ??
    created?.data?.banquet_id ??
    created?.data?.id ??
    null
  );
}

export default function AdminBanquets({ embedded = false }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm());

  // create: เลือกรูปไว้ก่อนกดบันทึก
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // image manager
  const [imgMgr, setImgMgr] = useState({
    open: false, banquetId: null, banquetName: "", items: [], uploading: false,
    lightbox: { open: false, index: 0 },
  });

  // mini menu
  const [menuRowId, setMenuRowId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError("");
        await refreshBanquets();
      } catch (err) {
        setError(String(err?.message || err));
      } finally {
        setLoading(false);
      }
    })();
    return () => newPreviews.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function emptyForm() {
    return {
      id: null,
      name: "",
      detail: "",
      capacity: "50",
      pricePerHour: "0",
      status: "available",
      images: [],
    };
  }
  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  async function refreshBanquets() {
    const rs = await apiGet("/banquets"); // controller include images แล้ว
    const list = toArray(rs).map(toViewBanquet);
    setItems(list);
  }

  /* === sort ชื่อแบบ numeric-aware เช่น A1, A2, A10 === */
  const compareName = (a, b) => {
    const na = String(a ?? "");
    const nb = String(b ?? "");
    const cmp = na.localeCompare(nb, undefined, { numeric: true, sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  };

  const view = useMemo(() => {
    let list = [...items];
    if (filter !== "all") list = list.filter((r) => r.status === filter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        String(r.name).toLowerCase().includes(q) ||
        String(r.detail).toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => compareName(a.name, b.name));
    return list;
  }, [items, filter, search, sortDir]);

  function openCreate() {
    setForm(emptyForm());
    newPreviews.forEach((u) => URL.revokeObjectURL(u));
    setNewFiles([]); setNewPreviews([]);
    setEditing(true);
  }
  function openEdit(row) {
    setForm({
      id: row.id,
      name: row.name || "",
      detail: row.detail || "",
      capacity: String(row.capacity ?? "50"),
      pricePerHour: String(row.pricePerHour ?? "0"),
      status: row.status || "available",
      images: row.images || [],
    });
    newPreviews.forEach((u) => URL.revokeObjectURL(u));
    setNewFiles([]); setNewPreviews([]);
    setEditing(true);
    setMenuRowId(null);
  }
  function closeModal() {
    setEditing(false);
    setForm(emptyForm());
    newPreviews.forEach((u) => URL.revokeObjectURL(u));
    setNewFiles([]); setNewPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const confirmDelete = async (text) => {
    const res = await Swal.fire({
      title: "ยืนยันการลบ",
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });
    return res.isConfirmed;
  };
  const toast = (icon, title) =>
    Swal.fire({ toast: true, position: "top-end", showConfirmButton: false, timer: 1600, icon, title });

  const onDelete = async (id, nameForMsg) => {
    setMenuRowId(null);
    const ok = await confirmDelete(`ต้องการลบห้องจัดเลี้ยง “${nameForMsg}” หรือไม่?`);
    if (!ok) return;
    try {
      setLoading(true); setError("");
      await apiDelete(`/banquets/${id}`);
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast("success", "ลบเรียบร้อย");
    } catch (e) {
      setError(String(e.message || e));
      Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: String(e.message || e) });
    } finally {
      setLoading(false);
    }
  };

  /* === Create / Update + upload === */
  const onSave = async () => {
    try {
      if (!form.name?.trim()) throw new Error("กรุณากรอกชื่อห้องจัดเลี้ยง");
      if (Number(form.capacity) <= 0) throw new Error("ความจุต้องมากกว่า 0");
      if (Number(form.pricePerHour) < 0) throw new Error("ราคา/ชั่วโมง ต้องเป็นจำนวนบวก");

      setLoading(true); setError("");

      const payload = {
        name: form.name,
        capacity: Number(form.capacity || 0),
        price_per_hour: String(form.pricePerHour ?? "0"),
        status: form.status,
        description: form.detail || "",
      };

      let id = form.id;

      if (!form.id) {
        // CREATE
        const created = await apiPost(`/banquets`, payload);
        id = extractBanquetId(created);

        if (!id) {
          const all = await apiGet("/banquets");
          const arr = toArray(all).map(toViewBanquet);
          const matches = arr.filter(r => String(r.name) === String(form.name));
          if (matches.length > 0) id = matches[matches.length - 1].id;
        }

        if (id && newFiles.length) {
          let ok = 0, fail = 0;
          for (const f of newFiles) {
            try { await apiUpload(`/banquets/${id}/images`, f, "file"); ok++; }
            catch { fail++; }
          }
          if (ok) Swal.fire({ toast:true, position:"top-end", icon:"success", title:`อัปโหลดรูปสำเร็จ ${ok} ไฟล์`, timer:1600, showConfirmButton:false });
          if (fail) Swal.fire({ icon:"warning", title:"มีบางรูปอัปโหลดไม่สำเร็จ", text:`ไม่สำเร็จ ${fail} ไฟล์` });
        }

        Swal.fire({ toast:true, position:"top-end", icon:"success", title:"เพิ่มห้องจัดเลี้ยงสำเร็จ", timer:1600, showConfirmButton:false });
      } else {
        // UPDATE
        await apiPut(`/banquets/${id}`, payload);

        if (id && newFiles.length) {
          let ok = 0, fail = 0;
          for (const f of newFiles) {
            try { await apiUpload(`/banquets/${id}/images`, f, "file"); ok++; }
            catch { fail++; }
          }
          if (ok) Swal.fire({ toast:true, position:"top-end", icon:"success", title:`อัปโหลดรูปสำเร็จ ${ok} ไฟล์`, timer:1600, showConfirmButton:false });
          if (fail) Swal.fire({ icon:"warning", title:"มีบางรูปอัปโหลดไม่สำเร็จ", text:`ไม่สำเร็จ ${fail} ไฟล์` });
        }

        Swal.fire({ toast:true, position:"top-end", icon:"success", title:"บันทึกการแก้ไขแล้ว", timer:1600, showConfirmButton:false });
      }

      closeModal();
      await refreshBanquets();
    } catch (e) {
      setError(String(e.message || e));
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: String(e.message || e) });
    } finally {
      setLoading(false);
    }
  };

  /* === Image Manager === */
  async function openImageManager(row) {
    try {
      setLoading(true);
      const list = await apiGet(`/banquets/${row.id}/images`);
      const items = toArray(list).map((i) => ({
        id: i.image_id,
        url: normalizePath(i.image_url || i.url),
      }));
      setImgMgr({
        open: true,
        banquetId: row.id,
        banquetName: row.name,
        items,
        uploading: false,
        lightbox: { open: false, index: 0 },
      });
    } catch (e) {
      Swal.fire({ icon: "error", title: "ไม่สามารถดึงรูปได้", text: String(e.message || e) });
    } finally {
      setLoading(false);
      setMenuRowId(null);
    }
  }
  function closeImageManager() {
    setImgMgr((s) => ({ ...s, open: false, items: [], banquetId: null, banquetName: "" }));
  }
  async function onUploadFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !imgMgr.banquetId) return;
    try {
      setImgMgr((s) => ({ ...s, uploading: true }));
      for (const f of files) await apiUpload(`/banquets/${imgMgr.banquetId}/images`, f, "file");
      const list = await apiGet(`/banquets/${imgMgr.banquetId}/images`);
      const items = toArray(list).map((i) => ({ id: i.image_id, url: normalizePath(i.image_url || i.url) }));
      setImgMgr((s) => ({ ...s, items, uploading: false }));
      await refreshBanquets();
      toast("success", "อัปโหลดรูปสำเร็จ");
    } catch (err) {
      Swal.fire({ icon: "error", title: "อัปโหลดไม่สำเร็จ", text: String(err.message || err) });
      setImgMgr((s) => ({ ...s, uploading: false }));
    } finally {
      e.target.value = "";
    }
  }
  async function onDeleteImage(imageId) {
    const ok = await confirmDelete("ต้องการลบรูปนี้หรือไม่?");
    if (!ok) return;
    try {
      await apiDelete(`/banquets/${imgMgr.banquetId}/images/${imageId}`);
      setImgMgr((s) => ({ ...s, items: s.items.filter((x) => x.id !== imageId) }));
      await refreshBanquets();
      toast("success", "ลบรูปแล้ว");
    } catch (e) {
      Swal.fire({ icon: "error", title: "ลบรูปไม่สำเร็จ", text: String(e.message || e) });
    }
  }
  function openLightbox(index) { setImgMgr((s) => ({ ...s, lightbox: { open: true, index } })); }
  function closeLightbox()     { setImgMgr((s) => ({ ...s, lightbox: { open: false, index: 0 } })); }
  function nextLightbox(delta) {
    setImgMgr((s) => {
      const n = s.items.length; if (!n) return s;
      let i = s.lightbox.index + delta; if (i < 0) i = n - 1; if (i >= n) i = 0;
      return { ...s, lightbox: { open: true, index: i } };
    });
  }

  /* === เลือกรูปตอน create === */
  function onPickNewImages(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const urls = files.map((f) => URL.createObjectURL(f));
    setNewFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...urls]);
  }
  function removePickedImage(idx) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => {
      const copy = [...prev];
      const [del] = copy.splice(idx, 1);
      if (del) URL.revokeObjectURL(del);
      return copy;
    });
  }

  const isCreate = !form.id;

  return (
    <div className="adminPage" onClick={() => setMenuRowId(null)}>
      {/* ถ้าไม่ embedded ให้มีหัวเรื่องของหน้าด้วย */}
      {!embedded && (
        <div className="adminPageHeader">
          <h2>จัดการห้องจัดเลี้ยง</h2>
        </div>
      )}

      {/* Toolbar (info + search ด้านซ้าย / filter+sort+add ด้านขวา) */}
      <div className="toolbar">
        <div className="toolLeft">
          <div className="info">
            <span className="icon">🎉</span>
            ห้องจัดเลี้ยงทั้งหมด ({view.length} ห้อง)
          </div>

          <div className="search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา : ชื่อห้อง / รายละเอียด"
            />
          </div>
        </div>

        <div className="controls">
          <label className="filter">
            <span>Filter:</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="banquet-filter">
              {FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <button
            className="btnPrimary"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          >
            จัดเรียงชื่อ {sortDir === "asc" ? "↑" : "↓"}
          </button>

          <button className="btnPrimary" onClick={openCreate}>
            <span className="btnIc">+</span> เพิ่มห้องจัดเลี้ยง
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ marginBottom: 12 }}>กำลังโหลด...</div>}

      {/* ตาราง — ใช้คลาส .adminRooms เพื่อ reuse grid เดิม */}
      <div className="card table adminRooms">
        <div className="tHead">
          <div>ห้องจัดเลี้ยง</div>
          <div>ประเภท</div> {/* ไม่มีประเภทจริง ให้เว้นไว้ให้ layout เดิม */}
          <div className="center">จำนวนคน</div>
          <div className="right">ราคา/ชั่วโมง</div>
          <div className="center">สถานะ</div>
          <div className="right">รูปภาพ</div>
        </div>

        {view.map((r) => (
          <div className="tRow" key={r.id} onClick={(e) => e.stopPropagation()}>
            {/* ห้อง + action-menu */}
            <div className="cell--room">
              <button
                className="iconBtn roomEdit"
                title="เมนู"
                onClick={() => setMenuRowId((id) => (id === r.id ? null : r.id))}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
                </svg>
              </button>
              <div className="roomMeta">
                <span className="roomNo" title={`ห้องจัดเลี้ยง ${r.name}`}>{r.name}</span>
              </div>

              {menuRowId === r.id && (
                <div className="actionMenu" onClick={(e)=>e.stopPropagation()}>
                  <button onClick={() => openEdit(r)}>แก้ไข</button>
                  <button onClick={() => openImageManager(r)}>จัดการรูป</button>
                  <button className="danger" onClick={() => onDelete(r.id, r.name)}>ลบ</button>
                </div>
              )}
            </div>

            {/* ประเภท (ไม่มี) */}
            <div>-</div>

            {/* คนต่อห้อง */}
            <div className="center">{r.capacity}</div>

            {/* ราคา/ชั่วโมง */}
            <div className="right"><PriceHourTag value={r.pricePerHour} /></div>

            {/* สถานะ */}
            <div className="center"><StatusBadge status={r.status} /></div>

            {/* รูปภาพ */}
            <div className="right cell--thumb">
              <div className="thumbMini" title="ดู/จัดการรูป" onClick={() => openImageManager(r)} style={{ cursor: "pointer" }}>
                {r.images[0]?.url ? (
                  <img src={fileUrl(r.images[0].url)} alt="" loading="lazy" />
                ) : (
                  <NoImage />
                )}
                <span className="count">{r.images?.length || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal เพิ่ม/แก้ไข */}
      {editing && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modalCard" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="modalTitle">{isCreate ? "เพิ่มห้องจัดเลี้ยง" : "แก้ไขข้อมูลห้องจัดเลี้ยง"}</h3>

            <div className="modalGrid">
              <div className="modalForm">
                <div className="fRow">
                  <label>ชื่อห้องจัดเลี้ยง</label>
                  <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="เช่น Ballroom A" />
                </div>

                <div className="fRow">
                  <label>รายละเอียด</label>
                  <textarea
                    rows={4}
                    value={form.detail}
                    onChange={(e) => setField("detail", e.target.value)}
                    placeholder="คำอธิบายสั้น ๆ ของห้อง"
                    className="textarea"
                  />
                </div>

                <div className="fRow two">
                  <div>
                    <label>ราคา/ชั่วโมง (บาท)</label>
                    <input type="number" min="0" value={form.pricePerHour} onChange={(e) => setField("pricePerHour", e.target.value)} />
                  </div>
                  <div>
                    <label>ความจุ (จำนวนคน)</label>
                    <input type="number" min="1" value={form.capacity} onChange={(e) => setField("capacity", e.target.value)} />
                  </div>
                </div>

                <div className="fRow">
                  <label>สถานะ</label>
                  <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                    <option value="available">ว่าง</option>
                    <option value="occupied">ไม่ว่าง</option>
                    <option value="maintenance">ระหว่างซ่อม</option>
                  </select>
                </div>
              </div>

              {/* รูปในโมดัล (create เท่านั้น) */}
              <div className="modalGallery">
                <div className="gTitle">รูปภาพ {isCreate ? "(อัปโหลดพร้อมสร้างห้อง)" : "(อ่านจากระบบ)"}</div>

                {isCreate ? (
                  <>
                    <div className="fRow">
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onPickNewImages} />
                      <div style={{ fontSize: 12, color: "#6b6b6b", marginTop: 6 }}>
                        * เลือกหลายไฟล์ได้ และจะอัปโหลดหลังจากกด “ยืนยัน”
                      </div>
                    </div>

                    <div className="galleryGrid" style={{ marginTop: 8 }}>
                      {newPreviews.length === 0 && <div className="thumb"><NoImage /></div>}
                      {newPreviews.map((src, idx) => (
                        <div className="thumb" key={`picked-${idx}`}>
                          <img src={src} alt="" />
                          <button className="thumbDel" onClick={() => removePickedImage(idx)} title="นำรูปนี้ออก">×</button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="galleryGrid">
                      {(form.images || []).length === 0 && <div className="thumb"><NoImage /></div>}
                      {(form.images || []).map((img, idx) => (
                        <div className="thumb" key={`img-${idx}`}>
                          <img src={fileUrl(img.url)} alt="" />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#6b6b6b" }}>
                      * เพิ่ม/ลบรูปได้จาก “จัดการรูป” ในตาราง
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="modalActions">
              <button className="btnText" onClick={closeModal}>ยกเลิก</button>
              <button className="btnPrimary" onClick={onSave}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Manager */}
      {imgMgr.open && (
        <div className="modalOverlay" onClick={closeImageManager}>
          <div className="modalCard" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
            <h3 className="modalTitle">รูปภาพ – {imgMgr.banquetName}</h3>

            <div className="modalForm">
              <div className="fRow">
                <input type="file" accept="image/*" multiple onChange={onUploadFiles} disabled={imgMgr.uploading} />
              </div>
              {imgMgr.uploading && <div>กำลังอัปโหลด...</div>}
            </div>

            <div className="galleryGrid" style={{ marginTop:12 }}>
              {imgMgr.items.length === 0 && <div className="thumb"><NoImage /></div>}
              {imgMgr.items.map((it, idx)=>(
                <div className="thumb" key={it.id}>
                  <img src={fileUrl(it.url)} alt="" onClick={()=>openLightbox(idx)} style={{cursor:"zoom-in"}} />
                  <button className="thumbDel" onClick={()=>onDeleteImage(it.id)} title="ลบรูป">×</button>
                </div>
              ))}
            </div>

            <div className="modalActions">
              <button className="btnText" onClick={closeImageManager}>ปิด</button>
            </div>
          </div>

          {imgMgr.lightbox.open && imgMgr.items.length > 0 && (
            <div className="modalOverlay" onClick={closeLightbox} style={{ background:"rgba(0,0,0,.65)" }}>
              <div className="modalCard" style={{ background:"#111", color:"#fff", width:"min(1100px,96vw)" }} onClick={(e)=>e.stopPropagation()}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>รูป {imgMgr.lightbox.index + 1} / {imgMgr.items.length}</div>
                  <div>
                    <button className="btnText" onClick={()=>nextLightbox(-1)}>&lt;</button>
                    <button className="btnText" onClick={()=>nextLightbox(+1)}>&gt;</button>
                    <button className="btnText" onClick={closeLightbox}>ปิด</button>
                  </div>
                </div>
                <div style={{ marginTop:8 }}>
                  <img
                    src={fileUrl(imgMgr.items[imgMgr.lightbox.index].url)}
                    alt=""
                    style={{ width:"100%", maxHeight:"70vh", objectFit:"contain", display:"block", background:"#000" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ==== Sub components ==== */
function StatusBadge({ status }) {
  const label =
    status === "available" ? "ว่าง" :
    status === "maintenance" ? "ระหว่างซ่อม" : "ไม่ว่าง";
  const cls = status === "available" ? "ok" :
              status === "maintenance" ? "" : "bad";
  return <span className={"pill " + cls}>{label}</span>;
}
function PriceHourTag({ value }) {
  return <span className="priceTag">{Number(value || 0).toLocaleString()} <small>บาท/ชั่วโมง</small></span>;
}
