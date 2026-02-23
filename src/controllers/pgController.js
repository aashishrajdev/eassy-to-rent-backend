const PGListing = require('../models/PGListing');
const User = require('../models/User');
const Review = require('../models/Review');
const logger = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');
const { uploadImage, uploadGalleryImages } = require('../utils/cloudinary');

// @desc    Get all PG listings
// @route   GET /api/pg
// @access  Public
exports.getPGListings = async (req, res, next) => {
  try {
    logger.info('Get PG listings request', { query: req.query });

    const { 
      type, 
      published, 
      featured, 
      verified, 
      search,
      minPrice,
      maxPrice,
      city,
      availability,
      sort = '-createdAt',
      page = 1,
      limit = 20
    } = req.query;
    
    let query = {};
    
    // Build query
    if (type && type !== 'all') query.type = type;
    if (published === 'true') query.published = true;
    if (published === 'false') query.published = false;
    if (featured === 'true') query.featured = true;
    if (verified === 'true') query.verified = true;
    if (city) query.city = new RegExp(city, 'i');
    if (availability) query.availability = availability;
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const listings = await PGListing.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await PGListing.countDocuments(query);

    return successResponse(res, {
      statusCode: 200,
      message: 'PG listings fetched successfully',
      data: {
        count: listings.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        items: listings,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get single PG listing
// @route   GET /api/pg/:id
// @access  Public
exports.getPGListing = async (req, res, next) => {
  try {
    const listing = await PGListing.findById(req.params.id);
    
    if (!listing) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'PG listing not found',
      });
    }
    return successResponse(res, {
      message: 'PG listing fetched successfully',
      data: listing,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid listing ID',
      });
    }
    return next(error);
  }
};

// @desc    Create PG listing
// @route   POST /api/pg
// @access  Private/Admin
exports.createPGListing = async (req, res, next) => {
  try {
    logger.info('Create listing request', {
      user: req.user && req.user.email,
    });

    const rawImages = Array.isArray(req.body.images) ? req.body.images : [];
    const rawGallery = Array.isArray(req.body.gallery) ? req.body.gallery : [];

    // Upload main image (first) and gallery to Cloudinary
    const [primaryImageUrl, galleryUrls] = await Promise.all([
      rawImages.length > 0 ? uploadImage(rawImages[0]) : null,
      uploadGalleryImages(rawGallery),
    ]);

    const images = [];
    if (primaryImageUrl) {
      images.push(primaryImageUrl);
    }

    // Add default values if not provided
    const listingData = {
      ...req.body,
      images,
      gallery: galleryUrls,
      published: req.body.published || false,
      verified: req.body.verified || false,
      featured: req.body.featured || false,
      ownerName: req.body.ownerName || req.user.name,
      ownerEmail: req.body.ownerEmail || req.user.email,
    };

    const listing = await PGListing.create(listingData);

    return successResponse(res, {
      statusCode: 201,
      message: 'PG listing created successfully',
      data: listing,
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return errorResponse(res, {
        statusCode: 400,
        message: 'Validation error',
        errors: messages,
      });
    }
    
    // Handle duplicate slug error
    if (error.code === 11000) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Listing with this name already exists',
      });
    }
    return next(error);
  }
};

// @desc    Update PG listing
// @route   PUT /api/pg/:id
// @access  Private/Admin
exports.updatePGListing = async (req, res, next) => {
  try {
    let listing = await PGListing.findById(req.params.id);

    if (!listing) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'PG listing not found',
      });
    }

    const updatePayload = { ...req.body };

    // Optional image updates
    if (Array.isArray(req.body.images) && req.body.images.length > 0) {
      const url = await uploadImage(req.body.images[0]);
      updatePayload.images = url ? [url] : listing.images;
    }

    if (Array.isArray(req.body.gallery) && req.body.gallery.length > 0) {
      const galleryUrls = await uploadGalleryImages(req.body.gallery);
      if (galleryUrls.length > 0) {
        updatePayload.gallery = galleryUrls;
      }
    }

    updatePayload.updatedAt = Date.now();

    listing = await PGListing.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      {
        new: true,
        runValidators: true,
      }
    );

    return successResponse(res, {
      message: 'PG listing updated successfully',
      data: listing,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return errorResponse(res, {
        statusCode: 400,
        message: 'Validation error',
        errors: messages,
      });
    }
    
    if (error.name === 'CastError') {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid listing ID',
      });
    }
    return next(error);
  }
};

// @desc    Delete PG listing
// @route   DELETE /api/pg/:id
// @access  Private/Admin
exports.deletePGListing = async (req, res, next) => {
  try {
    const listing = await PGListing.findById(req.params.id);
    
    if (!listing) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'PG listing not found',
      });
    }
    
    await listing.deleteOne();
    
    return successResponse(res, {
      message: 'PG listing deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid listing ID',
      });
    }
    return next(error);
  }
};

