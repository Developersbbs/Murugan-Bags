const router = require('express').Router();
const BulkOrder = require('../models/BulkOrder');

// Get all active bulk orders (User side)
router.get('/', async (req, res) => {
    try {
        const orders = await BulkOrder.find({ isActive: true })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get all bulk orders (Admin side)
router.get('/admin', async (req, res) => {
    try {
        const orders = await BulkOrder.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get single bulk order
router.get('/:id', async (req, res) => {
    try {
        const order = await BulkOrder.findOne({ _id: req.params.id, isActive: true });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Bulk order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create new bulk order
router.post('/', async (req, res) => {
    try {
        const { title, description, price, minQuantity, image, isActive } = req.body;

        const newOrder = new BulkOrder({
            title,
            description,
            price,
            minQuantity,
            image,
            isActive
        });

        await newOrder.save();

        res.status(201).json({
            success: true,
            data: newOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update bulk order
router.put('/:id', async (req, res) => {
    try {
        const { title, description, price, minQuantity, image, isActive } = req.body;

        const updatedOrder = await BulkOrder.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description,
                price,
                minQuantity,
                image,
                isActive
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                error: 'Bulk order not found'
            });
        }

        res.json({
            success: true,
            data: updatedOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete bulk order
router.delete('/:id', async (req, res) => {
    try {
        const deletedOrder = await BulkOrder.findByIdAndDelete(req.params.id);

        if (!deletedOrder) {
            return res.status(404).json({
                success: false,
                error: 'Bulk order not found'
            });
        }

        res.json({
            success: true,
            message: 'Bulk order deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
