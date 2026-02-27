// // routes/pg.js
// const express = require('express');
// const router = express.Router();

// // Import model
// const PGListing = require('../models/PGListing');

// // Test route
// router.get('/test', (req, res) => {
//   const dbConnected = req.app.get('mongoose').connection.readyState === 1;
//   res.json({ 
//     success: true, 
//     message: 'PG route working ✅',
//     database: dbConnected ? 'connected' : 'disconnected',
//     timestamp: new Date().toISOString()
//   });
// });

// // Get all PG listings
// router.get('/', async (req, res) => {
//   try {
//     console.log('📋 Get PG listings query:', req.query);
    
//     // Check MongoDB connection
//     const mongoose = req.app.get('mongoose');
//     if (!mongoose || mongoose.connection.readyState !== 1) {
//       console.log('⚠️ MongoDB not connected, returning mock data');
//       return getMockListings(req, res);
//     }
    
//     // Build query
//     const query = {};
    
//     if (req.query.type && req.query.type !== 'all') {
//       query.type = req.query.type;
//     }
    
//     if (req.query.city) {
//       query.city = { $regex: req.query.city, $options: 'i' };
//     }
    
//     if (req.query.published !== undefined) {
//       query.published = req.query.published === 'true';
//     }
    
//     if (req.query.search) {
//       query.$or = [
//         { name: { $regex: req.query.search, $options: 'i' } },
//         { address: { $regex: req.query.search, $options: 'i' } },
//         { city: { $regex: req.query.search, $options: 'i' } },
//         { description: { $regex: req.query.search, $options: 'i' } }
//       ];
//     }
    
//     // Fetch from database
//     const listings = await PGListing.find(query).sort({ createdAt: -1 });
    
//     console.log(`✅ Found ${listings.length} listings from database`);
    
//     res.json({
//       success: true,
//       count: listings.length,
//       data: listings
//     });
    
//   } catch (error) {
//     console.error('❌ Error fetching listings:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error',
//       error: error.message
//     });
//   }
// });

// // Create PG listing
// router.post('/', async (req, res) => {
//   try {
//     console.log('➕ Create PG listing:', req.body);
    
//     // Check MongoDB connection
//     const mongoose = req.app.get('mongoose');
//     if (!mongoose || mongoose.connection.readyState !== 1) {
//       console.log('❌ MongoDB not connected');
//       return res.status(500).json({
//         success: false,
//         message: 'Database not connected. Cannot save listing.',
//         data: {
//           ...req.body,
//           _id: `mock-${Date.now()}`,
//           createdAt: new Date(),
//           updatedAt: new Date()
//         }
//       });
//     }
    
//     // Validate required fields
//     const requiredFields = ['name', 'city', 'price'];
//     const missingFields = requiredFields.filter(field => !req.body[field]);
    
//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Missing required fields: ${missingFields.join(', ')}`
//       });
//     }
    
//     // Create listing data
//     const listingData = {
//       name: req.body.name,
//       description: req.body.description || '',
//       city: req.body.city,
//       locality: req.body.locality || '',
//       address: req.body.address || '',
//       price: Number(req.body.price),
//       type: req.body.type || 'boys',
//       images: req.body.images || [],
//       amenities: req.body.amenities || [],
//       location: req.body.location || {
//         type: 'Point',
//         coordinates: [0, 0]
//       },
//       published: req.body.published || false,
//       verified: req.body.verified || false,
//       featured: req.body.featured || false,
//       rating: req.body.rating || 0,
//       reviewCount: req.body.reviewCount || 0,
//       ownerName: req.body.ownerName || '',
//       ownerPhone: req.body.ownerPhone || '',
//       ownerEmail: req.body.ownerEmail || ''
//     };
    
//     // Create and save listing
//     const newListing = new PGListing(listingData);
//     const savedListing = await newListing.save();
    
//     console.log('✅ Listing saved to MongoDB with ID:', savedListing._id);
//     console.log('📄 Saved data:', savedListing);
    
//     res.status(201).json({
//       success: true,
//       message: 'PG listing created successfully',
//       data: savedListing
//     });
    
//   } catch (error) {
//     console.error('❌ Error creating listing:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Failed to create listing',
//       error: error.message,
//       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// });

// // Get single listing
// router.get('/:id', async (req, res) => {
//   try {
//     console.log('🔍 Get listing by ID:', req.params.id);
    
//     const mongoose = req.app.get('mongoose');
//     if (!mongoose || mongoose.connection.readyState !== 1) {
//       return res.status(500).json({
//         success: false,
//         message: 'Database not connected'
//       });
//     }
    
//     const listing = await PGListing.findById(req.params.id);
    
