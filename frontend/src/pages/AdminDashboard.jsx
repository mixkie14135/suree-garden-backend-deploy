// src/pages/AdminDashboard.jsx
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <h2>
          <span className="headIcon"><DashboardIcon /></span> Dashboard
        </h2>
      </div>

      <div className="card adminEmpty">
        <div className="emptyBox">
          <p>ใส่สรุป/สถิติ, การ์ดชี้วัด หรือกราฟต่าง ๆ ของระบบไว้ที่นี่</p>
        </div>
      </div>
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"/>
    </svg>
  );
}
