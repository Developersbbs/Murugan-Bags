const router = require('express').Router();
const OfferPopup = require('../models/OfferPopup');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/offer-popups';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'popup-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
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

// GET active popup for frontend (public route)
router.get('/', async (req, res) => {
    try {
        const popups = await OfferPopup.find({ isActive: true })
            .sort({ priority: -1, createdAt: -1 });

        // Filter popups that are currently valid based on date range
        const validPopups = popups.filter(popup => popup.isCurrentlyValid());

        // Return the highest priority valid popup
        const activePopup = validPopups.length > 0 ? validPopups[0] : null;

        res.json({
            success: true,
            data: activePopup
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET all popups for admin
router.get('/admin', async (req, res) => {
    try {
        const popups = await OfferPopup.find()
            .sort({ priority: -1, createdAt: -1 });

        res.json({
            success: true,
            data: popups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET single popup by ID
router.get('/:id', async (req, res) => {
    try {
        const popup = await OfferPopup.findById(req.params.id);

        if (!popup) {
            return res.status(404).json({
                success: false,
                error: 'Offer popup not found'
            });
        }

        res.json({
            success: true,
            data: popup
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// CREATE new popup with image upload
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { heading, description, buttonText, buttonLink, isActive, priority, startDate, endDate } = req.body;

        if (!heading || !description) {
            return res.status(400).json({
                success: false,
                error: 'Heading and description are required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image is required'
            });
        }

        const popup = new OfferPopup({
            image: `/uploads/offer-popups/${req.file.filename}`,
            heading,
            description,
            buttonText: buttonText || 'Shop Now',
            buttonLink: buttonLink || '/products',
            isActive: isActive !== undefined ? isActive === 'true' : true,
            priority: priority ? parseInt(priority) : 0,
            startDate: startDate || null,
            endDate: endDate || null
        });

        await popup.save();

        res.status(201).json({
            success: true,
            data: popup
        });
    } catch (error) {
        // Delete uploaded file if database save fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// UPDATE popup
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { heading, description, buttonText, buttonLink, isActive, priority, startDate, endDate } = req.body;

        const popup = await OfferPopup.findById(req.params.id);

        if (!popup) {
            return res.status(404).json({
                success: false,
                error: 'Offer popup not found'
            });
        }

        // Update fields
        if (heading) popup.heading = heading;
        if (description) popup.description = description;
        if (buttonText) popup.buttonText = buttonText;
        if (buttonLink) popup.buttonLink = buttonLink;
        if (isActive !== undefined) popup.isActive = isActive === 'true';
        if (priority !== undefined) popup.priority = parseInt(priority);
        if (startDate !== undefined) popup.startDate = startDate || null;
        if (endDate !== undefined) popup.endDate = endDate || null;

        // Handle image update
        if (req.file) {
            // Delete old image
            const oldImagePath = path.join(__dirname, '..', popup.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
            popup.image = `/uploads/offer-popups/${req.file.filename}`;
        }

        await popup.save();

        res.json({
            success: true,
            data: popup
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// TOGGLE active status
router.patch('/:id/toggle', async (req, res) => {
    try {
        const popup = await OfferPopup.findById(req.params.id);

        if (!popup) {
            return res.status(404).json({
                success: false,
                error: 'Offer popup not found'
            });
        }

        popup.isActive = !popup.isActive;
        await popup.save();

        res.json({
            success: true,
            data: popup
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE popup
router.delete('/:id', async (req, res) => {
    try {
        const popup = await OfferPopup.findById(req.params.id);

        if (!popup) {
            return res.status(404).json({
                success: false,
                error: 'Offer popup not found'
            });
        }

        // Delete image file
        const imagePath = path.join(__dirname, '..', popup.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        await OfferPopup.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Offer popup deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
