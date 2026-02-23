const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  authRateLimiter,
  loginRateLimiter,
} = require('../middleware/rateLimiter');

// Apply general auth rate limit to all auth routes
router.use(authRateLimiter);

router.post('/register', authController.register);
router.post('/login', loginRateLimiter, authController.login);

router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);

router.post('/init-admin', authController.createDefaultAdmin);
router.get('/users', protect, adminOnly, authController.getUsers);
router.get('/debug', authController.debugAuth);

module.exports = router;