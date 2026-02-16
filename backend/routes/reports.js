const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { authenticateToken, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/reports/wishlist-cart-stats
 * @desc    Get aggregated stats for products in wishlists and carts
 * @access  Private (Admin)
 */
router.get('/wishlist-cart-stats', authenticateToken, authorize('admin', 'superadmin'), async (req, res) => {
    try {
        const { startDate, endDate, minPrice, maxPrice, categoryId } = req.query;

        // Date Filter for Aggregation
        const dateMatch = {};
        if (startDate || endDate) {
            dateMatch["items.added_at"] = {};
            if (startDate) dateMatch["items.added_at"].$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateMatch["items.added_at"].$lte = end;
            }
        }

        // Aggregation for Wishlists
        const wishlistPipeline = [
            { $unwind: "$items" }
        ];

        // Apply date filter if present
        if (Object.keys(dateMatch).length > 0) {
            wishlistPipeline.push({ $match: dateMatch });
        }

        wishlistPipeline.push({
            $group: {
                _id: "$items.product_id",
                wishlistCount: { $sum: 1 }
            }
        });

        const wishlistAggregation = await Wishlist.aggregate(wishlistPipeline);

        // Aggregation for Carts
        const cartPipeline = [
            { $unwind: "$items" }
        ];

        // Apply date filter if present
        if (Object.keys(dateMatch).length > 0) {
            cartPipeline.push({ $match: dateMatch });
        }

        cartPipeline.push({
            $group: {
                _id: "$items.product_id",
                cartCount: { $sum: "$items.quantity" }
            }
        });

        const cartAggregation = await Cart.aggregate(cartPipeline);

        // Create logical maps for easier lookup
        const wishlistMap = new Map();
        wishlistAggregation.forEach(item => {
            if (item._id) wishlistMap.set(item._id.toString(), item.wishlistCount);
        });

        const cartMap = new Map();
        cartAggregation.forEach(item => {
            if (item._id) cartMap.set(item._id.toString(), item.cartCount);
        });

        // Get all unique product IDs
        const allProductIds = new Set([...wishlistMap.keys(), ...cartMap.keys()]);

        // Build Product Query
        const productQuery = { _id: { $in: Array.from(allProductIds) } };

        // Price Filter
        if (minPrice || maxPrice) {
            productQuery.discounted_price = {}; // Assuming we filter by discounted price
            if (minPrice) productQuery.discounted_price.$gte = Number(minPrice);
            if (maxPrice) productQuery.discounted_price.$lte = Number(maxPrice);
        }

        // Category Filter
        if (categoryId && categoryId !== 'all') {
            productQuery["categories.category"] = categoryId;
        }

        // Fetch product details
        const products = await Product.find(productQuery)
            .select('name images price discounted_price categories')
            .lean();

        // Combine data
        const reportData = products.map(product => {
            const productIdStr = product._id.toString();
            return {
                _id: product._id,
                name: product.name,
                image: product.images && product.images.length > 0 ? product.images[0] : null,
                price: product.price,
                discounted_price: product.discounted_price,
                inWishlists: wishlistMap.get(productIdStr) || 0,
                inCarts: cartMap.get(productIdStr) || 0,
                totalInterest: (wishlistMap.get(productIdStr) || 0) + (cartMap.get(productIdStr) || 0)
            };
        });

        // Sort by total interest (descending)
        reportData.sort((a, b) => b.totalInterest - a.totalInterest);

        res.json({
            success: true,
            count: reportData.length,
            data: reportData
        });

    } catch (error) {
        console.error('Error getting wishlist/cart stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/reports/product-interest/:productId
 * @desc    Get details of users who have a specific product in wishlist or cart
 * @access  Private (Admin)
 */
router.get('/product-interest/:productId', authenticateToken, authorize('admin', 'superadmin'), async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Find Wishlists containing this product
        const wishlists = await Wishlist.find({
            "items.product_id": productId
        }).populate('customer_id', 'name email phone');

        // Find Carts containing this product
        const carts = await Cart.find({
            "items.product_id": productId
        }).populate('customer_id', 'name email phone');

        // Extract user details
        const wishlistUsers = wishlists
            .filter(w => w.customer_id) // Filter out null populated customers
            .map(w => ({
                _id: w.customer_id._id,
                name: w.customer_id.name,
                email: w.customer_id.email,
                phone: w.customer_id.phone
            }));

        const cartUsers = carts
            .filter(c => c.customer_id) // Filter out null populated customers
            .map(c => ({
                _id: c.customer_id._id,
                name: c.customer_id.name,
                email: c.customer_id.email,
                phone: c.customer_id.phone,
                quantity: c.items.find(item => item.product_id.toString() === productId)?.quantity || 1
            }));

        res.json({
            success: true,
            data: {
                wishlistUsers,
                cartUsers
            }
        });

    } catch (error) {
        console.error('Error getting product interest details:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
