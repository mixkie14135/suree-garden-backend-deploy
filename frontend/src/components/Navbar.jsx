import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.jpg";

export default function Navbar() {
  const nav = useNavigate();
  const loc = useLocation();
  const [code, setCode] = useState("");

  const onSearch = (e) => {
    e.preventDefault();
    const v = String(code || "").trim();
    if (!v) return;

    const target = `/bookings/status?code=${encodeURIComponent(v)}`;
    if (loc.pathname.startsWith("/bookings/status")) {
      // ถ้าอยู่หน้าเดิม ให้บังคับ reload query ใหม่
      nav(target, { replace: true });
      window.location.href = target; // reload หน้าใหม่ทันที
    } else {
      nav(target);
    }
    setCode(""); // เคลียร์ช่องค้นหาเสมอ
  };

  return (
    <header className="header">
      <div className="container headerRow">
        <NavLink className="brand" to="/">
          <img src={logo} alt="Suree Garden Resort" className="navbar-logo" />
        </NavLink>

        {/* ช่องค้นหา Booking Code */}
        <form className="searchBar" role="search" onSubmit={onSearch}>
          <input
            placeholder="กรอกรหัสการจอง (เช่น FW6JFJ6A หรือ BNQ1ABCD)"
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

          </ul>
        </nav>
      </div>
    </header>
  );
}
