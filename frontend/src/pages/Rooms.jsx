// src/pages/Rooms.jsx
import React, { useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import Contact from "../components/Contact.jsx";
import Footer from "../components/Footer.jsx";

export default function Rooms() {
  useEffect(() => {
    document.title = "ห้องพัก | Suree Garden Resort";
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* <Navbar /> */}
      <main className="roomsPage" data-page="rooms">
        <section className="roomsHero">
          <div className="container">
            <h1>ห้องพัก (Placeholder)</h1>
            <p className="sub">หน้านี้จะเชื่อม API รายการห้อง/ราคา/สถานะว่าง ภายหลัง</p>
          </div>
        </section>

        <section className="container roomsSection">
          <div className="roomsEmpty">
            <h3 className="h3">กำลังเตรียมข้อมูล</h3>
            <p>จะดึงข้อมูลจริงจาก backend เมื่อพร้อม</p>
            <div className="roomsSkel">
              <span /><span /><span />
            </div>
          </div>
        </section>
      </main>
      {/* <Footer /> */}
    </>
  );
}
