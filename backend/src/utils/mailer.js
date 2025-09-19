const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true = port 465, false = 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendReservationEmail(to, { name, code, summaryHtml }) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM, // เช่น "Suree Garden Resort <noreply.suree@gmail.com>"
    to,
    subject: `รหัสการจองของคุณ: ${code}`,
    html: `
      <p>สวัสดีคุณ ${name || ''},</p>
      <p>นี่คือรายละเอียดการจองของคุณ:</p>
      ${summaryHtml}
      <p>ขอบคุณที่ใช้บริการ Suree Garden Resort</p>
    `,
  });
}

module.exports = { sendReservationEmail };
