const router = require('express').Router();
const MarqueeOffer = require('../models/MarqueeOffer');

// GET all active marquee offers (for homepage)
router.get('/', async (req, res) => {
    try {
        const offers = await MarqueeOffer.find({ isActive: true })
            .sort({ order: 1 });

        res.json({
            success: true,
            data: offers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET all marquee offers (for admin)
router.get('/admin', async (req, res) => {
    try {
        const offers = await MarqueeOffer.find()
            .sort({ order: 1 });

        res.json({
            success: true,
            data: offers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET single marquee offer by ID
router.get('/:id', async (req, res) => {
    try {
        const offer = await MarqueeOffer.findById(req.params.id);

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Marquee offer not found'
            });
        }

        res.json({
            success: true,
            data: offer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// CREATE new marquee offer
router.post('/', async (req, res) => {
    try {
        const { title, description, icon, order, isActive } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                error: 'Title and description are required'
            });
        }

        const offer = new MarqueeOffer({
            title,
            description,
            icon: icon || '🎁',
            order: order || 0,
            isActive: isActive !== undefined ? isActive : true
        });

        await offer.save();

        res.status(201).json({
            success: true,
            data: offer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// UPDATE marquee offer
router.put('/:id', async (req, res) => {
    try {
        const { title, description, icon, order, isActive } = req.body;

        const offer = await MarqueeOffer.findByIdAndUpdate(
            req.params.id,
            {
                ...(title && { title }),
                ...(description && { description }),
                ...(icon !== undefined && { icon }),
                ...(order !== undefined && { order }),
                ...(isActive !== undefined && { isActive })
            },
            { new: true, runValidators: true }
        );

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Marquee offer not found'
            });
        }

        res.json({
            success: true,
            data: offer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE marquee offer
router.delete('/:id', async (req, res) => {
    try {
        const offer = await MarqueeOffer.findByIdAndDelete(req.params.id);

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Marquee offer not found'
            });
        }

        res.json({
            success: true,
            message: 'Marquee offer deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
