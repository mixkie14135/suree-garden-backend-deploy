// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // หรือ SMTP อื่น
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

async function sendReservationEmail(to, { name, code, summaryHtml }) {
  return transporter.sendMail({
    from: `"Suree Garden Resort" <${process.env.EMAIL_USER}>`,
    to,
    subject: `ยืนยันการจอง • รหัส ${code}`,
    html: `
      <p>สวัสดีคุณ ${name},</p>
      <p>เราได้รับคำขอจองของคุณแล้ว รหัสคือ <b>${code}</b></p>
      ${summaryHtml}
      <p>โปรดชำระเงินภายในเวลาที่กำหนดเพื่อยืนยันการจอง</p>
    `
  });
}

module.exports = { sendReservationEmail };
