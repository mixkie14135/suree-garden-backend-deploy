// src/pages/AdminRoomBanquet.jsx
import { useState } from "react";
import AdminRooms from "./AdminRooms.jsx";
import AdminBanquets from "./AdminBanquets.jsx";

export default function AdminRoomBanquet() {
  const [activeTab, setActiveTab] = useState("rooms"); // 'rooms' | 'banquets'

  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <h2>
          <span className="headIcon"><BedIcon /></span> จัดการห้อง
        </h2>
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

      {/* เนื้อหาแต่ละแท็บ */}
      {activeTab === "rooms" ? (
        <AdminRooms embedded />
      ) : (
        <AdminBanquets embedded />
      )}
    </div>
  );
}

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24"><path d="M2 18v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6h-2v-2H4v2H2Zm2-4h12v-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2Z"/></svg>
  );
}
