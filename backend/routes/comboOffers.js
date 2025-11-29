const router = require('express').Router();
const ComboOffer = require('../models/ComboOffer');

// GET all active combo offers (for homepage)
router.get('/', async (req, res) => {
    try {
        const offers = await ComboOffer.find({ isActive: true })
            .sort({ order: 1 })
            .limit(4);

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

// GET all combo offers (for admin)
router.get('/admin', async (req, res) => {
    try {
        const offers = await ComboOffer.find()
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

// GET single combo offer by ID
router.get('/:id', async (req, res) => {
    try {
        const offer = await ComboOffer.findById(req.params.id);

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Combo offer not found'
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

// CREATE new combo offer
router.post('/', async (req, res) => {
    try {
        const { title, description, price, originalPrice, isLimitedTime, order, isActive } = req.body;

        if (!title || !description || price === undefined || originalPrice === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Title, description, price, and original price are required'
            });
        }

        if (price < 0 || originalPrice < 0) {
            return res.status(400).json({
                success: false,
                error: 'Prices must be positive numbers'
            });
        }

        if (price > originalPrice) {
            return res.status(400).json({
                success: false,
                error: 'Discounted price cannot be greater than original price'
            });
        }

        const offer = new ComboOffer({
            title,
            description,
            price,
            originalPrice,
            isLimitedTime: isLimitedTime !== undefined ? isLimitedTime : true,
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

// UPDATE combo offer
router.put('/:id', async (req, res) => {
    try {
        const { title, description, price, originalPrice, isLimitedTime, order, isActive } = req.body;

        // Validate prices if provided
        if (price !== undefined && price < 0) {
            return res.status(400).json({
                success: false,
                error: 'Price must be a positive number'
            });
        }

        if (originalPrice !== undefined && originalPrice < 0) {
            return res.status(400).json({
                success: false,
                error: 'Original price must be a positive number'
            });
        }

        const offer = await ComboOffer.findByIdAndUpdate(
            req.params.id,
            {
                ...(title && { title }),
                ...(description && { description }),
                ...(price !== undefined && { price }),
                ...(originalPrice !== undefined && { originalPrice }),
                ...(isLimitedTime !== undefined && { isLimitedTime }),
                ...(order !== undefined && { order }),
                ...(isActive !== undefined && { isActive })
            },
            { new: true, runValidators: true }
        );

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Combo offer not found'
            });
        }

        // Validate that price is not greater than originalPrice
        if (offer.price > offer.originalPrice) {
            return res.status(400).json({
                success: false,
                error: 'Discounted price cannot be greater than original price'
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

// DELETE combo offer
router.delete('/:id', async (req, res) => {
    try {
        const offer = await ComboOffer.findByIdAndDelete(req.params.id);

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Combo offer not found'
            });
        }

        res.json({
            success: true,
            message: 'Combo offer deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
