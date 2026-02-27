const mongoose = require('mongoose');

const PGListingSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'PG name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,  // ✅ This creates index automatically
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // Location Details
  city: {
    type: String,
    required: true,
    default: 'Chandigarh'
  },
  locality: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    required: true
  },
  distance: {
    type: String,
    default: ''
  },
  googleMapLink: {
    type: String,
    default: ''
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  type: {
    type: String,
    enum: ['boys', 'girls', 'co-ed', 'family'],
    default: 'boys'
  },
  
  // Media
  images: [{
    type: String
  }],
  gallery: [{
    type: String
  }],
  
  // Features
  amenities: [{
    type: String
  }],
  roomTypes: [{
    type: String
  }],
  availability: {
    type: String,
    default: 'available'
  },
  
  // Status Flags
  published: {
    type: Boolean,
    default: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // Ratings & Reviews
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  
  // Owner Information
  ownerName: {
    type: String,
    default: ''
  },
  ownerPhone: {
    type: String,
    default: ''
  },
  ownerEmail: {
    type: String,
    default: ''
  },
  ownerId: {
    type: String,
    default: ''
  },
  
  // Contact Information
  contactEmail: {
    type: String,
    default: ''
  },
  contactPhone: {
    type: String,
    default: ''
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug before saving
PGListingSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  }
  next();
});

// Index for faster queries
// ❌ REMOVED: PGListingSchema.index({ slug: 1 }); // Duplicate - already covered by unique:true

// ✅ Keep these indexes (they're not duplicates)
PGListingSchema.index({ name: 1 });              // For searching by name
PGListingSchema.index({ city: 1 });               // For filtering by city
PGListingSchema.index({ type: 1 });                // For filtering by type
PGListingSchema.index({ price: 1 });               // For sorting by price
PGListingSchema.index({ published: 1 });           // For filtering published listings
PGListingSchema.index({ location: '2dsphere' });   // For geo queries
PGListingSchema.index({ 
  name: 'text', 
  description: 'text', 
  address: 'text', 
  city: 'text' 
});  // For text search

const PGListing = mongoose.model('PGListing', PGListingSchema);

module.exports = PGListing;