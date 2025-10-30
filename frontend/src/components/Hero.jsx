// src/components/Hero.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import hero from '../assets/hero.jpg'

export default function Hero(){
  return (
    <section className="hero hero--home">
      <img src={hero} alt="บรรยากาศรีสอร์ท" />
      <div className="heroOverlay" />
      <div className="heroContent heroContent--home">
        <h1 className="heroTitle">สุรีย์การ์เด้น</h1>
        <p className="heroSubtitle">
          ความเงียบสงบ… คือของขวัญที่แท้จริง<br/>
          สัมผัสบรรยากาศส่วนตัวท่ามกลางธรรมชาติ
        </p>
        <Link to="/rooms" className="heroBtn">จองเลย</Link>
      </div>
    </section>
  )
}