//     if (!listing) {
//       return res.status(404).json({
//         success: false,
//         message: 'Listing not found'
//       });
//     }
    
//     res.json({
//       success: true,
//       data: listing
//     });
    
//   } catch (error) {
//     console.error('❌ Error fetching listing:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error',
//       error: error.message
//     });
//   }
// });

// // Update listing
// router.put('/:id', async (req, res) => {
//   try {
//     console.log('✏️ Update listing:', req.params.id, req.body);
    
//     const mongoose = req.app.get('mongoose');
//     if (!mongoose || mongoose.connection.readyState !== 1) {
//       return res.status(500).json({
//         success: false,
//         message: 'Database not connected'
//       });
//     }
    
//     const updatedListing = await PGListing.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     );
    
//     if (!updatedListing) {
//       return res.status(404).json({
//         success: false,
//         message: 'Listing not found'
//       });
//     }
    
//     console.log('✅ Listing updated:', updatedListing._id);
    
//     res.json({
//       success: true,
//       message: 'Listing updated successfully',
//       data: updatedListing
//     });
    
//   } catch (error) {
//     console.error('❌ Error updating listing:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error',
//       error: error.message
//     });
//   }
// });

// // Delete listing
// router.delete('/:id', async (req, res) => {
//   try {
//     console.log('🗑️ Delete listing:', req.params.id);
    
//     const mongoose = req.app.get('mongoose');
//     if (!mongoose || mongoose.connection.readyState !== 1) {
//       return res.status(500).json({
//         success: false,
//         message: 'Database not connected'
//       });
//     }
    
//     const deletedListing = await PGListing.findByIdAndDelete(req.params.id);
    
//     if (!deletedListing) {
//       return res.status(404).json({
//         success: false,
//         message: 'Listing not found'
//       });
//     }
    
//     console.log('✅ Listing deleted:', req.params.id);
    
//     res.json({
//       success: true,
//       message: 'Listing deleted successfully',
//       data: { id: req.params.id }
//     });
    
//   } catch (error) {
//     console.error('❌ Error deleting listing:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error',
//       error: error.message
//     });
//   }
// });

// // Helper function for mock data
// function getMockListings(req, res) {
//   const mockData = [
//     {
//       _id: 'mock-1',
//       name: 'Sunshine PG (Mock)',
//       city: 'Delhi',
//       address: '123 Main Street',
//       price: 5000,
//       type: 'boys',
//       rating: 4.5,
//       description: 'Mock data - MongoDB not connected',
//       amenities: ['WiFi', 'AC', 'Food'],
//       images: [],
//       published: true,
//       featured: false,
//       verified: true,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString()
//     },
//     {
//       _id: 'mock-2',
//       name: 'Rose PG for Girls (Mock)',
//       city: 'Mumbai',
//       address: '456 Park Avenue',
//       price: 6000,
//       type: 'girls',
//       rating: 4.2,
//       description: 'Safe and secure PG for girls - Mock data',
//       amenities: ['WiFi', 'Security', 'Laundry'],
//       images: [],
//       published: true,
//       featured: true,
//       verified: true,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString()
//     }
//   ];
  
//   // Apply filters to mock data
//   let filtered = [...mockData];
  
//   if (req.query.type && req.query.type !== 'all') {
//     filtered = filtered.filter(l => l.type === req.query.type);
//   }
  
//   if (req.query.search) {
//     const search = req.query.search.toLowerCase();
//     filtered = filtered.filter(l => 
//       l.name.toLowerCase().includes(search) || 
//       l.address.toLowerCase().includes(search)
//     );
//   }
  
//   res.json({
//     success: true,
//     message: 'Using mock data - MongoDB not connected',
//     count: filtered.length,
//     data: filtered
//   });
// }

// module.exports = router;

// const express = require('express');
// const router = express.Router();

// const pgController = require('../controllers/pgController');
// const { protect, adminOnly } = require('../middleware/authMiddleware');

// // Public
// router.get('/', pgController.getPGListings);
// router.get('/search', pgController.searchPGListings);
// router.get('/:id/detail', pgController.getPGDetail);
// router.get('/:id', pgController.getPGListing);

// // Wishlist
// router.get('/wishlist', protect, pgController.getWishlist);
// router.post('/:id/wishlist', protect, pgController.addToWishlist);
// router.delete('/:id/wishlist', protect, pgController.removeFromWishlist);

// // Compare
// router.get('/compare', protect, pgController.getCompareList);
// router.post('/:id/compare', protect, pgController.addToCompare);
// router.delete('/:id/compare', protect, pgController.removeFromCompare);

