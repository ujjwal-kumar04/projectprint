const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Upload  = require('../models/Upload');
const { protect, adminOnly } = require('../middleware/auth');

// All routes in this file require admin authentication
router.use(protect, adminOnly);

// ── GET /api/admin/stats ──────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [total, active, totalUploads, todayUploads] = await Promise.all([
      User.countDocuments({ role: 'shopkeeper' }),
      User.countDocuments({ role: 'shopkeeper', isActive: true }),
      Upload.countDocuments(),
      Upload.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } })
    ]);
    res.json({ total, active, totalUploads, todayUploads });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/admin/shopkeepers ────────────────────────────────────
router.get('/shopkeepers', async (_req, res) => {
  try {
    const shopkeepers = await User.find({ role: 'shopkeeper' }).sort({ createdAt: -1 });
    // attach upload counts
    const data = await Promise.all(
      shopkeepers.map(async (sk) => {
        const uploadCount = await Upload.countDocuments({ shopId: sk.shopId });
        return { ...sk.toJSON(), uploadCount };
      })
    );
    res.json(data);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/admin/shopkeepers ───────────────────────────────────
router.post('/shopkeepers', async (req, res) => {
  try {
    const { name, email, password, shopName, phone } = req.body;
    if (!name || !email || !password || !shopName)
      return res.status(400).json({ message: 'name, email, password and shopName are required' });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email is already registered' });

    const sk = await User.create({ name, email, password, shopName, phone, role: 'shopkeeper' });
    res.status(201).json(sk.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/admin/shopkeepers/:id/toggle ───────────────────────
router.patch('/shopkeepers/:id/toggle', async (req, res) => {
  try {
    const sk = await User.findOne({ _id: req.params.id, role: 'shopkeeper' });
    if (!sk) return res.status(404).json({ message: 'Shopkeeper not found' });
    sk.isActive = !sk.isActive;
    await sk.save();
    res.json({ isActive: sk.isActive });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/admin/shopkeepers/:id ────────────────────────────
router.delete('/shopkeepers/:id', async (req, res) => {
  try {
    const sk = await User.findOne({ _id: req.params.id, role: 'shopkeeper' });
    if (!sk) return res.status(404).json({ message: 'Shopkeeper not found' });

    await Upload.deleteMany({ shopId: sk.shopId });
    await sk.deleteOne();
    res.json({ message: 'Shopkeeper and all related uploads deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
