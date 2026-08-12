const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const fs = require('fs');
const uploadToCloudinary = require('../utils/cloudinaryUpload');

// Set storage for uploaded images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter to allow images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ storage, fileFilter });

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const uploadedUrl = await uploadToCloudinary(req.file, 'glideway_general');
    
    // Fallback: If it's just a local filename, prepend base URL
    const imageUrl = uploadedUrl.startsWith('http') 
      ? uploadedUrl 
      : `${process.env.BASE_URL}/uploads/${uploadedUrl}`;
      
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload image to storage' });
  }
});

module.exports = router;
