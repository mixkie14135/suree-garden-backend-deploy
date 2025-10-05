// src/pages/Banquet.jsx
import React, { useEffect } from "react";

export default function Banquet() {
  useEffect(() => {
    document.title = "ห้องจัดเลี้ยง | Suree Garden Resort";
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="banquetPage" data-page="banquet">
      {/* ใช้คลาสใหม่: banquetHero (ไม่ใช่ typeHero) */}
      <section className="banquetHero">
        <div className="container">
          <h1>ห้องจัดเลี้ยง (Placeholder)</h1>
          <p className="sub">หน้านี้จะเชื่อม API รูป/แพ็กเกจ/ราคา ภายหลัง</p>
        </div>
      </section>

      {/* หลีกเลี่ยงคลาส .section ที่หน้าอื่นใช้ร่วม ถ้าจำเป็นใช้ .banquetSection แทน */}
      <section className="container banquetSection">
        <div className="banquetEmpty">
          <h3 className="h3">กำลังเตรียมข้อมูล</h3>
          <p>จะดึงข้อมูลจริงจาก backend เมื่อพร้อม</p>
          <div className="banquetSkel">
            <span /><span /><span />
          </div>
        </div>
      </section>
    </main>
  );
}
