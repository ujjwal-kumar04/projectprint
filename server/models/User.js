const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  // email OR phone is required — validated at the route level
  email:    { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone:    { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  role:     { type: String, enum: ['admin', 'shopkeeper'], default: 'shopkeeper' },

  // Shopkeeper-specific fields
  shopId:   { type: String, unique: true, sparse: true },
  shopName: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Auto-generate shopId for shopkeepers; hash password on save
userSchema.pre('save', async function (next) {
  if (this.isNew && this.role === 'shopkeeper' && !this.shopId) {
    this.shopId = uuidv4();
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

userSchema.methods.comparePassword = function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

// Never return password in JSON
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
