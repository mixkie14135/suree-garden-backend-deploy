// src/modules/banquet/image/banquetImage.controller.js
const path = require('path');
const fs = require('fs');
const prisma = require('../../../config/prisma');
const { UPLOAD_ROOT } = require('../../../utils/uploadPaths');

function toPublicUrl(absPath) {
  const norm = absPath.replace(/\\/g, '/');
  const i = norm.lastIndexOf('/uploads/');
  return i >= 0 ? norm.substring(i) : null;
}

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
  const image_url = toPublicUrl(req.file.path) || `/uploads/banquets/${banquetId}/${req.file.filename}`;

  const created = await prisma.banquet_image.create({
    data: { banquet_id: banquetId, image_url, description }
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
    if (rec.image_url?.startsWith('/uploads/')) {
      const abs = path.join(UPLOAD_ROOT, rec.image_url.replace('/uploads/', ''));
      if (abs.startsWith(UPLOAD_ROOT) && fs.existsSync(abs)) fs.unlinkSync(abs);
    }
  } catch {}

  await prisma.banquet_image.delete({ where: { image_id: imageId } });
  res.json({ status: 'ok' });
};
