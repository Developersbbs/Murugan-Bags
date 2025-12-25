const express = require('express');
const router = express.Router();
const NewArrivalBanner = require('../models/NewArrivalBanner');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads/new-arrivals');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// GET all active banners (Public)
router.get('/', async (req, res) => {
    try {
        const banners = await NewArrivalBanner.find({ isActive: true }).sort({ order: 1 });
        res.json({ success: true, data: banners });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET all banners (Admin)
router.get('/admin', async (req, res) => {
    try {
        const banners = await NewArrivalBanner.find().sort({ order: 1 });
        res.json({ success: true, data: banners });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST new banner
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Image is required' });
        }

        const imageUrl = `/uploads/new-arrivals/${req.file.filename}`;

        // Get highest order to append to end
        const lastBanner = await NewArrivalBanner.findOne().sort({ order: -1 });
        const newOrder = lastBanner ? lastBanner.order + 1 : 0;

        const newBanner = new NewArrivalBanner({
            ...req.body,
            image: imageUrl,
            order: newOrder
        });

        await newBanner.save();
        res.status(201).json({ success: true, data: newBanner });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT update banner
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (req.file) {
            updateData.image = `/uploads/new-arrivals/${req.file.filename}`;
        }

        const banner = await NewArrivalBanner.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!banner) {
            return res.status(404).json({ success: false, error: 'Banner not found' });
        }

        res.json({ success: true, data: banner });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE banner
router.delete('/:id', async (req, res) => {
    try {
        const banner = await NewArrivalBanner.findByIdAndDelete(req.params.id);

        if (!banner) {
            return res.status(404).json({ success: false, error: 'Banner not found' });
        }

        res.json({ success: true, message: 'Banner deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
