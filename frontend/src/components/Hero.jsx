import React from 'react'
import hero from '../assets/hero.jpg' 

export default function Hero(){
  return (
    <section className="hero">
      <img src={hero} alt="บรรยากาศรีสอร์ท" />
      <div className="heroOverlay" />
      <div className="heroContent">
        <h1 className="heroTitle">สุรีย์การ์เด้น</h1>
        <p className="heroSubtitle">
          ความเงียบสงบ… คือของขวัญที่แท้จริง<br/>
          สัมผัสบรรยากาศส่วนตัวท่ามกลางธรรมชาติ
        </p>
        <button className="heroBtn">จองเลย</button>
      </div>
    </section>
  )
}
