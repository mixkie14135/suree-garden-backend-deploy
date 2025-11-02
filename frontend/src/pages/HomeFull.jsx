import React, { useState, useRef, useCallback } from "react";
import hero from "../assets/hero_homefull.jpg";
import view from "../assets/Home_full_view.jpg";
import DeluxeDouble from "../assets/ห้องดีลักซ์เตียงใหญ่.jpg";
import PremierDoubleRoom from "../assets/ห้องพรีเมียมเตียงใหญ่.jpg";
import DeluxeTwin from "../assets/ห้องดีลักซ์เตียงแฝด.jpg";
import SuperiorDoubleRoom from "../assets/ซูพีเรีย เตียงใหญ่.jpg";
import DeluxeTriple from "../assets/ห้องดีลักซ์สำหรับ 3 ท่าน.jpg";
import StandardVilla from "../assets/ห้องพักบ้านเดี่ยว.jpg";
import FamilySuite from "../assets/ห้องพักสำหรับครอบครัว.jpg";
import BanquetRoom from "../assets/ห้องจัดเลี้ยง.png";

const ROOMS = [
  { id: 1, img: DeluxeDouble,       tags: ["ห้องพัก", "ห้องดีลักซ์เตียงใหญ่"],   title: "ห้องดีลักซ์เตียงใหญ่",   desc: "ห้องดีลักซ์เตียงใหญ่ มาพร้อมเตียงใหญ่ นอนสบาย บรรยากาศเรียบง่ายอบอุ่น\n มีสิ่งอำนวยความสะดวกครบ เหมาะสำหรับพักผ่อนอย่างเป็นส่วนตัวในสวนร่มรื่น" },
  { id: 2, img: PremierDoubleRoom,  tags: ["ห้องพัก", "ห้องพรีเมียมเตียงใหญ่"], title: "ห้องพรีเมียมเตียงใหญ่", desc: "ห้องพรีเมียร์เตียงใหญ่ กว้างขวาง โปร่งโล่ง พร้อมเตียงใหญ่แสนสบาย สิ่งอำนวยความสะดวกครบ\n เหมาะสำหรับผู้ที่ต้องการพักผ่อนอย่างสบายท่ามกลางสวนร่มรื่นและเงียบสงบ" },
  { id: 3, img: DeluxeTwin,         tags: ["ห้องพัก", "ห้องดีลักซ์เตียงแฝด"],    title: "ห้องดีลักซ์เตียงแฝด",    desc: "ห้องดีลักซ์เตียงแฝด เหมาะสำหรับผู้เข้าพัก 2 คนที่ต้องการเตียงแยก ตกแต่งเรียบง่าย\n มีสิ่งอำนวยความสะดวกครบ ท่ามกลางบรรยากาศเงียบสงบและร่มรื่นของธรรมชาติ" },
  { id: 4, img: SuperiorDoubleRoom, tags: ["ห้องพัก", "ซูพีเรีย เตียงใหญ่"],     title: "ซูพีเรีย เตียงใหญ่",     desc: "ห้องซูพีเรียเตียงใหญ่ ให้บรรยากาศอบอุ่น เป็นกันเอง\n มาพร้อมเตียงใหญ่และสิ่งอำนวยความสะดวกพื้นฐานครบ\n เหมาะสำหรับผู้ที่มองหาความเรียบง่ายในบรรยากาศธรรมชาติที่เงียบสงบ" },
  { id: 5, img: DeluxeTriple,       tags: ["ห้องพัก", "ห้องดีลักซ์สำหรับ 3 ท่าน"], title: "ห้องดีลักซ์สำหรับ 3 ท่าน", desc: "ห้องดีลักซ์สำหรับ 3 ท่าน ขนาดกะทัดรัด พร้อมเตียงใหญ่แสนสบายและสิ่งอำนวยความสะดวกครบ\n บรรยากาศเรียบง่าย เป็นส่วนตัว เหมาะสำหรับผู้ที่ชอบความสงบและใกล้ชิดธรรมชาติ" },
  { id: 6, img: StandardVilla,      tags: ["ห้องพัก", "ห้องพักบ้านเดี่ยว"],     title: "ห้องพักบ้านเดี่ยว",     desc: "บ้านพักเดี่ยวส่วนตัว ให้ความเป็นส่วนตัวสูง พร้อมพื้นที่นั่งเล่นหน้าบ้าน มาพร้อมแอร์ ทีวี ตู้เย็น โซฟา\n และห้องน้ำในตัว เหมาะสำหรับผู้ที่ต้องการพักผ่อนอย่างเงียบสงบท่ามกลางธรรมชาติ" },
  { id: 7, img: FamilySuite,        tags: ["ห้องพัก", "ห้องพักสำหรับครอบครัว"],   title: "ห้องพักสำหรับครอบครัว",   desc: "ห้องพักขนาดใหญ่สำหรับครอบครัว เข้าพักได้สูงสุด 5 คน พร้อมเตียงใหญ่ 2 เตียง ห้องน้ำ 2 ห้อง, \nพื้นที่นั่งเล่น และโต๊ะไม้กลางแจ้ง เหมาะสำหรับการพักผ่อนร่วมกันในบรรยากาศสบาย ๆ \nและเป็นกันเอง" },
  { id: 8, img: BanquetRoom,        tags: ["ห้องจัดเลี้ยง", "สังสรรค์"],         title: "ห้องจัดเลี้ยง",         desc: "ห้องจัดเลี้ยงสุรีย์การ์เด้น รีสอร์ทมีพื้นที่กว้างขวาง ตกแต่งเรียบง่ายครบครัน พร้อมโต๊ะ เก้าอี้ \n และระบบเสียง เหมาะสำหรับงานเลี้ยง งานแต่งงาน \n หรือประชุมกลุ่มในบรรยากาศสะดวกสบายและเป็นกันเอง" },
];

