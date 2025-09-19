const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ดึงเฉพาะ UPLOAD_ROOT มาก็พอ (ไฟล์ของคุณมีแน่)
const { UPLOAD_ROOT } = require('../utils/uploadPaths');

// คำนวณโฟลเดอร์หลักของรูปห้องแบบ self-contained
const ROOM_BASE = path.join(UPLOAD_ROOT, 'rooms');
// สร้างโฟลเดอร์หลักไว้ก่อน (เช่น .../uploads/rooms)
fs.mkdirSync(ROOM_BASE, { recursive: true });

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg' : '.jpg',
  'image/png' : '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // แยกโฟลเดอร์ตาม room_id
    const subDir = path.join(ROOM_BASE, String(req.params.room_id));
    fs.mkdirSync(subDir, { recursive: true });
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    let ext = (path.extname(file.originalname || '') || '').toLowerCase();
    if (!ext) ext = EXT_BY_MIME[file.mimetype] || '.jpg';
    const name = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

function fileFilter(req, file, cb) {
  const ok = ['image/jpeg','image/png','image/webp','image/heic','image/jpg'].includes(file.mimetype);
  cb(ok ? null : new Error('Invalid file type. Only jpg, png, webp, heic are allowed.'), ok);
}

const limits = { fileSize: 5 * 1024 * 1024 };

const uploadRoomImage = multer({ storage, fileFilter, limits });
module.exports = { uploadRoomImage };
