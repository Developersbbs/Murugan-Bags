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

        const bucket = admin.storage().bucket();
        const filename = `combo-offers/${Date.now()}_${req.file.originalname}`;
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
                data: {
                    url: publicUrl
                }
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
