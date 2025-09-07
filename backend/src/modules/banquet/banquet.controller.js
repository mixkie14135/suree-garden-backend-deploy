const prisma = require('../../config/prisma');

// GET all banquet rooms
exports.getBanquets = async (req, res) => {
  try {
    const banquets = await prisma.banquet_room.findMany({
      include: { banquet_image: true }
    });
    res.json(banquets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET banquet by id
exports.getBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const banquet = await prisma.banquet_room.findUnique({
      where: { banquet_id: id },
      include: { banquet_image: true }
    });
    if (!banquet) return res.status(404).json({ message: 'Banquet not found' });
    res.json(banquet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE banquet
exports.createBanquet = async (req, res) => {
  try {
    const { name, capacity, price_per_hour, status, description } = req.body;
    if (!name || !capacity || !price_per_hour) {
      return res.status(400).json({ message: 'name, capacity, price_per_hour required' });
    }
    const created = await prisma.banquet_room.create({
      data: { name, capacity, price_per_hour: String(price_per_hour), status, description }
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE banquet
exports.updateBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, capacity, price_per_hour, status, description } = req.body;
    const data = {};
    if (name) data.name = name;
    if (capacity) data.capacity = capacity;
    if (price_per_hour) data.price_per_hour = String(price_per_hour);
    if (status) data.status = status;
    if (description) data.description = description;

    const updated = await prisma.banquet_room.update({
      where: { banquet_id: id },
      data
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Banquet not found' });
    }
    res.status(500).json({ error: err.message });
  }
};

// DELETE banquet
exports.deleteBanquet = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.banquet_room.delete({ where: { banquet_id: id } });
    res.json({ message: `Banquet ${id} deleted` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Banquet not found' });
    }
    res.status(500).json({ error: err.message });
  }
};
