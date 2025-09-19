// controllers/roomImage.controller.js
const path = require('path');
const fs = require('fs');
const prisma = require('../../../config/prisma');
const { UPLOAD_ROOT } = require('../../../utils/uploadPaths');

function toPublicUrl(absPath) {
  // แปลง path บนดิสก์ไปเป็น /uploads/...
  const uploadsIdx = absPath.replace(/\\/g,'/').lastIndexOf('/uploads/');
  if (uploadsIdx >= 0) return absPath.replace(/\\/g,'/').substring(uploadsIdx);
  return null;
}

exports.listRoomImages = async (req, res) => {
  const roomId = Number(req.params.room_id);
  if (!Number.isInteger(roomId) || roomId <= 0) {
    return res.status(400).json({ status: 'error', message: 'invalid room_id' });
  }
  const images = await prisma.room_image.findMany({
    where: { room_id: roomId },
    orderBy: { image_id: 'asc' }
  });
  res.json({ status: 'ok', data: images });
};

exports.createRoomImage = async (req, res) => {
  const roomId = Number(req.params.room_id);
  if (!Number.isInteger(roomId) || roomId <= 0) {
    return res.status(400).json({ status: 'error', message: 'invalid room_id' });
  }
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'file is required (field name: file)' });
  }

  const description = (req.body.description || '').trim() || null;

  // สร้าง public url (เสิร์ฟด้วย app.use('/uploads', ...))
  let imageUrl = toPublicUrl(req.file.path);
  if (!imageUrl) {
    // fallback เผื่อโครงสร้าง path ต่าง: /uploads/rooms/:room_id/:filename
    imageUrl = `/uploads/rooms/${roomId}/${req.file.filename}`;
  }

  const created = await prisma.room_image.create({
    data: {
      room_id: roomId,
      image_url: imageUrl,
      description
    }
  });

  res.status(201).json({ status: 'ok', data: created });
};

exports.updateRoomImage = async (req, res) => {
  const imageId = Number(req.params.image_id);
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return res.status(400).json({ status: 'error', message: 'invalid image_id' });
  }
  const desc = (req.body.description ?? '').toString().trim() || null;

  const updated = await prisma.room_image.update({
    where: { image_id: imageId },
    data: { description: desc }
  });
  res.json({ status: 'ok', data: updated });
};

exports.deleteRoomImage = async (req, res) => {
  const imageId = Number(req.params.image_id);
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return res.status(400).json({ status: 'error', message: 'invalid image_id' });
  }

  // หา record เพื่อลบไฟล์จริง (ตัวเลือก)
  const rec = await prisma.room_image.findUnique({ where: { image_id: imageId } });
  if (!rec) return res.status(404).json({ status: 'error', message: 'image not found' });

  // พยายามลบไฟล์จริง (ถ้าอยู่ภายใต้ UPLOAD_ROOT)
  try {
    if (rec.image_url?.startsWith('/uploads/')) {
      const abs = path.join(UPLOAD_ROOT, rec.image_url.replace('/uploads/', ''));
      if (abs.startsWith(UPLOAD_ROOT) && fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    }
  } catch {}

  await prisma.room_image.delete({ where: { image_id: imageId } });
  res.json({ status: 'ok' });
};
