// src/pages/HomeFull.jsx
import React, { useState, useRef, useCallback } from "react";
import veranda2 from "../assets/veranda2.jpg";
import pond from "../assets/pond.jpg";
import PremierDoubleRoom from "../assets/PremierDoubleRoom.jpg";
import DeluxeDouble from "../assets/DeluxeDouble.jpg";
import DeluxeTwin from "../assets/DeluxeTwin.jpg";
import SuperiorDoubleRoom from "../assets/SuperiorDoubleRoom.jpg";
import DeluxeTriple from "../assets/DeluxeTriple.jpg";
import StandardVilla from "../assets/StandardVilla.jpg";
import FamilySuite from "../assets/FamilySuite.jpg";
import BanquetRoom from "../assets/BanquetRoom.jpg";

const ROOMS = [
  { id: 1, img: DeluxeDouble,       tags: ["ห้องพัก", "ห้องดีลักซ์เตียงใหญ่"],   title: "ห้องดีลักซ์เตียงใหญ่",   desc: "ห้องดีลักซ์เตียงใหญ่ เหมาะกับคู่รัก/เพื่อน 1 คู่ บรรยากาศ เงียบสงบ เหมาะแก่การพักผ่อน มีสิ่งอำนวยความสะดวกครบครัน และทำเลที่ตั้งรายล้อมด้วยบรรยากาศธรรมชาติบ่อบัวและสวนสไตล์ไทย" },
  { id: 2, img: PremierDoubleRoom,  tags: ["ห้องพัก", "ห้องพรีเมียมเตียงใหญ่"], title: "ห้องพรีเมียมเตียงใหญ่", desc: "ห้องพรีเมียมเตียงใหญ่ กว้างขวาง โปร่งสบาย เหมาะกับนักท่องเที่ยวและครอบครัวขนาดเล็ก เน้นความเป็นส่วนตัว พร้อมพื้นที่นั่งเล่นหน้าห้องและหน้าต่างบานใหญ่" },
  { id: 3, img: DeluxeTwin,         tags: ["ห้องพัก", "ห้องดีลักซ์เตียงแฝด"],    title: "ห้องดีลักซ์เตียงแฝด",    desc: "เหมาะสำหรับเพื่อน 2 คนที่อยากได้เตียงแยก วิวด้านหน้าเป็นสระบัวและสวนสวย อากาศถ่ายเทดี ให้ความรู้สึกสบายในทุกช่วงเวลา" },
  { id: 4, img: SuperiorDoubleRoom, tags: ["ห้องพัก", "ซูพีเรีย เตียงใหญ่"],     title: "ซูพีเรีย เตียงใหญ่",     desc: "ห้องซูพีเรียเตียงใหญ่ ให้ความสะดวกสบายครบครัน เหมาะกับผู้เข้าพักที่ต้องการความเรียบง่ายแต่ครบเครื่อง" },
  { id: 5, img: DeluxeTriple,       tags: ["ห้องพัก", "ห้องดีลักซ์สำหรับ 3 ท่าน"], title: "ห้องดีลักซ์สำหรับ 3 ท่าน", desc: "เตียงใหญ่ + เตียงเล็ก เหมาะกับเพื่อน/ครอบครัว 3 ท่าน พักผ่อนสบายในบรรยากาศเงียบสงบ ติดธรรมชาติ" },
  { id: 6, img: StandardVilla,      tags: ["ห้องพัก", "ห้องพักบ้านเดี่ยว"],     title: "ห้องพักบ้านเดี่ยว",     desc: "บ้านเดี่ยวเป็นหลัง เป็นส่วนตัว มีเฉลียงหน้าบ้านให้รับลมชมสวน เหมาะกับครอบครัวเล็ก ๆ" },
  { id: 7, img: FamilySuite,        tags: ["ห้องพัก", "ห้องพักสำหรับครอบครัว"],   title: "ห้องพักสำหรับครอบครัว",   desc: "ห้องกว้าง จุคนได้หลายท่าน เตียงใหญ่ 2 เตียง + ฟูกเสริม เหมาะกับการพักผ่อนแบบกลุ่มหรือครอบครัว" },
  { id: 8, img: BanquetRoom,        tags: ["ห้องจัดเลี้ยง", "สังสรรค์"],         title: "ห้องจัดเลี้ยง",         desc: "ห้องจัดเลี้ยงสุรีย์การ์เด้น รีสอร์ทมีพื้นที่กว้างขวาง ตกแต่งเรียบง่ายครบครัน พร้อมโต๊ะ เก้าอี้ และระบบเสียง เหมาะสำหรับงานเลี้ยง งานแต่งงาน หรือประชุมกลุ่มในบรรยากาศสะดวกสบายและเป็นกันเอง" },
];

