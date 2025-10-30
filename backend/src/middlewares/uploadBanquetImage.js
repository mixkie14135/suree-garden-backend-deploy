// backend/src/middlewares/uploadBanquetImage.js
const multer = require('multer');

function fileFilter(req, file, cb) {
  const ok = ['image/jpeg','image/png','image/webp','image/heic','image/jpg'].includes(file.mimetype);
  cb(ok ? null : new Error('Invalid file type. Only jpg, png, webp, heic are allowed.'), ok);
}

const limits = { fileSize: 5 * 1024 * 1024 };

const uploadBanquetImage = multer({ storage: multer.memoryStorage(), fileFilter, limits });
module.exports = { uploadBanquetImage };
