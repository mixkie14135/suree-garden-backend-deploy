// src/pages/AdminRoomBanquet.jsx
import { useState } from "react";
import AdminRooms from "./AdminRooms.jsx";
import AdminBanquets from "./AdminBanquets.jsx";

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
        <AdminBanquets embedded />
      )}
    </div>
  );
}
