const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

const protect = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return errorResponse(res, {
      statusCode: 500,
      message: 'JWT configuration error',
    });
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Not authorized, no token',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'User not found',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Not authorized, token invalid',
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  return errorResponse(res, {
    statusCode: 403,
    message: 'Admin access required',
  });
};

const ownerOrAdmin = (req, res, next) => {
  if (req.user && ['owner', 'admin'].includes(req.user.role)) {
    return next();
  }

  return errorResponse(res, {
    statusCode: 403,
    message: 'Owner or admin access required',
  });
};

module.exports = { protect, adminOnly, ownerOrAdmin };

