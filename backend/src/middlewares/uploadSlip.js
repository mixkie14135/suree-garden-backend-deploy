// backend/src/middlewares/uploadSlip.js
const multer = require('multer');

function fileFilter(req, file, cb) {
  const ok = ['image/jpeg','image/png','image/webp','image/heic','image/jpg','application/pdf'].includes(file.mimetype);
  cb(ok ? null : new Error('Invalid file type. Only jpg, png, webp, heic, pdf are allowed.'), ok);
}

const limits = { fileSize: 5 * 1024 * 1024 };

const uploadSlip = multer({ storage: multer.memoryStorage(), fileFilter, limits });
module.exports = { uploadSlip };
