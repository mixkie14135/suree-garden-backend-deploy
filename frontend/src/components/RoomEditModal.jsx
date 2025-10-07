import React, { useEffect, useMemo, useRef, useState } from "react";

const AMENITIES = [
  { key:"bed-king", label:"เตียงใหญ่" },
  { key:"power",    label:"ไฟฟ้า" },
  { key:"locker",   label:"ตู้/ชั้นวางของ" },
  { key:"tv",       label:"ทีวี" },
  { key:"fridge",   label:"ตู้เย็น" },
  { key:"bath",     label:"ห้องน้ำส่วนตัว" },
  { key:"ac",       label:"แอร์" },
  { key:"water",    label:"เครื่องทำน้ำอุ่น" },
  { key:"wardrobe", label:"ตู้เสื้อผ้า" },
];

export default function RoomEditModal({ open, room, onClose, onSave }){
  const [form, setForm] = useState(null);
  const [newFiles, setNewFiles] = useState([]);        
  const [removeImages, setRemoveImages] = useState([]); 
  const fileRef = useRef();

  useEffect(() => {
    if (!room) return;
    setForm({
      id: room.id,
      number: room.number ?? "",
      detail: room.detail ?? "",
      capacity: room.capacity ?? 2,
      type: room.type ?? "",
      price: room.price ?? 0,
      status: room.status ?? "free",
      amenities: room.amenities ? [...room.amenities] : [],
      images: room.images ? [...room.images] : [],   
    });
    setNewFiles([]);
    setRemoveImages([]);
  }, [room]);

  const previews = useMemo(() => {
    return newFiles.map((file) => ({ name:file.name, url:URL.createObjectURL(file) }));
  }, [newFiles]);

  const update = (k,v) => setForm(prev => ({...prev, [k]:v}));

  const toggleAmenity = (key) => {
    setForm(prev => {
      const set = new Set(prev.amenities);
      set.has(key) ? set.delete(key) : set.add(key);
      return {...prev, amenities:[...set]};
    });
  };

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setNewFiles(prev => [...prev, ...files]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) setNewFiles(prev => [...prev, ...files]);
  };

  const removeNew = (idx) => {
    setNewFiles(prev => prev.filter((_,i)=>i!==idx));
  };

  const removeOld = (imgUrl) => {
    setRemoveImages(prev => [...prev, imgUrl]);
    setForm(prev => ({...prev, images: prev.images.filter(u => u!==imgUrl)}));
  };

  const submit = async () => {
    if (!form) return;

    
    const fd = new FormData();
    fd.append("payload", JSON.stringify({
      id: form.id,
      number: String(form.number).trim(),
      detail: form.detail,
      capacity: Number(form.capacity)||0,
      type: form.type,
      price: Number(form.price)||0,
      status: form.status,
      amenities: form.amenities,
      keepImages: form.images,      
    }));
    newFiles.forEach(f => fd.append("images[]", f));
    if (removeImages.length) fd.append("removeImages", JSON.stringify(removeImages));

    
    const updated = {
      ...form,
      
      images: [
        ...form.images,
        ...previews.map(p => p.url)
      ]
    };
    onSave?.(updated);
    onClose?.();
  };

  if (!open || !form) return null;

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalCard" onClick={(e)=>e.stopPropagation()}>
        <h3>แก้ไขข้อมูลห้องพัก</h3>

        <div className="modalGrid">
          <div className="formCol">
            <label>ห้อง</label>
            <input
              type="number"
              value={form.number}
              onChange={e=>update("number", e.target.value)}
            />

            <label>ประเภทห้อง</label>
            <input
              value={form.type}
              onChange={e=>update("type", e.target.value)}
            />

            <label>รายละเอียด</label>
            <input
              value={form.detail}
              onChange={e=>update("detail", e.target.value)}
            />

            <label>ราคา/คืน</label>
            <input
              type="number"
              value={form.price}
              onChange={e=>update("price", e.target.value)}
            />

            <label>จำนวนคนต่อห้อง</label>
            <input
              type="number"
              value={form.capacity}
              onChange={e=>update("capacity", e.target.value)}
            />

            <label>สถานะ</label>
            <select
              value={form.status}
              onChange={e=>update("status", e.target.value)}
            >
              <option value="free">ว่าง</option>
              <option value="busy">ไม่ว่าง</option>
            </select>
          </div>

          <div className="amenityCol">
            <div className="amenityTitle">สิ่งอำนวยความสะดวก</div>
            <div className="amenityList">
              {AMENITIES.map(a => (
                <label key={a.key} className="amenityItem">
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(a.key)}
                    onChange={()=>toggleAmenity(a.key)}
                  />
                  <span>{a.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="imageCol">
            <div className="imgTitle">รูปห้อง (เดิม)</div>
            <div className="imgGrid">
              {form.images?.map((u,i)=>(
                <figure key={u+i} className="imgBox">
                  <img src={u} alt="" />
                  <button className="delThumb" onClick={()=>removeOld(u)}>ลบ</button>
                </figure>
              ))}
            </div>

            <div className="imgTitle">เพิ่มรูปใหม่</div>
            <div
              className="dropArea"
              onDrop={onDrop}
              onDragOver={e=>e.preventDefault()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onPickFiles}
                style={{display:"none"}}
              />
              <p>ลากรูปมาวาง หรือ</p>
              <button type="button" className="btnLine" onClick={()=>fileRef.current?.click()}>
                เลือกไฟล์…
              </button>
            </div>

            {previews.length>0 && (
              <>
                <div className="imgTitle">ตัวอย่างรูปใหม่</div>
                <div className="imgGrid">
                  {previews.map((p,idx)=>(
                    <figure key={p.url} className="imgBox">
                      <img src={p.url} alt={p.name} />
                      <button className="delThumb" onClick={()=>removeNew(idx)}>ลบ</button>
                    </figure>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modalActions">
          <button className="btnLine" onClick={onClose}>ยกเลิก</button>
          <button className="adminBtnPrimary" onClick={submit}>ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}
