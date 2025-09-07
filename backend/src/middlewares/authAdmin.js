const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

exports.requireAdminAuth = (req, res, next) => {
  let token;

  // 1) จาก Authorization: Bearer <token>
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) token = auth.split(' ')[1];

  // 2) หรือจาก cookie 'token'
  if (!token && req.cookies && req.cookies.token) token = req.cookies.token;

  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    req.auth = decoded; // { adminId, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid/Expired token' });
  }
};
