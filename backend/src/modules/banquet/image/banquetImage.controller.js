// backend/src/modules/banquet/image/banquetImage.controller.js
const prisma = require('../../../config/prisma');
const { uploadPublic, objectPathFromPublicUrl, PUB_BUCKET } = require('../../../utils/storage');
const { supabase } = require('../../../utils/supabase');

exports.listBanquetImages = async (req, res) => {
  const banquetId = Number(req.params.banquet_id);
  if (!Number.isInteger(banquetId) || banquetId <= 0) {
    return res.status(400).json({ status: 'error', message: 'invalid banquet_id' });
  }
  const images = await prisma.banquet_image.findMany({
    where: { banquet_id: banquetId },
    orderBy: { image_id: 'asc' }
  });
  res.json({ status: 'ok', data: images });
};

exports.createBanquetImage = async (req, res) => {
  const banquetId = Number(req.params.banquet_id);
  if (!Number.isInteger(banquetId) || banquetId <= 0) {
    return res.status(400).json({ status: 'error', message: 'invalid banquet_id' });
  }
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'file is required (field name: file)' });
  }

  const description = (req.body.description || '').trim() || null;

  const { publicUrl } = await uploadPublic({
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    folder: `banquets/${banquetId}`,
  });

  const created = await prisma.banquet_image.create({
    data: { banquet_id: banquetId, image_url: publicUrl, description }
  });

  res.status(201).json({ status: 'ok', data: created });
};

exports.updateBanquetImage = async (req, res) => {
  const imageId = Number(req.params.image_id);
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return res.status(400).json({ status: 'error', message: 'invalid image_id' });
  }
  const description = (req.body.description ?? '').toString().trim() || null;

  const updated = await prisma.banquet_image.update({
    where: { image_id: imageId },
    data: { description }
  });
  res.json({ status: 'ok', data: updated });
};

exports.deleteBanquetImage = async (req, res) => {
  const imageId = Number(req.params.image_id);
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return res.status(400).json({ status: 'error', message: 'invalid image_id' });
  }

  const rec = await prisma.banquet_image.findUnique({ where: { image_id: imageId } });
  if (!rec) return res.status(404).json({ status: 'error', message: 'image not found' });

  try {
    const objectPath = objectPathFromPublicUrl(rec.image_url);
    if (objectPath) {
      await supabase.storage.from(PUB_BUCKET).remove([objectPath]);
    }
  } catch (e) {
    console.warn('supabase remove failed:', e.message);
  }

  await prisma.banquet_image.delete({ where: { image_id: imageId } });
  res.json({ status: 'ok' });
};
