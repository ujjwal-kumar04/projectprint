const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  shopId:       { type: String, required: true, index: true },
  customerName: { type: String, required: true, trim: true },
  filePath:     { type: String, required: true },           // relative URL path
  fileType:     { type: String, enum: ['image', 'pdf'], required: true },
  originalName: { type: String },
  mimeType:     { type: String },
  fileSize:     { type: Number },                            // bytes
  status:       { type: String, enum: ['pending', 'processed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Upload', uploadSchema);