function TiltBox({ children, className }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});

  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const TILT = 8;
    const rx = (0.5 - py) * TILT;
    const ry = (px - 0.5) * TILT;
    setStyle({
      transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`,
      "--mx": `${px * 100}%`,
      "--my": `${py * 100}%`,
    });
  }, []);
  const onLeave = useCallback(() => setStyle({ transform: "translateZ(0)" }), []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={style}
    >
      {children}
      <span className="tiltGlow" aria-hidden />
    </div>
  );
}

function RoomRow({ room }) {
  return (
    <article className="homeRow">
      <div className="homeThumb">
        <img src={room.img} alt={room.title} />
      </div>

      <TiltBox className="homeInfo">
        <div className="chipRow">
          {room.tags.map((t, i) => (
            <span className="chip" key={i}>{t}</span>
          ))}
        </div>
        <h3 className="homeCardTitle">{room.title}</h3>

        <p
          className="homeCardDesc"
          style={{ whiteSpace: "pre-line", ["--desc-max"]: (room.descMax || "100ch") }}
        >
          {room.desc}
        </p>
      </TiltBox>
    </article>
  );
}


export default function HomeFull() {
  return (
    <main className="homeFull">
      {/* Hero */}
      <section className="homeHero">
        <img src={hero} alt="บรรยากาศรีสอร์ท" />
        <div className="homeHeroShade" />
      </section>

      {/* รวมทุกแถวไว้ใน homeRooms เดียวกัน */}
      <section className="container homeRooms">
        <h1 className="homeTitle">สุรีย์การ์เด้นรีสอร์ท</h1>

        {/* แถวแรก: บรรยากาศ */}
        <article className="homeRow">
          <div className="homeThumb">
            <img src={view} alt="บรรยากาศรีสอร์ท" />
          </div>
          <TiltBox className="homeInfo">
            <div className="chipRow">
              <span className="chip">บรรยากาศ</span>
              <span className="chip">มุมวิวทัศน์</span>
            </div>
            <h3 className="homeCardTitle">บรรยากาศ</h3>
            <p className="homeCardDesc">
              สุรีย์การ์เด้นรีสอร์ทมีบรรยากาศเรียบง่ายแต่มีเสน่ห์ โอบล้อมด้วยต้นไม้ร่มรื่น < br /> 
              มีมุมพักผ่อนเงียบสงบใต้ต้นไม้ใหญ่ <br />
              เหมาะสำหรับผู้ที่มองหาความผ่อนคลายจากความวุ่นวายของเมืองใหญ่
            </p>
          </TiltBox>
        </article>

        {/* แถวห้องทั้งหมด */}
        {ROOMS.map((r) => (
          <RoomRow key={r.id} room={r} />
        ))}
      </section>
    </main>
  );
}
