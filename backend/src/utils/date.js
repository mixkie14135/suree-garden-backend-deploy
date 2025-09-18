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
  // ใช้ field UTC เสมอ เพื่อได้ Date 1970/UTC ที่มีโมง/นาทีที่ต้องการ
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

module.exports = {
  parseDateInput,
  timeToMinutes,
  isOverlapMinutes,
  combineDateAndTimeUTC,
  toUtcMidnight
};