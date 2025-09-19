const path = require('path');

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads'); // <root project>/uploads
const SLIP_DIR    = path.join(UPLOAD_ROOT, 'slips');
const ROOM_DIR    = path.join(UPLOAD_ROOT, 'rooms'); // ✅ เพิ่ม

module.exports = { UPLOAD_ROOT, SLIP_DIR, ROOM_DIR }; // ✅ เพิ่ม
