const cloudinary = require('cloudinary').v2;

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const ensureConfigured = () => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Cloudinary environment variables are not configured');
  }
};

// Accepts either an existing URL or a base64/data URI string
const uploadImage = async (image, { folder = 'pg-listings' } = {}) => {
  if (!image) return null;

  // If it's already an URL, just return it
  if (typeof image === 'string' && image.startsWith('http')) {
    return image;
  }

  ensureConfigured();

  const result = await cloudinary.uploader.upload(image, {
    folder,
    overwrite: false,
    resource_type: 'image',
    transformation: [
      {
        width: 1200,
        height: 800,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
      },
    ],
  });

  return result.secure_url;
};

const uploadGalleryImages = async (images = [], folder = 'pg-listings/gallery') => {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }

  const uploaded = await Promise.all(
    images.map((img) => uploadImage(img, { folder }))
  );

  return uploaded.filter(Boolean);
};

module.exports = {
  uploadImage,
  uploadGalleryImages,
};

