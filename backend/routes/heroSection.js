const express = require('express');
const router = express.Router();
const HeroSection = require('../models/HeroSection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads/hero');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// GET all active slides (Public)
router.get('/', async (req, res) => {
    try {
        const slides = await HeroSection.find({ isActive: true }).sort({ order: 1 });
        res.json({ success: true, data: slides });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET all slides (Admin)
router.get('/admin', async (req, res) => {
    try {
        const slides = await HeroSection.find().sort({ order: 1 });
        res.json({ success: true, data: slides });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST new slide
router.post('/', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = '';

        if (req.file) {
            imageUrl = `/uploads/hero/${req.file.filename}`;
        } else if (req.body.image) {
            imageUrl = req.body.image;
        } else {
            return res.status(400).json({ success: false, error: 'Image is required' });
        }

        // Get highest order to append to end
        const lastSlide = await HeroSection.findOne().sort({ order: -1 });
        const newOrder = lastSlide ? lastSlide.order + 1 : 0;

        const newSlide = new HeroSection({
            ...req.body,
            image: imageUrl,
            order: newOrder
        });

        await newSlide.save();
        res.status(201).json({ success: true, data: newSlide });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT update slide
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (req.file) {
            updateData.image = `/uploads/hero/${req.file.filename}`;
        }
        // If req.body.image is present (from Firebase upload), it's already in updateData

        const slide = await HeroSection.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!slide) {
            return res.status(404).json({ success: false, error: 'Slide not found' });
        }

        res.json({ success: true, data: slide });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE slide
router.delete('/:id', async (req, res) => {
    try {
        const slide = await HeroSection.findByIdAndDelete(req.params.id);

        if (!slide) {
            return res.status(404).json({ success: false, error: 'Slide not found' });
        }

        // Optional: Delete image file
        // const imagePath = path.join(__dirname, '..', slide.image);
        // if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

        res.json({ success: true, message: 'Slide deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
