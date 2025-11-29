const router = require('express').Router();
const SpecialOffer = require('../models/SpecialOffer');

// GET all active special offers (for homepage)
router.get('/', async (req, res) => {
    try {
        const offers = await SpecialOffer.find({ isActive: true })
            .sort({ order: 1 })
            .limit(6);

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

// GET all special offers (for admin)
router.get('/admin', async (req, res) => {
    try {
        const offers = await SpecialOffer.find()
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

// GET single special offer by ID
router.get('/:id', async (req, res) => {
    try {
        const offer = await SpecialOffer.findById(req.params.id);

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Special offer not found'
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

// CREATE new special offer
router.post('/', async (req, res) => {
    try {
        const { title, description, icon, order, isActive } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                error: 'Title and description are required'
            });
        }

        const offer = new SpecialOffer({
            title,
            description,
            icon: icon || 'FaGift',
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

// UPDATE special offer
router.put('/:id', async (req, res) => {
    try {
        const { title, description, icon, order, isActive } = req.body;

        const offer = await SpecialOffer.findByIdAndUpdate(
            req.params.id,
            {
                ...(title && { title }),
                ...(description && { description }),
                ...(icon && { icon }),
                ...(order !== undefined && { order }),
                ...(isActive !== undefined && { isActive })
            },
            { new: true, runValidators: true }
        );

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Special offer not found'
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

// DELETE special offer
router.delete('/:id', async (req, res) => {
    try {
        const offer = await SpecialOffer.findByIdAndDelete(req.params.id);

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Special offer not found'
            });
        }

        res.json({
            success: true,
            message: 'Special offer deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
