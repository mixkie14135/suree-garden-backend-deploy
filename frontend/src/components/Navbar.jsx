import React from 'react'
import logo from '../assets/logo.jpg'

export default function Navbar(){
  const onSearch = (e)=>{ e.preventDefault() }

  return (
    <header className="header">
      <div className="container headerRow">
        <a className="brand" href="#">
          <img src={logo} alt="Suree Garden Resort" />
        </a>

        <form className="searchBar" role="search" onSubmit={onSearch}>
          <input placeholder="ตรวจสอบสถานะวันจองหรือค้นหาการจอง" />
          <button type="submit" aria-label="ค้นหา">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </form>

        <nav className="navMenu" aria-label="เมนูหลัก">
          <ul>
            <li><a href="#">หน้าแรก</a></li>

            <li className="hasDropdown">
              <a href="#">ห้องพัก ▾</a>
              <div className="dropdown" role="menu">
                <a href="#">Deluxe Double</a>
                <a href="#">Premiere Double Room</a>
                <a href="#">Deluxe Twin</a>
                <a href="#">Superior Double Room</a>
                <a href="#">Deluxe Triple</a>
                <a href="#">Family Suite</a>
                <a href="#">Standard Villa</a>
              </div>
            </li>

            <li><a href="#">สิ่งอำนวยความสะดวก</a></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
