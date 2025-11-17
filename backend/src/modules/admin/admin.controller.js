const prisma = require('../../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const USE_COOKIE = process.env.AUTH_COOKIE === 'true'; // จะเป็น false ตาม .env

// POST /api/admin/login
exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'username & password required' });

    const admin = await prisma.admin.findUnique({
      where: { username },
      select: { admin_id: true, username: true, password: true, full_name: true, email: true }
    });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { adminId: admin.admin_id, username: admin.username, role: 'admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const safeAdmin = {
      admin_id: admin.admin_id,
      username: admin.username,
      full_name: admin.full_name,
      email: admin.email
    };

    if (USE_COOKIE) {
      // ไม่ต้องใช้ เพราะเราใช้ Bearer token
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      return res.json({ status: 'ok', admin: safeAdmin });
    }

    // ส่ง token ให้ frontend จัดการเก็บเอง (localStorage)
    return res.json({ status: 'ok', token, admin: safeAdmin });

  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET /api/admin/me   (ต้องมี auth)
exports.getMe = async (req, res) => {
  try {
    const me = await prisma.admin.findUnique({
      where: { admin_id: req.auth.adminId },
      select: { admin_id: true, username: true, full_name: true, email: true, phone: true, created_at: true, updated_at: true }
    });
    if (!me) return res.status(404).json({ message: 'Admin not found' });
    res.json(me);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// POST /api/admin/logout
exports.logoutAdmin = async (_req, res) => {
  try {
    // ถ้า USE_COOKIE เป็น false frontend จะลบ token เอง
    return res.json({ status: 'ok', message: 'Client should discard token' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