// @desc    Toggle listing status
// @route   PATCH /api/pg/:id/toggle-status
// @access  Private/Admin
exports.toggleStatus = async (req, res, next) => {
  try {
    const { field } = req.body;
    const validFields = ['published', 'featured', 'verified'];
    
    if (!field || !validFields.includes(field)) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Invalid field. Must be one of: ${validFields.join(', ')}`,
      });
    }
    
    const listing = await PGListing.findById(req.params.id);
    
    if (!listing) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'PG listing not found',
      });
    }
    
    // Toggle the field
    listing[field] = !listing[field];
    listing.updatedAt = Date.now();
    
    await listing.save();
    
    return successResponse(res, {
      message: `${field} status updated`,
      data: listing,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid listing ID',
      });
    }
    return next(error);
  }
};

// @desc    Get PG statistics
// @route   GET /api/pg/stats
// @access  Private/Admin
exports.getStats = async (req, res, next) => {
  try {
    const total = await PGListing.countDocuments();
    const published = await PGListing.countDocuments({ published: true });
    const featured = await PGListing.countDocuments({ featured: true });
    const verified = await PGListing.countDocuments({ verified: true });
    
    const boys = await PGListing.countDocuments({ type: 'boys' });
    const girls = await PGListing.countDocuments({ type: 'girls' });
    const coed = await PGListing.countDocuments({ type: 'co-ed' });
    
    return successResponse(res, {
      message: 'PG statistics fetched successfully',
      data: {
        total,
        published,
        draft: total - published,
        featured,
        verified,
        boys,
        girls,
        coed,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Search PG listings
// @route   GET /api/pg/search
// @access  Public
exports.searchPGListings = async (req, res, next) => {
  try {
    const { q, location, type } = req.query;
    
    let query = {};
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (location) {
      query.$or = query.$or || [];
      query.$or.push(
        { address: { $regex: location, $options: 'i' } },
        { city: { $regex: location, $options: 'i' } }
      );
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    query.published = true;
    
    const listings = await PGListing.find(query).sort('-createdAt').limit(20);

    return successResponse(res, {
      message: 'Search completed',
      data: {
        count: listings.length,
        items: listings,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ========== Wishlist ==========

// @desc    Add PG to wishlist
// @route   POST /api/pg/:id/wishlist
// @access  Private
exports.addToWishlist = async (req, res, next) => {
  try {
    const pgId = req.params.id;

    const listing = await PGListing.findById(pgId);
    if (!listing) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'PG listing not found',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found',
      });
    }

    const alreadyInWishlist = user.wishlist.some(
      (id) => id.toString() === pgId.toString()
    );

    if (alreadyInWishlist) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Listing already in wishlist',
      });
    }

    user.wishlist.push(pgId);
    await user.save();

    return successResponse(res, {
      message: 'Added to wishlist',
      data: {
        wishlistCount: user.wishlist.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Remove PG from wishlist
// @route   DELETE /api/pg/:id/wishlist
// @access  Private
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const pgId = req.params.id;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found',
      });
    }

    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== pgId.toString()
    );
    await user.save();

    return successResponse(res, {
      message: 'Removed from wishlist',
      data: {
        wishlistCount: user.wishlist.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get current user's wishlist
// @route   GET /api/pg/wishlist
// @access  Private
exports.getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      select: 'name price city type images rating reviewCount featured verified',
    });

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found',
      });
    }

    return successResponse(res, {
      message: 'Wishlist fetched successfully',
      data: {
        count: user.wishlist.length,
        items: user.wishlist,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ========== Compare ==========

// @desc    Add PG to compare list (max 3)
// @route   POST /api/pg/:id/compare
// @access  Private
exports.addToCompare = async (req, res, next) => {
  try {
    const pgId = req.params.id;

    const listing = await PGListing.findById(pgId);
    if (!listing) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'PG listing not found',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found',
      });
    }

    const alreadyInCompare = user.compare.some(
      (id) => id.toString() === pgId.toString()
    );

    if (alreadyInCompare) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Listing already in compare list',
      });
    }

    if (user.compare.length >= 3) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Compare list can have at most 3 items',
      });
    }

    user.compare.push(pgId);
    await user.save();

    return successResponse(res, {
      message: 'Added to compare list',
      data: {
        compareCount: user.compare.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Remove PG from compare list
// @route   DELETE /api/pg/:id/compare
// @access  Private
exports.removeFromCompare = async (req, res, next) => {
  try {
    const pgId = req.params.id;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found',
      });
    }

    user.compare = user.compare.filter(
      (id) => id.toString() !== pgId.toString()
    );
    await user.save();

    return successResponse(res, {
      message: 'Removed from compare list',
      data: {
        compareCount: user.compare.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get current user's compare list
// @route   GET /api/pg/compare
// @access  Private
exports.getCompareList = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'compare',
      select:
        'name price city type images rating reviewCount amenities roomTypes featured verified',
    });

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found',
      });
    }

    return successResponse(res, {
      message: 'Compare list fetched successfully',
      data: {
        count: user.compare.length,
        items: user.compare,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ========== Detail ==========

// @desc    Get detailed PG view (with related data)
// @route   GET /api/pg/:id/detail
// @access  Public
exports.getPGDetail = async (req, res, next) => {
  try {
    const pgId = req.params.id;

    const listing = await PGListing.findById(pgId).lean();

    if (!listing) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'PG listing not found',
      });
    }

    const reviews = await Review.find({ pgListing: pgId })
      .populate('user', 'name')
      .sort('-createdAt')
      .limit(50)
      .lean();

    return successResponse(res, {
      message: 'PG detail fetched successfully',
      data: {
        listing,
        reviews: {
          count: reviews.length,
          items: reviews,
        },
        stats: {
          rating: listing.rating,
          reviewCount: listing.reviewCount,
        },
      },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid listing ID',
      });
    }
    return next(error);
  }
};