// ============= การ์ดเด้ง/เอียงตามเมาส์ =============
function RoomCard({ room }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});

  const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;  // 0..1
    const py = (e.clientY - r.top) / r.height;  // 0..1

    const TILT = 10;   // องศาเอียงสูงสุด
    const SCALE = 1.02;

    const rx = (0.5 - py) * TILT;   // rotateX
    const ry = (px - 0.5) * TILT;   // rotateY

    // เก็บตำแหน่งเมาส์ลง CSS var ด้วย เอาไปทำแสงไฮไลท์
    setStyle({
      transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${SCALE})`,
      boxShadow: `0 14px 36px rgba(0,0,0,${clamp(Math.abs(rx) + Math.abs(ry), 0, TILT) / (TILT * 6) + 0.08})`,
      "--mx": `${px * 100}%`,
      "--my": `${py * 100}%`,
    });
  }, []);

  const onLeave = useCallback(() => {
    setStyle({ transform: "translateZ(0)", boxShadow: "0 8px 22px rgba(0,0,0,.06)" });
  }, []);

  return (
    <article
      ref={ref}
      className="roomCard tiltCard"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={style}
    >
      <div className="roomImg">
        <img src={room.img} alt={room.title} />
      </div>
      <div className="roomInfo">
        <div className="chipRow">
          {room.tags.map((t, i) => (
            <span className="chip" key={i}>{t}</span>
          ))}
        </div>
        <h3 className="roomTitle">{room.title}</h3>
        <p className="roomDesc">{room.desc}</p>
      </div>

      {/* แสงไฮไลท์ตามเมาส์ */}
      <span className="tiltGlow" aria-hidden="true" />
    </article>
  );
}

export default function HomeFull() {
  return (
    <main className="homeFull">
      {/* Hero */}
      <section className="homeHero">
        <img src={veranda2} alt="บรรยากาศรีสอร์ท" />
        <div className="homeHeroShade" />
      </section>

      {/* Intro */}
      <section className="container homeIntro">
        <h1 className="homeTitle">สุรีย์การ์เด้นรีสอร์ท</h1>

        <div className="introGrid">
          <div className="introPic">
            <img src={pond} alt="บรรยากาศรีสอร์ท" />
          </div>
          <div className="introText">
            <div className="chipRow">
              <span className="chip">บรรยากาศ</span>
              <span className="chip">วิวด้านหน้า</span>
            </div>
            <h3 className="h3">บรรยากาศ</h3>
            <p>
              สุรีย์การ์เด้นรีสอร์ทให้บรรยากาศธรรมชาติรายล้อมด้วยสระบัว
              โค้งสะพานไม้และศาลาไม้ริมน้ำ เหมาะสำหรับผู้ที่ต้องการความผ่อนคลายจากความวุ่นวาย
              และชอบซึมซับบรรยากาศแบบไทยร่วมสมัย
            </p>
          </div>
        </div>
      </section>

      {/* Rooms */}
      <section className="container homeRooms">
        {ROOMS.map((r) => (
          <RoomCard key={r.id} room={r} />
        ))}
      </section>
    </main>
  );
}
