const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    // Organise uploads per shop for easy cleanup later
    const shopId = req.body.shopId || 'unknown';
    const dir    = path.join(__dirname, '../uploads', shopId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, suffix + path.extname(file.originalname));
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP images and PDF files are allowed'), false);
  }
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});
