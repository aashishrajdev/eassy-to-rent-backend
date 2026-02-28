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

// In-memory store with cleanup (for production, use Redis)
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
    pass: process.env.SMTP_PASSWORD // Gmail App Password
  }
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});

// Debug endpoint to check SMTP configuration
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

    // Test SMTP connection if credentials exist
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      const testTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD
        }
      });

      await testTransporter.verify();
      config.connection = '✅ successful';
    } else {
      config.connection = '⏸️ skipped - missing credentials';
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      config: {
        hasEmail: !!process.env.SMTP_EMAIL,
        hasPassword: !!process.env.SMTP_PASSWORD,
        error: error.message
      }
    });
  }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    // Check if email exists in database (optional - uncomment if you have user model)
    // const user = await User.findOne({ email });
    // if (!user) {
    //   return res.status(404).json({ 
    //     success: false, 
    //     message: "Email not registered" 
    //   });
    // }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiration (5 minutes)
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      createdAt: new Date().toISOString()
    });

    console.log(`📧 Generated OTP for ${email}: ${otp}`); // For debugging

    // Send email
    const mailOptions = {
      from: `"PG Finder Admin" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: 'PG Finder Admin - Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #f0f0f0;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
            }
            .otp-box {
              background: #f3f4f6;
              padding: 20px;
              text-align: center;
              font-size: 36px;
              letter-spacing: 8px;
              font-weight: bold;
              border-radius: 8px;
              margin: 20px 0;
              color: #1e40af;
            }
            .details {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .warning {
              color: #dc2626;
              font-size: 14px;
              text-align: center;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 PG Finder Admin</h1>
            </div>
            
            <p>Hello Admin,</p>
            
            <p>You requested a One-Time Password (OTP) to log in to your PG Finder admin account.</p>
            
            <div class="otp-box">
              ${otp}
            </div>
            
            <div class="details">
              <p><strong>📧 Email:</strong> ${email}</p>
              <p><strong>⏰ Valid for:</strong> 5 minutes</p>
              <p><strong>📅 Requested at:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p><strong>Instructions:</strong></p>
            <ul>
              <li>Enter this OTP in the admin login form</li>
              <li>The OTP will expire after 5 minutes</li>
              <li>Don't share this OTP with anyone</li>
            </ul>
            
            <p class="warning">⚠️ If you didn't request this OTP, please ignore this email and ensure your account is secure.</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} PG Finder. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your PG Finder Admin OTP is: ${otp}. Valid for 5 minutes.`
    };

    await transporter.sendMail(mailOptions);

    // Don't send OTP in response in production
    const response = {
      success: true,
      message: `OTP sent successfully to ${email.replace(/(.{2})(.*)(?=@)/, '$1***')}`
    };

    // Include OTP in development mode for testing
    if (process.env.NODE_ENV === 'development') {
      response.debug = { otp };
      response.message += ` (Dev OTP: ${otp})`;
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    
    // Determine error type
    let errorMessage = 'Failed to send OTP';
    let statusCode = 500;

    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check SMTP credentials.';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Network error while sending email.';
    } else if (error.responseCode === 550) {
      errorMessage = 'Email address rejected.';
    }

    res.status(statusCode).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
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

    // Track attempts to prevent brute force
    stored.attempts = (stored.attempts || 0) + 1;
    if (stored.attempts > 5) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Too many failed attempts. Please request a new OTP.' 
      });
    }

    // Verify OTP
    if (stored.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP',
        attemptsLeft: 5 - stored.attempts
      });
    }

    // Success - delete OTP
    otpStore.delete(email);

    res.json({ 
      success: true, 
      message: 'OTP verified successfully',
      verified: true
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP' 
    });
  }
});

// Resend OTP (same as send-otp but with cooldown)
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    // Check if there's an existing OTP and its cooldown
    const existing = otpStore.get(email);
    if (existing) {
      const timeLeft = Math.ceil((existing.expiresAt - Date.now()) / 1000);
      if (timeLeft > 240) { // If more than 4 minutes left (1 minute cooldown)
        return res.status(429).json({
          success: false,
          message: `Please wait ${60 - (300 - timeLeft)} seconds before requesting a new OTP`
        });
      }
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store new OTP
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      createdAt: new Date().toISOString()
    });

    console.log(`📧 Resent OTP for ${email}: ${otp}`);

    // Send email (reuse mail options from send-otp)
    const mailOptions = {
      from: `"PG Finder Admin" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: 'PG Finder Admin - New Login OTP',
      html: `<h2>Your new OTP is: <b>${otp}</b></h2><p>Valid for 5 minutes.</p>`
    };

    await transporter.sendMail(mailOptions);

    const response = {
      success: true,
      message: `New OTP sent successfully to ${email.replace(/(.{2})(.*)(?=@)/, '$1***')}`
    };

    if (process.env.NODE_ENV === 'development') {
      response.debug = { otp };
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend OTP' 
    });
  }
});

// Get OTP status (for debugging)
router.get('/otp-status/:email', (req, res) => {
  const { email } = req.params;
  const stored = otpStore.get(email);

  if (!stored) {
    return res.json({
      exists: false,
      message: 'No active OTP found'
    });
  }

  const timeLeft = Math.ceil((stored.expiresAt - Date.now()) / 1000);
  
  res.json({
    exists: true,
    email,
    timeLeft: `${timeLeft} seconds`,
    expiresAt: new Date(stored.expiresAt).toISOString(),
    attempts: stored.attempts,
    createdAt: stored.createdAt
  });
});

module.exports = router;