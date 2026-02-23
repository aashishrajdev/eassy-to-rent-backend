const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/response');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const rawName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const rawEmail =
      typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const rawPassword =
      typeof req.body.password === 'string' ? req.body.password.trim() : '';
    const role = req.body.role || 'user';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : undefined;

    // Basic validation
    if (!rawName || !rawEmail || !rawPassword) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Please provide name, email and password',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Please provide a valid email address',
      });
    }

    if (rawPassword.length < 8) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Password must be at least 8 characters long',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: rawEmail });
    if (userExists) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({
      name: rawName,
      email: rawEmail,
      password: rawPassword,
      role,
      phone,
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    return successResponse(res, {
      statusCode: 201,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        token,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const rawEmail =
      typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const rawPassword =
      typeof req.body.password === 'string' ? req.body.password.trim() : '';

    // Validation
    if (!rawEmail || !rawPassword) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Please provide email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email: rawEmail }).select('+password');

    if (!user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Account is not active. Please contact support.',
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return successResponse(res, {
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        token,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found',
      });
    }

    return successResponse(res, {
      message: 'Profile fetched successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found',
      });
    }

    // Update fields
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;

    // If password is provided, update it
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    // Generate new token if email was changed
    const token = generateToken(updatedUser._id, updatedUser.role);

    return successResponse(res, {
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        token,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Create default admin user
// @route   POST /api/auth/init-admin
// @access  Public (only for initial setup - disable in production)
exports.createDefaultAdmin = async (req, res, next) => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Admin user already exists',
        errors: {
          email: adminExists.email,
          role: adminExists.role,
        },
      });
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@pgfinder.com',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      phone: '+919876543210'
    });

    // Generate token
    const token = generateToken(admin._id, admin.role);

    return successResponse(res, {
      statusCode: 201,
      message: 'Default admin created successfully',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password');
    return successResponse(res, {
      message: 'Users fetched successfully',
      data: {
        count: users.length,
        items: users,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Debug endpoint to check authentication
// @route   GET /api/auth/debug
// @access  Public
exports.debugAuth = (req, res) =>
  successResponse(res, {
    message: 'Auth debug endpoint',
    data: {
      headers: req.headers,
      timestamp: new Date().toISOString(),
    },
  });