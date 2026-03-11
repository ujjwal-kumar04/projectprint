const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/** Verify JWT and attach user to req.user */
exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) return res.status(401).json({ message: 'Authentication token missing' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);

    if (!user)          return res.status(401).json({ message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is disabled. Contact admin.' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/** Allow admin only */
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/** Allow shopkeeper only */
exports.shopkeeperOnly = (req, res, next) => {
  if (req.user?.role !== 'shopkeeper') {
    return res.status(403).json({ message: 'Shopkeeper access required' });
  }
  next();
};
