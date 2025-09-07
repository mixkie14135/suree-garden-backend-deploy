const prisma = require('../../../config/prisma');

// GET /api/rooms/:room_id/images
exports.listRoomImages = async (req, res) => {
  try {
    const room_id = Number(req.params.room_id);
    if (!room_id) return res.status(400).json({ message: 'room_id invalid' });

    // ตรวจว่าห้องมีจริง
    const room = await prisma.room.findUnique({ where: { room_id } });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const images = await prisma.room_image.findMany({
      where: { room_id },
      orderBy: { image_id: 'asc' }
    });
    res.json({ room_id, images });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rooms/:room_id/images
// body: { image_url: string, description?: string }
exports.createRoomImage = async (req, res) => {
  try {
    const room_id = Number(req.params.room_id);
    const { image_url, description } = req.body;

    if (!room_id) return res.status(400).json({ message: 'room_id invalid' });
    if (!image_url) return res.status(400).json({ message: 'image_url required' });

    // ตรวจว่าห้องมีจริง
    const room = await prisma.room.findUnique({ where: { room_id } });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // (ออปชัน) จำกัดจำนวนรูปต่อห้อง เช่น 10 รูป
    const count = await prisma.room_image.count({ where: { room_id } });
    if (count >= 10) return res.status(400).json({ message: 'Image limit reached (10)' });

    const created = await prisma.room_image.create({
      data: { room_id, image_url, description: description || null }
    });

    res.status(201).json({ status: 'ok', data: created });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// DELETE /api/rooms/:room_id/images/:image_id
exports.deleteRoomImage = async (req, res) => {
  try {
    const room_id = Number(req.params.room_id);
    const image_id = Number(req.params.image_id);
    if (!room_id || !image_id) return res.status(400).json({ message: 'ids invalid' });

    // เช็คเจ้าของรูปให้ตรงห้อง
    const img = await prisma.room_image.findUnique({ where: { image_id } });
    if (!img || img.room_id !== room_id) {
      return res.status(404).json({ message: 'Image not found for this room' });
    }

    await prisma.room_image.delete({ where: { image_id } });
    res.json({ status: 'ok', message: `Image ${image_id} deleted` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// (ออปชัน) PUT /api/rooms/:room_id/images/:image_id
// body: { description?: string }
exports.updateRoomImage = async (req, res) => {
  try {
    const room_id = Number(req.params.room_id);
    const image_id = Number(req.params.image_id);
    const { description } = req.body;

    const img = await prisma.room_image.findUnique({ where: { image_id } });
    if (!img || img.room_id !== room_id) {
      return res.status(404).json({ message: 'Image not found for this room' });
    }

    const updated = await prisma.room_image.update({
      where: { image_id },
      data: { description: description ?? img.description }
    });
    res.json({ status: 'ok', data: updated });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
