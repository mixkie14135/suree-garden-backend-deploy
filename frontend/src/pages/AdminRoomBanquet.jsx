// src/pages/AdminRoomBanquet.jsx
import { useState } from "react";
import AdminRooms from "./AdminRooms.jsx";

/** Placeholder สำหรับแท็บ "ห้องจัดเลี้ยง" ชั่วคราว */
function BanquetsPlaceholder() {
  return (
    <div className="adminPage">
      <div className="toolbar">
        <div className="toolLeft">
          <div className="info">
            <span className="icon">🎉</span>
            ห้องจัดเลี้ยงทั้งหมด (—)
          </div>
          <div className="search">
            <input disabled placeholder="ค้นหา : ชื่อห้อง / รายละเอียด (ยังไม่เชื่อม API)" />
          </div>
        </div>
        <div className="controls">
          <label className="filter">
            <span>Filter:</span>
            <select disabled><option>ทั้งหมด</option></select>
          </label>
          <button className="btnPrimary" disabled>จัดเรียง</button>
          <button className="btnPrimary" disabled><span className="btnIc">+</span> เพิ่มห้อง</button>
        </div>
      </div>

      <div className="card table adminRooms">
        <div style={{padding:16, color:"#6b6b6b", fontWeight:700}}>
          ยังไม่เชื่อม API ของห้องจัดเลี้ยง — ส่งเส้นทาง (routes) และ controller มาได้เลย เดี๋ยวผม map ให้ครับ
        </div>
      </div>
    </div>
  );
}

export default function AdminRoomBanquet() {
  const [activeTab, setActiveTab] = useState("rooms"); // "rooms" | "banquets"

  return (
    <div className="adminPage">
      {/* Header หลักของหน้า */}
      <div className="adminPageHeader">
        <h2>จัดการห้อง</h2>
      </div>

      {/* Tabs */}
      <div className="tabsWrapper">
        <div className="tabs">
          <button
            className={activeTab === "rooms" ? "tab active" : "tab"}
            onClick={() => setActiveTab("rooms")}
          >
            ห้องพัก
          </button>
          <button
            className={activeTab === "banquets" ? "tab active" : "tab"}
            onClick={() => setActiveTab("banquets")}
          >
            ห้องจัดเลี้ยง
          </button>
        </div>
      </div>

      {/* เนื้อหาของแต่ละแท็บ */}
      {activeTab === "rooms" ? (
        <AdminRooms embedded />
      ) : (
        <BanquetsPlaceholder />
      )}
    </div>
  );
}
