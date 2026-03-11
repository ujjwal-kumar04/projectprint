const express = require('express');
const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/** Returns true if the string looks like an email address */
const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

// ── POST /api/auth/signup ─────────────────────────────────────────
// Self-registration for shopkeepers
router.post('/signup', async (req, res) => {
  try {
    let { name, shopName, emailOrPhone, email: extraEmail, password, confirmPassword } = req.body;

    // ── Validation ────────────────────────────────────────────────
    if (!name?.trim())
      return res.status(400).json({ message: 'Full name is required' });
    if (!shopName?.trim())
      return res.status(400).json({ message: 'Shop name is required' });
    if (!emailOrPhone?.trim())
      return res.status(400).json({ message: 'Email or mobile number is required' });
    if (!password || password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (confirmPassword !== undefined && password !== confirmPassword)
      return res.status(400).json({ message: 'Passwords do not match' });

    emailOrPhone = emailOrPhone.trim();
    const useEmail = isEmail(emailOrPhone);

    // ── Duplicate check ───────────────────────────────────────────
    const query = useEmail ? { email: emailOrPhone } : { phone: emailOrPhone };
    if (await User.findOne(query))
      return res.status(400).json({
        message: useEmail ? 'Email is already registered' : 'Mobile number is already registered'
      });

    // ── Create user ───────────────────────────────────────────────
    const userData = {
      name:     name.trim(),
      shopName: shopName.trim(),
      password,
      role:     'shopkeeper',
      isActive: true,
    };
    if (useEmail) userData.email = emailOrPhone;
    else {
      userData.phone = emailOrPhone;
      // If the user also provided an email address (optional when phone is primary)
      if (extraEmail?.trim()) {
        const cleanEmail = extraEmail.trim();
        if (!isEmail(cleanEmail))
          return res.status(400).json({ message: 'Please enter a valid email address' });
        if (await User.findOne({ email: cleanEmail }))
          return res.status(400).json({ message: 'That email is already registered' });
        userData.email = cleanEmail;
      }
    }

    const user = await User.create(userData);

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id:       user._id,
        name:     user.name,
        email:    user.email  || null,
        phone:    user.phone  || null,
        role:     user.role,
        shopId:   user.shopId,
        shopName: user.shopName,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { emailOrPhone, email: rawEmail, password } = req.body;
    // Accept either { emailOrPhone } (new format) or legacy { email } field
    const identifier = (emailOrPhone || rawEmail || '').trim();

    if (!identifier || !password)
      return res.status(400).json({ message: 'Email / mobile number and password are required' });

    // Look up by email OR phone
    const user = await User.findOne(
      isEmail(identifier)
        ? { email: identifier }
        : { $or: [{ phone: identifier }, { email: identifier }] }
    );

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.isActive)
      return res.status(403).json({ message: 'Account disabled. Contact the admin.' });

    res.json({
      token: generateToken(user._id),
      user: {
        id:       user._id,
        name:     user.name,
        email:    user.email  || null,
        phone:    user.phone  || null,
        role:     user.role,
        shopId:   user.shopId   || null,
        shopName: user.shopName || null,
      }
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  const { _id: id, name, email, phone, role, shopId, shopName } = req.user;
  res.json({ id, name, email: email || null, phone: phone || null, role, shopId, shopName });
});

// ── POST /api/auth/init-admin ─────────────────────────────────────
// Run ONCE to bootstrap the first admin account.
// Remove this route (or protect it) after first use.
router.post('/init-admin', async (req, res) => {
  try {
    const exists = await User.findOne({ role: 'admin' });
    if (exists) return res.status(400).json({ message: 'Admin already exists' });

    const { email = 'admin@photopass.com', password = 'Admin@123', name = 'Super Admin' } = req.body;
    await User.create({ name, email, password, role: 'admin' });
    res.json({ message: `Admin created. Email: ${email}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
