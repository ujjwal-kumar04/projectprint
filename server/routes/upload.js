const express = require('express');
const router  = express.Router();
const Upload  = require('../models/Upload');
const User    = require('../models/User');
const { upload } = require('../middleware/multer');

// ── GET /api/upload/verify/:shopId ────────────────────────────────
// Called by the customer page to verify a shopId before showing the form
router.get('/verify/:shopId', async (req, res) => {
  try {
    const shop = await User.findOne({
      shopId: req.params.shopId,
      role: 'shopkeeper',
      isActive: true
    });
    if (!shop) return res.status(404).json({ valid: false, message: 'Invalid or inactive shop' });
    res.json({ valid: true, shopName: shop.shopName });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/upload ──────────────────────────────────────────────
// Public route — customer submits name + photo/PDF
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { shopId, customerName } = req.body;

    if (!shopId || !customerName?.trim())
      return res.status(400).json({ message: 'shopId and customerName are required' });
    if (!req.file)
      return res.status(400).json({ message: 'A photo or PDF file is required' });

    // Validate the shopId is real and active
    const shop = await User.findOne({ shopId, role: 'shopkeeper', isActive: true });
    if (!shop) return res.status(404).json({ message: 'Invalid or inactive shop' });

    const fileType    = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
    // Store a URL-friendly relative path
    const relativePath = `uploads/${shopId}/${req.file.filename}`;

    const doc = await Upload.create({
      shopId,
      customerName: customerName.trim(),
      filePath:     relativePath,
      fileType,
      originalName: req.file.originalname,
      mimeType:     req.file.mimetype,
      fileSize:     req.file.size,
    });

    // Push real-time notification to shopkeeper's socket room
    const io = req.app.get('io');
    if (io) {
      io.to(shopId).emit('new-upload', {
        _id:          doc._id,
        customerName: doc.customerName,
        filePath:     doc.filePath,
        fileType:     doc.fileType,
        createdAt:    doc.createdAt,
      });
    }

    res.status(201).json({ message: 'Upload successful! Thank you.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed. Please try again.' });
  }
});

module.exports = router;
