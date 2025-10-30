// backend/src/modules/room/image/roomImage.controller.js
const prisma = require('../../../config/prisma');
const { uploadPublic, objectPathFromPublicUrl, PUB_BUCKET } = require('../../../utils/storage');
const { supabase } = require('../../../utils/supabase');

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

  const { publicUrl } = await uploadPublic({
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    folder: `rooms/${roomId}`,
  });

  const created = await prisma.room_image.create({
    data: { room_id: roomId, image_url: publicUrl, description }
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

  const rec = await prisma.room_image.findUnique({ where: { image_id: imageId } });
  if (!rec) return res.status(404).json({ status: 'error', message: 'image not found' });

  // พยายามลบไฟล์ออกจาก Supabase ด้วย (ถ้าเป็น public URL ของเรา)
  try {
    const objectPath = objectPathFromPublicUrl(rec.image_url);
    if (objectPath) {
      await supabase.storage.from(PUB_BUCKET).remove([objectPath]);
    }
  } catch (e) {
    console.warn('supabase remove failed:', e.message);
  }

  await prisma.room_image.delete({ where: { image_id: imageId } });
  res.json({ status: 'ok' });
};
