const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const Upload  = require('../models/Upload');
const { protect, shopkeeperOnly } = require('../middleware/auth');

// All routes require shopkeeper authentication
router.use(protect, shopkeeperOnly);

// ── GET /api/shopkeeper/profile ───────────────────────────────────
router.get('/profile', (req, res) => {
  const { name, email, shopName, shopId, phone } = req.user;
  res.json({ name, email, shopName, shopId, phone });
});

// ── GET /api/shopkeeper/uploads ───────────────────────────────────
// Returns ONLY this shopkeeper's uploads (data isolation enforced by shopId)
router.get('/uploads', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [uploads, total] = await Promise.all([
      Upload.find({ shopId: req.user.shopId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Upload.countDocuments({ shopId: req.user.shopId })
    ]);

    res.json({ uploads, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/shopkeeper/uploads/:id ───────────────────────────
router.delete('/uploads/:id', async (req, res) => {
  try {
    // shopId filter ensures a shopkeeper can only delete their own uploads
    const upload = await Upload.findOne({ _id: req.params.id, shopId: req.user.shopId });
    if (!upload) return res.status(404).json({ message: 'Upload not found' });

    const absPath = path.join(__dirname, '..', upload.filePath);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

    await upload.deleteOne();
    res.json({ message: 'Deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
