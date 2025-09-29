// src/pages/RoomType.jsx
import { useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";

// รูป hero ของแต่ละประเภท
import DeluxeDoubleHero from "../assets/DeluxeDouble.jpg";
import PremierDoubleHero from "../assets/PremierDoubleRoom.jpg";
import DeluxeTwinHero from "../assets/DeluxeTwin.jpg";
import SuperiorDoubleHero from "../assets/SuperiorDoubleRoom.jpg";
import DeluxeTripleHero from "../assets/DeluxeTriple.jpg";
import StandardVillaHero from "../assets/StandardVilla.jpg";
import FamilySuiteHero from "../assets/FamilySuite.jpg";
import room1 from "../assets/room1.jpg";
import room3 from "../assets/room3.jpg";
import room4 from "../assets/room4.jpg";
import room12 from "../assets/room12.jpg";

// ข้อมูลแต่ละประเภทห้อง (ใช้ภาพเดียวกับ hero ไปก่อน)
const TYPES = {
  "deluxe-double": {
    th: "ประเภทดีลักซ์เตียงใหญ่",
    en: "Deluxe Double",
    hero: DeluxeDoubleHero,
    items: [
      { id: 1, title: "ห้องเลขที่ 1", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 550, img: room1 },
      { id: 3, title: "ห้องเลขที่ 3", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 550, img: room3 },
      { id: 4, title: "ห้องเลขที่ 4", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 550, img: room4 },
    ],
  },
  "premier-double": {
    th: "ประเภทพรีเมียมเตียงใหญ่",
    en: "Premiere Double Room",
    hero: PremierDoubleHero,
    items: [
      { id: 21, title: "ห้องเลขที่ 21", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 550, img: PremierDoubleHero },
    ],
  },
  "deluxe-twin": {
    th: "ประเภทดีลักซ์แฝด",
    en: "Deluxe Twin",
    hero: DeluxeTwinHero,
    items: [
      { id: 2, title: "ห้องเลขที่ 2", bed: "เตียง : 2 เตียงเล็ก", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 550, img: DeluxeTwinHero },
    ],
  },
  "superior-double": {
    th: "ประเภทซูพีเรียเตียงใหญ่",
    en: "Superior Double Room",
    hero: SuperiorDoubleHero,
    // รวมสองหน้ามาอยู่หน้าเดียว
    items: [
      { id: 5, title: "ห้องเลขที่ 5", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 450, img: SuperiorDoubleHero },
      { id: 6, title: "ห้องเลขที่ 6", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 450, img: SuperiorDoubleHero },
      { id: 7, title: "ห้องเลขที่ 7", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 450, img: SuperiorDoubleHero },
      { id: 8, title: "ห้องเลขที่ 8", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 450, img: SuperiorDoubleHero },
      { id: 9, title: "ห้องเลขที่ 9", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 450, img: SuperiorDoubleHero },
    ],
  },
  "deluxe-triple": {
    th: "ประเภทดีลักซ์สำหรับ 3 ท่าน",
    en: "Deluxe Triple",
    hero: DeluxeTripleHero,
    items: [
      { id: 0, title: "ห้องเลขที่ 0", bed: "เตียง : 1 เตียงใหญ่ 1 เตียงเล็ก", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 650, img: DeluxeTripleHero },
    ],
  },
  "standard-villa": {
    th: "ประเภทบ้านเดี่ยว",
    en: "Standard Villa",
    hero: StandardVillaHero,
    items: [
      { id: 11, title: "ห้องเลขที่ 11", bed: "เตียง : 2 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 450, img: StandardVillaHero },
      { id: 12, title: "ห้องเลขที่ 12", bed: "เตียง : 1 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 450, img: room12 },
    ],
  },
  "family-suite": {
    th: "ประเภทสำหรับครอบครัว",
    en: "Family Suite",
    hero: FamilySuiteHero,
    items: [
      { id: 10, title: "ห้องเลขที่ 10", bed: "เตียง : 2 เตียงใหญ่", area: "ขนาดห้อง: 20 ตารางเมตร", view: "วิว: พื้นที่กลางแจ้ง", bath: "ห้องน้ำ: ห้องน้ำส่วนตัว", price: 1500, img: FamilySuiteHero },
    ],
  },
};

export default function RoomType() {
  const { slug } = useParams();
  const data = useMemo(() => TYPES[slug], [slug]);
  if (!data) return <Navigate to="/" replace />;

  return (
    <>
      <Navbar />

      <main className="typePage">
        {/* Hero */}
        <section
          className="typeHero"
          style={{ backgroundImage: `url(${data.hero})` }}
        >
          <div className="typeHeroVeil" />
          <div className="typeHeroTitle">
            <div>
              <h1>{data.th}</h1>
              <div className="typeHeroSub">{data.en}</div>
            </div>
          </div>
        </section>

        {/* Rooms list */}
        <section className="container typeRooms">
          {data.items.map((r) => (
            <article className="roomCard hoverPop" key={r.id}>
              <div className="roomImg">
                <img src={r.img} alt={r.title} />
              </div>

              <div className="roomInfo">
                <h3 className="roomTitle">{r.title}</h3>
                <ul className="facts">
                  <li>{r.bed}</li>
                  <li>{r.area}</li>
                  <li>{r.view}</li>
                  <li>{r.bath}</li>
                </ul>

                <div className="roomActions">
                  <button className="priceBtn" type="button">
                    <span className="baht">฿</span>
                    <strong>{r.price.toLocaleString()}</strong>
                    <span className="per">บาท/คืน</span>
                  </button>

                  <a className="detailBtn" href="#">
                    <span>รายละเอียด</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Footer */}
        <section className="contact">
          <div className="container">
            <h3 className="contactTitle">ติดต่อเรา</h3>
            <ul className="contactList">
              <li>
                <span className="ic" aria-hidden>
                  <svg viewBox="0 0 24 24"><path d="M12 2C8.7 2 6 4.7 6 8c0 5 6 12 6 12s6-7 6-12c0-3.3-2.7-6-6-6zm0 8.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 5.5 12 5.5 14.5 6.6 14.5 8 13.4 10.5 12 10.5z" fill="currentColor"/></svg>
                </span>
                123 หมู่6 ใกล้แยก รร การบิน ถนน บางเลน ตำบล ห้วยขวาง อำเภอกำแพงแสน นครปฐม 73180
              </li>
              <li>
                <span className="ic" aria-hidden>
                  <svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.7 3.9 5.1 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C12.8 21 3 11.2 3 2c0-.6.4-1 1-1h2.4c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" fill="currentColor"/></svg>
                </span>
                082 466 6689
              </li>
            </ul>
          </div>
        </section>

        <footer className="bottomBar">
          <div className="container">© 2025 สุรีย์การ์เด้น รีสอร์ท. สงวนสิทธิ์ทั้งหมด</div>
        </footer>
      </main>
    </>
  );
}