// // Admin
// router.get('/admin/stats', protect, adminOnly, pgController.getStats);
// router.post('/', protect, adminOnly, pgController.createPGListing);
// router.put('/:id', protect, adminOnly, pgController.updatePGListing);
// router.delete('/:id', protect, adminOnly, pgController.deletePGListing);
// router.patch('/:id/toggle-status', protect, adminOnly, pgController.toggleStatus);

// module.exports = router;








const express = require('express');
const router = express.Router();
const PGListing = require('../models/PGListing');
const { uploadImage, uploadGalleryImages } = require('../utils/cloudinary');

// @desc    Get all PG listings (public - only published)
// @route   GET /api/pg
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      city, 
      type, 
      minPrice, 
      maxPrice, 
      search,
      limit = 20, 
      page = 1 
    } = req.query;
    
    let query = { published: true };
    
    // Search by text
    if (search) {
      query.$text = { $search: search };
    }
    
    // Filter by city
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get listings
    const listings = await PGListing.find(query)
      .sort({ featured: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await PGListing.countDocuments(query);
    
    console.log(`📊 Found ${listings.length} published listings`);
    
    res.json({
      success: true,
      data: {
        items: listings,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching PGs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get all PG listings for admin (including unpublished)
// @route   GET /api/pg/admin
// @access  Public (for now - add auth later)
router.get('/admin', async (req, res) => {
  try {
    console.log('📥 Admin fetching all listings');
    
    const listings = await PGListing.find().sort({ createdAt: -1 });
    
    console.log(`📊 Found ${listings.length} total listings`);
    
    res.json({
      success: true,
      data: {
        items: listings,
        total: listings.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin PGs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single PG listing
// @route   GET /api/pg/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    console.log(`📥 Fetching PG with ID: ${req.params.id}`);
    
    const listing = await PGListing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'PG listing not found'
      });
    }
    
    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('❌ Error fetching PG:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get PG listing by slug
// @route   GET /api/pg/slug/:slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
  try {
    console.log(`📥 Fetching PG with slug: ${req.params.slug}`);
    
    const listing = await PGListing.findOne({ slug: req.params.slug });
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'PG listing not found'
      });
    }
    
    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('❌ Error fetching PG by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create new PG listing
// @route   POST /api/pg
// @access  Public (for now - add auth later)
router.post('/', async (req, res) => {
  try {
    console.log('📥 Received POST request to create PG');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const pgData = { ...req.body };
    
    // Handle main image upload if it's base64
    if (pgData.images && pgData.images.length > 0) {
      console.log('🖼️ Processing main images...');
      const processedImages = [];
      
      for (let i = 0; i < pgData.images.length; i++) {
        const img = pgData.images[i];
        
        // Check if it's a base64 image
        if (img && typeof img === 'string' && img.startsWith('data:image')) {
          try {
            console.log(`📤 Uploading main image ${i + 1} to Cloudinary...`);
            const uploadedUrl = await uploadImage(img, { 
              folder: 'pg-listings/main' 
            });
            processedImages.push(uploadedUrl);
            console.log(`✅ Main image ${i + 1} uploaded:`, uploadedUrl);
          } catch (uploadError) {
            console.error(`❌ Main image ${i + 1} upload failed:`, uploadError);
            // Keep original if upload fails
            processedImages.push(img);
          }
        } else {
          // Keep existing URL
          processedImages.push(img);
        }
      }
      
      pgData.images = processedImages;
    }
    
    // Handle gallery images if they're base64
    if (pgData.gallery && pgData.gallery.length > 0) {
      console.log('🖼️ Processing gallery images...');
      const processedGallery = [];
      
      for (let i = 0; i < pgData.gallery.length; i++) {
        const img = pgData.gallery[i];
        
        if (img && typeof img === 'string' && img.startsWith('data:image')) {
          try {
            console.log(`📤 Uploading gallery image ${i + 1} to Cloudinary...`);
            const uploadedUrl = await uploadImage(img, { 
              folder: 'pg-listings/gallery' 
            });
            processedGallery.push(uploadedUrl);
            console.log(`✅ Gallery image ${i + 1} uploaded:`, uploadedUrl);
          } catch (uploadError) {
            console.error(`❌ Gallery image ${i + 1} upload failed:`, uploadError);
            processedGallery.push(img);
          }
        } else {
          processedGallery.push(img);
        }
      }
      
      pgData.gallery = processedGallery;
    }
    
    // Generate slug from name if not provided
    if (pgData.name && !pgData.slug) {
      pgData.slug = pgData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    // Set default values for required fields if missing
    if (!pgData.city) pgData.city = 'Chandigarh';
    if (!pgData.type) pgData.type = 'boys';
    if (!pgData.ownerName) pgData.ownerName = pgData.ownerName || '';
    if (!pgData.ownerPhone) pgData.ownerPhone = pgData.ownerPhone || '';
    if (!pgData.contactPhone) pgData.contactPhone = pgData.contactPhone || pgData.ownerPhone || '';
    
    // Create new PG listing
    console.log('💾 Saving to database...');
    const listing = new PGListing(pgData);
    await listing.save();
    
    console.log('✅ PG listing created successfully with ID:', listing._id);
    console.log('📊 Images saved:', {
      main: listing.images.length,
      gallery: listing.gallery.length
    });
    
    res.status(201).json({
      success: true,
      data: listing,
      message: 'PG listing created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating PG:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    // Handle duplicate key error (slug)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A PG with this name already exists',
        error: 'Duplicate slug'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update PG listing
// @route   PUT /api/pg/:id
// @access  Public (for now - add auth later)
router.put('/:id', async (req, res) => {
  try {
    console.log(`📥 Received PUT request for ID: ${req.params.id}`);
    console.log('📦 Update data:', JSON.stringify(req.body, null, 2));
    
    let listing = await PGListing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'PG listing not found'
      });
    }
    
    const pgData = { ...req.body };
    
    // Handle main image uploads if they're base64
    if (pgData.images && pgData.images.length > 0) {
      console.log('🖼️ Processing main images for update...');
      const processedImages = [];
      
      for (let i = 0; i < pgData.images.length; i++) {
        const img = pgData.images[i];
        
        if (img && typeof img === 'string' && img.startsWith('data:image')) {
          try {
            console.log(`📤 Uploading main image ${i + 1} to Cloudinary...`);
            const uploadedUrl = await uploadImage(img, { 
              folder: 'pg-listings/main' 
            });
            processedImages.push(uploadedUrl);
            console.log(`✅ Main image ${i + 1} uploaded:`, uploadedUrl);
          } catch (uploadError) {
            console.error(`❌ Main image ${i + 1} upload failed:`, uploadError);
            processedImages.push(img);
          }
        } else {
          processedImages.push(img);
        }
      }
      
      pgData.images = processedImages;
    }
    
    // Handle gallery images if they're base64
    if (pgData.gallery && pgData.gallery.length > 0) {
      console.log('🖼️ Processing gallery images for update...');
      const processedGallery = [];
      
      for (let i = 0; i < pgData.gallery.length; i++) {
        const img = pgData.gallery[i];
        
        if (img && typeof img === 'string' && img.startsWith('data:image')) {
          try {
            console.log(`📤 Uploading gallery image ${i + 1} to Cloudinary...`);
            const uploadedUrl = await uploadImage(img, { 
              folder: 'pg-listings/gallery' 
            });
            processedGallery.push(uploadedUrl);
            console.log(`✅ Gallery image ${i + 1} uploaded:`, uploadedUrl);
          } catch (uploadError) {
            console.error(`❌ Gallery image ${i + 1} upload failed:`, uploadError);
            processedGallery.push(img);
          }
        } else {
          processedGallery.push(img);
        }
      }
      
      pgData.gallery = processedGallery;
    }
    
    // Update slug if name changed
    if (pgData.name && pgData.name !== listing.name) {
      pgData.slug = pgData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    // Update the listing
    Object.assign(listing, pgData);
    listing.updatedAt = Date.now();
    
    await listing.save();
    
    console.log('✅ PG listing updated successfully:', listing._id);
    
    res.json({
      success: true,
      data: listing,
      message: 'PG listing updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating PG:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A PG with this name already exists',
        error: 'Duplicate slug'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Partially update PG listing
// @route   PATCH /api/pg/:id
// @access  Public (for now - add auth later)
router.patch('/:id', async (req, res) => {
  try {
    console.log(`📥 Received PATCH request for ID: ${req.params.id}`);
    console.log('📦 Update data:', req.body);
    
    const listing = await PGListing.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'PG listing not found'
      });
    }
    
    console.log('✅ PG listing patched successfully:', listing._id);
    
    res.json({
      success: true,
      data: listing,
      message: 'PG listing updated successfully'
    });
  } catch (error) {
    console.error('❌ Error patching PG:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Delete PG listing
// @route   DELETE /api/pg/:id
// @access  Public (for now - add auth later)
router.delete('/:id', async (req, res) => {
  try {
    console.log(`📥 Received DELETE request for ID: ${req.params.id}`);
    
    const listing = await PGListing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'PG listing not found'
      });
    }
    
    await listing.deleteOne();
    console.log('✅ PG listing deleted successfully:', req.params.id);
    
    res.json({
      success: true,
      message: 'PG listing deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting PG:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;