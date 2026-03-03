const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const authController = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// ================= PUBLIC AUTH ROUTES =================
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/init-admin', authController.createDefaultAdmin);
router.post('/reset-admin', authController.resetAdmin);
router.get('/debug', authController.debugAuth);

// ================= PROTECTED ROUTES =================
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);

// ================= ADMIN ROUTES =================
router.get('/users', protect, adminOnly, authController.getUsers);
router.get('/users/:id', protect, adminOnly, authController.getUserById);
router.delete('/users/:id', protect, adminOnly, authController.deleteUser);
router.put('/users/:id/status', protect, adminOnly, authController.updateUserStatus);

// ================= OTP SYSTEM (COMMENTED FOR LATER USE) =================

/*
// In-memory store
const otpStore = new Map();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
      console.log(`Cleaned up expired OTP for ${email}`);
    }
  }
}, 5 * 60 * 1000);

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

// Debug SMTP endpoint
router.get('/debug-smtp', async (req, res) => {
  try {
    const config = {
      hasEmail: !!process.env.SMTP_EMAIL,
      hasPassword: !!process.env.SMTP_PASSWORD,
      emailConfigured: process.env.SMTP_EMAIL ? '✅ configured' : '❌ missing',
      passwordConfigured: process.env.SMTP_PASSWORD ? '✅ configured' : '❌ missing',
      smtpService: 'gmail',
      nodeEnv: process.env.NODE_ENV || 'development'
    };

    // Test SMTP connection
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      await transporter.verify();
      config.connection = '✅ successful';
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  console.log('📨 Send OTP endpoint hit');
  console.log('Request body:', req.body);
  
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated OTP for ${email}: ${otp}`);

    // Store OTP
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0
    });

    // Send email
    const mailOptions = {
      from: `"PG Finder Admin" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: 'PG Finder Admin - Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb; text-align: center;">PG Finder Admin Login</h2>
          <p>Your OTP for login is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 36px; letter-spacing: 8px; font-weight: bold; border-radius: 8px; margin: 20px 0; color: #1e40af;">
            ${otp}
          </div>
          <p>This OTP is valid for <strong>5 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px; text-align: center;">PG Finder Admin Panel</p>
        </div>
      `,
      text: `Your PG Finder Admin OTP is: ${otp}. Valid for 5 minutes.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);

    // Return success
    const response = {
      success: true,
      message: `OTP sent successfully to ${email.replace(/(.{2})(.*)(?=@)/, '$1***')}`
    };

    // Include OTP in development
    if (process.env.NODE_ENV === 'development') {
      response.debug = { otp };
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
  console.log('🔐 Verify OTP endpoint hit');
  console.log('Request body:', req.body);
  
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    const stored = otpStore.get(email);

    if (!stored) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP not found or expired. Please request a new one.' 
      });
    }

    // Check expiration
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Verify OTP
    if (stored.otp !== otp) {
      stored.attempts = (stored.attempts || 0) + 1;
      if (stored.attempts >= 5) {
        otpStore.delete(email);
        return res.status(400).json({ 
          success: false, 
          message: 'Too many failed attempts. Please request a new OTP.' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP',
        attemptsLeft: 5 - stored.attempts
      });
    }

    // Success
    otpStore.delete(email);
    res.json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP' 
    });
  }
});

// Test endpoint
router.post('/test-send-otp', async (req, res) => {
  console.log('🔍 TEST ENDPOINT HIT');
  console.log('Request body:', req.body);
  
  res.json({ 
    success: true, 
    message: 'Test endpoint working',
    receivedEmail: req.body.email 
  });
});
*/

console.log('🔥🔥🔥 AUTH ROUTES FILE IS BEING LOADED! 🔥🔥🔥');
console.log('Routes registered in this file:');
console.log('  - POST /register');
console.log('  - POST /login');
console.log('  - POST /init-admin');
console.log('  - GET /profile');
console.log('  - PUT /profile');
console.log('  - GET /users');
console.log('  - GET /debug');
console.log('  - (OTP routes are commented out for now)');

module.exports = router;