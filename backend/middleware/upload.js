const multer = require('multer');
const path = require('path');
const fs = require('fs');

const admin = require('../lib/firebase');

// Custom Multer Storage Engine for Firebase
class FirebaseStorage {
  constructor(opts) { }

  _handleFile(req, file, cb) {
    // Determine upload directory based on file field name and URL context
    let folder = 'uploads/';

    // Check if this is a staff-related upload first (highest priority)
    if (file.fieldname.includes('staff') || req.originalUrl?.includes('/staff')) {
      folder += 'staff/';
    }
    // Specific case for fileUpload field (products)
    else if (file.fieldname === 'fileUpload') {
      folder += 'products/';
    }
    // Generic image fields - check URL context to determine if staff or products
    else if (file.fieldname.includes('image') || file.fieldname.includes('images')) {
      if (req.originalUrl?.includes('/staff')) {
        folder += 'staff/';
      } else {
        folder += 'products/'; // Default to products for other image uploads
      }
    }
    // Default fallback
    else {
      folder += 'products/';
    }

    try {
      const bucket = admin.storage().bucket();
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + cleanName;
      const fullPath = `${folder}${filename}`;
      const bucketFile = bucket.file(fullPath);

      const stream = bucketFile.createWriteStream({
        metadata: {
          contentType: file.mimetype
        }
      });

      stream.on('error', (err) => {
        console.error('Error uploading to Firebase:', err);
        cb(err);
      });

      stream.on('finish', async () => {
        try {
          await bucketFile.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fullPath}`;

          // Attach Firebase info to file object to be used in routes
          cb(null, {
            filename: filename,
            path: fullPath,
            size: bucketFile.metadata.size,
            firebaseUrl: publicUrl
          });
        } catch (makePublicErr) {
          console.error('Error making file public:', makePublicErr);
          cb(makePublicErr);
        }
      });

      // Pipe the file buffer stream to Firebase
      file.stream.pipe(stream);
    } catch (err) {
      console.error('Firebase storage configuration error:', err);
      cb(err);
    }
  }

  _removeFile(req, file, cb) {
    // Implement if file deletion via multer is needed
    cb(null);
  }
}

const upload = multer({
  storage: new FirebaseStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'fileUpload') return cb(null, true); // Allow all for digital products
    if (file.mimetype === 'text/csv' || file.mimetype.includes('csv')) return cb(null, true);

    // Default image filter
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

module.exports = { upload };
