// frontend/src/components/Contact.jsx
import React from "react";

import AddressIcon from "../icons/mdi_address-marker.svg";
import PhoneIcon   from "../icons/phone.svg";

export default function Contact(){
  return (
    <section className="contact">
      <div className="container">
        <h3 className="contactTitle">ติดต่อเรา</h3>

        <ul className="contactList">
          <li className="contactItem">
            <span className="ic">
              <img src={AddressIcon} alt="" aria-hidden="true" />
            </span>
            <span className="txt">
              123 หมู่6 ใกล้แยก โรงเรียนการบิน ถนน มาลัยแมน ต.ห้วยม่วง อ.กำแพงแสน จ.นครปฐม 73180
            </span>
          </li>

          <li className="contactItem">
            <span className="ic">
              <img src={PhoneIcon} alt="" aria-hidden="true" />
            </span>
            <a className="txt link" href="tel:0824666689" title="โทร 082 466 6689">
              082 466 6689
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
