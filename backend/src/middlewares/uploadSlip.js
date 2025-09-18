const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { SLIP_DIR } = require('../utils/uploadPaths');

fs.mkdirSync(SLIP_DIR, { recursive: true });

// map mimetype -> นามสกุลปลอดภัย
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg' : '.jpg',
  'image/png' : '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SLIP_DIR),
  filename: (req, file, cb) => {
    // พยายามอ่านนามสกุลจากชื่อเดิมก่อน
    let ext = (path.extname(file.originalname || '') || '').toLowerCase();
    // ถ้าไม่มี ให้เดาจาก mimetype
    if (!ext) ext = EXT_BY_MIME[file.mimetype] || '.jpg';

    const name = `slip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Invalid file type. Only jpg, png, webp, heic are allowed.'));
}

const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB
const uploadSlip = multer({ storage, fileFilter, limits });

module.exports = { uploadSlip };
