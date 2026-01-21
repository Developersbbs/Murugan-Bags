const router = require('express').Router();
const multer = require('multer');
const admin = require('../lib/firebase');
const path = require('path');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Upload file to Firebase Storage
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const folder = req.body.folder || 'uploads';
        const bucket = admin.storage().bucket();
        // Clean filename to remove spaces and special chars
        const cleanName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const filename = `${folder}/${Date.now()}_${cleanName}`;
        const file = bucket.file(filename);

        const stream = file.createWriteStream({
            metadata: {
                contentType: req.file.mimetype
            }
        });

        stream.on('error', (error) => {
            console.error('Error uploading to Firebase:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to upload file'
            });
        });

        stream.on('finish', async () => {
            // Make the file public
            await file.makePublic();

            // Get the public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

            res.json({
                success: true,
                url: publicUrl // Return flat URL for easier frontend usage
            });
        });

        stream.end(req.file.buffer);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
