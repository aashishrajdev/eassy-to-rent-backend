// routes/auth.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const authController = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  authRateLimiter,
  loginRateLimiter,
} = require('../middleware/rateLimiter');

// ================= RATE LIMIT =================
router.use(authRateLimiter);

// ================= AUTH ROUTES =================
router.post('/register', authController.register);
router.post('/login', loginRateLimiter, authController.login);

router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);

router.post('/init-admin', authController.createDefaultAdmin);
router.get('/users', protect, adminOnly, authController.getUsers);
router.get('/debug', authController.debugAuth);

// ================= OTP SYSTEM =================

// ⚠ In production use Redis instead of Map
const otpStore = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD // Gmail App Password
  }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: 'PG Finder Admin - Login OTP',
      html: `<h2>Your OTP is: <b>${otp}</b></h2><p>Valid for 5 minutes.</p>`
    });

    res.json({ success: true, message: 'OTP sent successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  const stored = otpStore.get(email);

  if (!stored) {
    return res.status(400).json({ success: false, message: 'OTP not found' });
  }

  if (stored.otp !== otp || Date.now() > stored.expiresAt) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  otpStore.delete(email);

  res.json({ success: true, message: 'OTP verified successfully' });
});

module.exports = router;