const prisma = require('../../../config/prisma');

// GET /api/banquets/:banquet_id/images
exports.listBanquetImages = async (req, res) => {
  try {
    const banquet_id = Number(req.params.banquet_id);
    if (!banquet_id) return res.status(400).json({ message: 'banquet_id invalid' });

    const banquet = await prisma.banquet_room.findUnique({ where: { banquet_id } });
    if (!banquet) return res.status(404).json({ message: 'Banquet room not found' });

    const images = await prisma.banquet_image.findMany({
      where: { banquet_id },
      orderBy: { image_id: 'asc' }
    });
    res.json({ banquet_id, images });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/banquets/:banquet_id/images
// body: { image_url: string, description?: string }
exports.createBanquetImage = async (req, res) => {
  try {
    const banquet_id = Number(req.params.banquet_id);
    const { image_url, description } = req.body;

    if (!banquet_id) return res.status(400).json({ message: 'banquet_id invalid' });
    if (!image_url) return res.status(400).json({ message: 'image_url required' });

    const banquet = await prisma.banquet_room.findUnique({ where: { banquet_id } });
    if (!banquet) return res.status(404).json({ message: 'Banquet room not found' });

    // จำกัดจำนวนรูปต่อห้องจัดเลี้ยง (ตัวอย่าง 10 รูป)
    const count = await prisma.banquet_image.count({ where: { banquet_id } });
    if (count >= 10) return res.status(400).json({ message: 'Image limit reached (10)' });

    const created = await prisma.banquet_image.create({
      data: { banquet_id, image_url, description: description || null }
    });

    res.status(201).json({ status: 'ok', data: created });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// PUT /api/banquets/:banquet_id/images/:image_id
// body: { description?: string }
exports.updateBanquetImage = async (req, res) => {
  try {
    const banquet_id = Number(req.params.banquet_id);
    const image_id = Number(req.params.image_id);
    const { description } = req.body;

    const img = await prisma.banquet_image.findUnique({ where: { image_id } });
    if (!img || img.banquet_id !== banquet_id) {
      return res.status(404).json({ message: 'Image not found for this banquet room' });
    }

    const updated = await prisma.banquet_image.update({
      where: { image_id },
      data: { description: description ?? img.description }
    });
    res.json({ status: 'ok', data: updated });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// DELETE /api/banquets/:banquet_id/images/:image_id
exports.deleteBanquetImage = async (req, res) => {
  try {
    const banquet_id = Number(req.params.banquet_id);
    const image_id = Number(req.params.image_id);

    const img = await prisma.banquet_image.findUnique({ where: { image_id } });
    if (!img || img.banquet_id !== banquet_id) {
      return res.status(404).json({ message: 'Image not found for this banquet room' });
    }

    await prisma.banquet_image.delete({ where: { image_id } });
    res.json({ status: 'ok', message: `Image ${image_id} deleted` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
