// src/components/Navbar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg";

export default function Navbar() {
  const nav = useNavigate();
  const [code, setCode] = useState("");

  const onSearch = (e) => {
    e.preventDefault();
    const v = String(code || "").trim();
    if (!v) return;
    // ➜ ส่งไปเพจกลางเสมอ ให้เพจนั้นเป็นคนตัดสินใจว่าจะไป room หรือ banquet
    nav(`/bookings/check?code=${encodeURIComponent(v)}`);
  };

  return (
    <header className="header">
      <div className="container headerRow">
        <NavLink className="brand" to="/">
          <img src={logo} alt="Suree Garden Resort" className="navbar-logo" />
        </NavLink>

        {/* ค้นหาด้วยรหัสการจอง */}
        <form className="searchBar" role="search" onSubmit={onSearch}>
          <input
            placeholder="กรอกรหัสการจอง (เช่น FW6JFJ6A หรือ NP9WK482)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" aria-label="ค้นหา">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        <nav className="navMenu" aria-label="เมนูหลัก">
          <ul>
            <li><NavLink to="/">หน้าแรก</NavLink></li>

            <li className="hasDropdown">
              <NavLink to="/rooms" className="dropdownToggle">ห้องพัก ▾</NavLink>
              <div className="dropdown" role="menu">
                <NavLink to="/rooms/deluxe-double">ห้องดีลักซ์เตียงใหญ่</NavLink>
                <NavLink to="/rooms/premier-double">ห้องพรีเมียมเตียงใหญ่</NavLink>
                <NavLink to="/rooms/deluxe-twin">ห้องดีลักซ์เตียงแฝด</NavLink>
                <NavLink to="/rooms/superior-double">ซูพีเรีย เตียงใหญ่</NavLink>
                <NavLink to="/rooms/deluxe-triple">ห้องดีลักซ์สำหรับ 3 ท่าน</NavLink>
                <NavLink to="/rooms/family-suite">ห้องพักสำหรับครอบครัว</NavLink>
                <NavLink to="/rooms/standard-villa">ห้องพักบ้านเดี่ยว</NavLink>
              </div>
            </li>

            <li><NavLink to="/banquet">ห้องจัดเลี้ยง</NavLink></li>

            {/* เพจรวมสำหรับเช็คสถานะ */}
            <li><NavLink to="/bookings/check">เช็คสถานะการจอง</NavLink></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
