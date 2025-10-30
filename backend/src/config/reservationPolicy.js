// config/reservationPolicy.js
function list(v, def=[]) {
  if (!v) return def;
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}

module.exports = {
  room: {
    // แนะนำตอนใช้สลิป: กัน pending + confirmed + checked_in
    blockStatuses: list(process.env.ROOM_BLOCK_STATUSES, ['pending','confirmed','checked_in']),
  },
  banquet: {
    // แนะนำตอนใช้สลิป: กัน pending + confirmed
    blockStatuses: list(process.env.BANQUET_BLOCK_STATUSES, ['pending','confirmed']),
  },
  pendingExpireMinutes: Number(process.env.PENDING_EXPIRES_MIN || 30),             // ตอนเพิ่งสร้างจอง
  pendingWithSlipExpireMinutes: Number(process.env.PENDING_SLIP_EXPIRES_MIN || 120), // หลังอัปสลิป
};
