const cloudinary = require('../config/cloudinary');
const fs = require('fs');

/**
 * Uploads a local file (from Multer storage) to Cloudinary.
 * If Cloudinary is not configured or upload fails, falls back to storing locally.
 * In both cases, deletes the temporary file from local storage if upload to Cloudinary succeeds.
 * 
 * @param {Object} file - Multer file object
 * @param {String} folder - Cloudinary folder name
 * @returns {Promise<String>} Cloudinary secure URL, or local filename as fallback
 */
const uploadToCloudinary = async (file, folder = 'glideway_buses') => {
  if (!file) return null;

  const isConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                       process.env.CLOUDINARY_API_KEY && 
                       process.env.CLOUDINARY_API_SECRET;

  if (!isConfigured) {
    console.warn('⚠️ Cloudinary env variables are not fully configured. Storing image locally on disk:', file.filename);
    return file.filename;
  }

  try {
    const filePath = file.path;
    console.log(`☁️ Uploading to Cloudinary folder "${folder}":`, filePath);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
    });

    console.log('✅ Cloudinary upload successful:', result.secure_url);

    // Clean up local temporary file after successful upload to Cloudinary
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('⚠️ Failed to delete local temp file after Cloudinary upload:', err.message);
      } else {
        console.log('🗑️ Deleted local temporary file:', filePath);
      }
    });

    return result.secure_url;
  } catch (err) {
    console.error('❌ Cloudinary upload failed:', err.message);
    console.log('⚠️ Falling back to local storage for:', file.filename);
    
    // We do NOT delete the local file on failure so it can still serve as the fallback image on disk!
    return file.filename;
  }
};

module.exports = uploadToCloudinary;
