import React from "react";
import { Link } from "react-router-dom";
import view from "../assets/Home_full_view.jpg";      // 400x500
import view1 from "../assets/view1.jpg"; // 600x500
import room from "../assets/room_homepage.jpg";       // 1060x648

export default function FeaturedGrid() {
  return (
    <>
      {/* Section: ค้นพบสุรีย์การ์เด้น */}
      <section className="section featSection">
        <div className="container">
          <div className="sectionHeader">
            <div>
              <h2 className="h2">ค้นพบสุรีย์การ์เด้น</h2>
              <p className="sub">
                รีสอร์ทที่สร้างขึ้นเพื่อเพิ่มพูนความสุขและความผ่อนคลายให้คุณทุกช่วงเวลา
              </p>
            </div>

            <Link
              className="linkAll"
              to="/discover"
              onClick={() => window.scrollTo(0, 0)}
            >
              ดูทั้งหมด <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* แถวบน: สองรูปไม่เท่ากัน */}
          <div className="featGridCustom">
            <figure className="featCard featCard--small">
              <img
                className="featImg"
                src={view}
                alt="มุมบ่อน้ำบัว"
                loading="lazy"
              />
            </figure>
            <figure className="featCard featCard--large">
              <img
                className="featImg"
                src={view1}
                alt="เฉลียงไม้วิวสระน้ำ"
                loading="lazy"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* แถวล่าง: รูปแนวนอนเต็มความกว้าง */}
      <section className="section section--noTopPad featSection">
        <div className="container">
          <figure className="featWideWrap">
            <img
              className="featWideImg"
              src={room}
              alt="ห้องพักกว้างขวาง"
              loading="lazy"
            />
          </figure>
        </div>
      </section>
    </>
  );
}
