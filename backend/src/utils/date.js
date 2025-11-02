// src/utils/date.js
// แปลงค่าที่คาดว่าจะเป็น Date/Time ให้อยู่รูปแบบ Date object
function parseDateInput(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// แปลง Date (TIME) -> minutes since midnight
// ✅ ใช้ UTC ป้องกันเพี้ยนจาก timezone (+7)
function timeToMinutes(d) {
  if (!d) return null;
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// overlap แบบนับนาที (aStart < bEnd && aEnd > bStart)
function isOverlapMinutes(aStartMin, aEndMin, bStartMin, bEndMin) {
  return aStartMin < bEndMin && aEndMin > bStartMin;
}

// ✅ รวม date(วันจัดงาน) + "HH:mm" ให้เป็น Date ที่ UTC (ป้อนให้ Prisma/Time)
function combineDateAndTimeUTC(dateObj, timeStr) {
  // dateObj: Date ของวัน (จาก event_date)
  // timeStr: "HH:mm"
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(
    dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(),
    hh, mm, 0
  ));
}

// ✅ คืนค่า UTC midnight ของวัน (ใช้ค้น equals และเก็บ DB)
function toUtcMidnight(dateObj) {
  return new Date(Date.UTC(
    dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0
  ));
}

function formatDateTimeThai(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date(date));
}

/**
 * ✅ คำนวณช่วงเวลาแบบ "เวลาไทย" (วันนี้/เดือนนี้) แล้วแปลงกลับเป็นช่วงเวลา UTC
 * ใช้เมื่อคอลัมน์เวลาที่เก็บใน DB เป็น UTC แต่ต้องการคิดสรุปตามเวลาไทย
 * @param {'today'|'month'} period
 * @param {number} tzOffsetMin ค่า offset นาทีของโซนเวลา (default: +7 ชั่วโมง)
 * @returns {[Date, Date]} [startUtc, endUtc]
 */
function thaiPeriodToUtcRange(period = 'today', tzOffsetMin = 7 * 60) {
  const now = new Date();
  // now ในเขตเวลาไทย
  const nowThai = new Date(now.getTime() + tzOffsetMin * 60 * 1000);

  let startThai, endThai;
  if (period === 'month') {
    startThai = new Date(nowThai.getFullYear(), nowThai.getMonth(), 1, 0, 0, 0, 0);
    endThai   = new Date(nowThai.getFullYear(), nowThai.getMonth() + 1, 1, 0, 0, 0, 0);
  } else {
    startThai = new Date(nowThai.getFullYear(), nowThai.getMonth(), nowThai.getDate(), 0, 0, 0, 0);
    endThai   = new Date(startThai.getTime() + 24 * 60 * 60 * 1000);
  }

  // แปลงกลับเป็น UTC
  const startUtc = new Date(startThai.getTime() - tzOffsetMin * 60 * 1000);
  const endUtc   = new Date(endThai.getTime()   - tzOffsetMin * 60 * 1000);
  return [startUtc, endUtc];
}

module.exports = {
  parseDateInput,
  timeToMinutes,
  isOverlapMinutes,
  combineDateAndTimeUTC,
  toUtcMidnight,
  formatDateTimeThai,
  thaiPeriodToUtcRange, 
};
