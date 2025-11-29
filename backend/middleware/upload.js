const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine upload directory based on file field name and URL context
    let uploadPath = 'uploads/';

    // Check if this is a staff-related upload first (highest priority)
    if (file.fieldname.includes('staff') || req.originalUrl?.includes('/staff')) {
      uploadPath += 'staff/';
    }
    // Specific case for fileUpload field (products)
    else if (file.fieldname === 'fileUpload') {
      uploadPath += 'products/';
    }
    // Generic image fields - check URL context to determine if staff or products
    else if (file.fieldname.includes('image') || file.fieldname.includes('images')) {
      if (req.originalUrl?.includes('/staff')) {
        uploadPath += 'staff/';
      } else {
        uploadPath += 'products/'; // Default to products for other image uploads
      }
    }
    // Default fallback
    else {
      uploadPath += 'products/';
    }

    console.log(`Saving file ${file.originalname} (${file.fieldname}) to: ${uploadPath} from URL: ${req.originalUrl}`);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`Created directory: ${uploadPath}`);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    console.log(`Generated filename: ${filename} for ${file.originalname}`);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = { upload };
