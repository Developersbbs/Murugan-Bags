const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const admin = require('../lib/firebase');

// Custom Multer Storage Engine for Firebase
class FirebaseStorage {
  constructor(opts) { }

  _handleFile(req, file, cb) {
    // Determine upload directory based on file field name and URL context
    let folder = 'uploads/';
    let subfolder = 'products/';

    // Check if this is a staff-related upload first (highest priority)
    if (file.fieldname.includes('staff') || req.originalUrl?.includes('/staff')) {
      subfolder = 'staff/';
    } else if (file.fieldname === 'fileUpload') {
      subfolder = 'products/';
    } else if (req.originalUrl?.includes('/new-arrival-banners')) {
      subfolder = 'new-arrivals/';
    } else if (file.fieldname.includes('image') || file.fieldname.includes('images')) {
      if (req.originalUrl?.includes('/staff')) {
        subfolder = 'staff/';
      } else {
        subfolder = 'products/';
      }
    }

    folder += subfolder;

    // First, always prepare for local fallback just in case
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + cleanName;
    const localDirPath = path.join(__dirname, '..', folder);
    const localFilePath = path.join(localDirPath, filename);

    // Ensure local directory exists
    if (!fs.existsSync(localDirPath)) {
      fs.mkdirSync(localDirPath, { recursive: true });
    }

    // Attempt Firebase Upload if initialized
    const isFirebaseInit = admin && (admin.apps?.length > 0 || (admin.app && admin.app()));

    if (isFirebaseInit) {
      try {
        const bucket = admin.storage().bucket();
        const fullPath = `${folder}${filename}`;
        const bucketFile = bucket.file(fullPath);

        const stream = bucketFile.createWriteStream({
          metadata: { contentType: file.mimetype },
          resumable: false
        });

        stream.on('error', (err) => {
          console.error('FIREBASE UPLOAD ERROR, falling back to local:', err);
          this._handleLocalFile(req, file, folder, filename, localFilePath, cb);
        });

        stream.on('finish', async () => {
          try {
            await bucketFile.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fullPath}`;
            cb(null, {
              filename: filename,
              path: fullPath,
              size: file.size,
              firebaseUrl: publicUrl
            });
          } catch (makePublicErr) {
            console.warn('Error making file public, but upload finished. URL might be restricted.', makePublicErr);
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fullPath}`;
            cb(null, {
              filename: filename,
              path: fullPath,
              size: file.size,
              firebaseUrl: publicUrl
            });
          }
        });

        file.stream.pipe(stream);
        return; // Exit and wait for stream events
      } catch (err) {
        console.error('Firebase storage bucket error, falling back to local:', err);
      }
    }

    // Fallback to Local Storage
    this._handleLocalFile(req, file, folder, filename, localFilePath, cb);
  }

  _handleLocalFile(req, file, folder, filename, localFilePath, cb) {
    const outStream = fs.createWriteStream(localFilePath);

    outStream.on('error', (err) => {
      console.error('LOCAL UPLOAD ERROR:', err);
      cb(err);
    });

    outStream.on('finish', () => {
      cb(null, {
        filename: filename,
        path: `/${folder}${filename}`,
        size: outStream.bytesWritten,
        firebaseUrl: null // Signal no Firebase URL
      });
    });

    file.stream.pipe(outStream);
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
