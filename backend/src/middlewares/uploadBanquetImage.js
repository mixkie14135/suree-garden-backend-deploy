// src/middlewares/uploadBanquetImage.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_ROOT } = require('../utils/uploadPaths');

const BANQUET_BASE = path.join(UPLOAD_ROOT, 'banquets');
fs.mkdirSync(BANQUET_BASE, { recursive: true });

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg' : '.jpg',
  'image/png' : '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = path.join(BANQUET_BASE, String(req.params.banquet_id));
    fs.mkdirSync(subDir, { recursive: true });
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    let ext = (path.extname(file.originalname || '') || '').toLowerCase();
    if (!ext) ext = EXT_BY_MIME[file.mimetype] || '.jpg';
    const name = `banquet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

function fileFilter(req, file, cb) {
  const ok = ['image/jpeg','image/png','image/webp','image/heic','image/jpg'].includes(file.mimetype);
  cb(ok ? null : new Error('Invalid file type. Only jpg, png, webp, heic are allowed.'), ok);
}

const limits = { fileSize: 5 * 1024 * 1024 };

const uploadBanquetImage = multer({ storage, fileFilter, limits });
module.exports = { uploadBanquetImage };
