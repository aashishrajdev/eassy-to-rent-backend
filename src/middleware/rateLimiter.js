const rateLimit = require('express-rate-limit');

// Stricter rate limit for auth routes (register/login)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth requests from this IP, please try again later',
    data: {},
  },
});

// Even stricter for login to mitigate brute-force attempts
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
    data: {},
  },
});

module.exports = {
  authRateLimiter,
  loginRateLimiter,
};

