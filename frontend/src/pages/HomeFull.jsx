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
  { id: 1, img: DeluxeDouble,       tags: ["ห้องพัก", "ห้องดีลักซ์เตียงใหญ่"],   title: "ห้องดีลักซ์เตียงใหญ่",   desc: "ห้องดีลักซ์เตียงใหญ่ เหมาะกับคู่รัก/เพื่อน 1 คู่ บรรยากาศเงียบสงบ เหมาะแก่การพักผ่อน มีสิ่งอำนวยความสะดวกครบครัน และทำเลที่ตั้งรายล้อมด้วยบรรยากาศธรรมชาติบ่อบัวและสวนสไตล์ไทย" },
  { id: 2, img: PremierDoubleRoom,  tags: ["ห้องพัก", "ห้องพรีเมียมเตียงใหญ่"], title: "ห้องพรีเมียมเตียงใหญ่", desc: "ห้องพรีเมียมเตียงใหญ่ กว้างขวาง โปร่งสบาย เหมาะกับนักท่องเที่ยวและครอบครัวขนาดเล็ก เน้นความเป็นส่วนตัว พร้อมพื้นที่นั่งเล่นหน้าห้องและหน้าต่างบานใหญ่" },
  { id: 3, img: DeluxeTwin,         tags: ["ห้องพัก", "ห้องดีลักซ์เตียงแฝด"],    title: "ห้องดีลักซ์เตียงแฝด",    desc: "เหมาะสำหรับเพื่อน 2 คนที่อยากได้เตียงแยก วิวด้านหน้าเป็นสระบัวและสวนสวย อากาศถ่ายเทดี ให้ความรู้สึกสบายในทุกช่วงเวลา" },
  { id: 4, img: SuperiorDoubleRoom, tags: ["ห้องพัก", "ซูพีเรีย เตียงใหญ่"],     title: "ซูพีเรีย เตียงใหญ่",     desc: "ห้องซูพีเรียเตียงใหญ่ ให้ความสะดวกสบายครบครัน เหมาะกับผู้เข้าพักที่ต้องการความเรียบง่ายแต่ครบเครื่อง" },
  { id: 5, img: DeluxeTriple,       tags: ["ห้องพัก", "ห้องดีลักซ์สำหรับ 3 ท่าน"], title: "ห้องดีลักซ์สำหรับ 3 ท่าน", desc: "เตียงใหญ่ + เตียงเล็ก เหมาะกับเพื่อน/ครอบครัว 3 ท่าน พักผ่อนสบายในบรรยากาศเงียบสงบ ติดธรรมชาติ" },
  { id: 6, img: StandardVilla,      tags: ["ห้องพัก", "ห้องพักบ้านเดี่ยว"],     title: "ห้องพักบ้านเดี่ยว",     desc: "บ้านเดี่ยวเป็นหลัง เป็นส่วนตัว มีเฉลียงหน้าบ้านให้รับลมชมสวน เหมาะกับครอบครัวเล็ก ๆ" },
  { id: 7, img: FamilySuite,        tags: ["ห้องพัก", "ห้องพักสำหรับครอบครัว"],   title: "ห้องพักสำหรับครอบครัว",   desc: "ห้องกว้าง จุคนได้หลายท่าน เตียงใหญ่ 2 เตียง + ฟูกเสริม เหมาะกับการพักผ่อนแบบกลุ่มหรือครอบครัว" },
  { id: 8, img: BanquetRoom,        tags: ["ห้องจัดเลี้ยง", "สังสรรค์"],         title: "ห้องจัดเลี้ยง",         desc: "ห้องจัดเลี้ยงสุรีย์การ์เด้น รีสอร์ทมีพื้นที่กว้างขวาง ตกแต่งเรียบง่ายครบครัน พร้อมโต๊ะ เก้าอี้ และระบบเสียง เหมาะสำหรับงานเลี้ยง งานแต่งงาน หรือประชุมกลุ่มในบรรยากาศสะดวกสบายและเป็นกันเอง" },
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
        <p className="homeCardDesc">{room.desc}</p>
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
              สุรีย์การ์เด้นรีสอร์ทให้บรรยากาศธรรมชาติรายล้อมด้วยสระบัว
              โค้งสะพานไม้และศาลาไม้ริมน้ำ เหมาะสำหรับผู้ที่ต้องการความผ่อนคลายจากความวุ่นวาย
              และชอบซึมซับบรรยากาศแบบไทยร่วมสมัย
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
