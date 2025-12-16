const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Rating = require("../models/Rating");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { authenticateToken } = require('../middleware/auth');
const { authenticateHybridToken } = require('../middleware/hybridAuth');

// Submit a review
router.post("/", authenticateHybridToken, async (req, res) => {
    try {
        const { product_id, order_id, rating, review, images } = req.body;
        const customer_id = req.user.id; // From auth middleware

        // Validate inputs
        if (!product_id || !order_id || !rating) {
            return res.status(400).json({ error: "Product, Order, and Rating are required" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // Verify the order exists and belongs to the customer
        const order = await Order.findOne({
            _id: order_id,
            customer_id: customer_id
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found or does not belong to you" });
        }

        // Verify the order status is 'delivered'
        if (order.status !== 'delivered') {
            return res.status(400).json({ error: "You can only review delivered products" });
        }

        // Verify the product is in the order
        // Order items structure is array of objects with product_id (string or ObjectId)
        const hasProduct = order.items.some(item =>
            item.product_id.toString() === product_id
        );

        if (!hasProduct) {
            return res.status(400).json({ error: "This product was not found in your order" });
        }

        // Check if review already exists for this customer-product pair (matching the unique index)
        const existingRating = await Rating.findOne({
            customer_id,
            product_id
        });

        let savedRating;
        let isUpdate = false;

        if (existingRating) {
            // Update existing rating with new values
            savedRating = await Rating.findOneAndUpdate(
                { customer_id, product_id },
                {
                    order_id, // Update to most recent order
                    rating,
                    review,
                    images: images || [],
                    verified_purchase: true,
                    status: 'pending' // Reset to pending for re-approval
                },
                { new: true } // Return the updated document
            );
            isUpdate = true;
        } else {
            // Create new rating
            const newRating = new Rating({
                customer_id,
                product_id,
                order_id,
                rating,
                review,
                images: images || [],
                verified_purchase: true,
                status: 'pending'
            });
            savedRating = await newRating.save();
        }

        // Update product rating stats if the rating was previously approved
        if (isUpdate && existingRating.status === 'approved') {
            await updateProductRating(product_id);
        }

        res.status(isUpdate ? 200 : 201).json({
            success: true,
            message: isUpdate
                ? "Review updated successfully! It will be visible after approval."
                : "Review submitted successfully! It will be visible after approval.",
            data: savedRating,
            isUpdate
        });

    } catch (err) {
        console.error("Error submitting review:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get approved reviews for a product
router.get("/product/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {
            product_id: productId,
            status: 'approved'
        };

        const reviews = await Rating.find(filter)
            .populate('customer_id', 'name image_url')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Rating.countDocuments(filter);

        // Get rating distribution
        const distribution = await Rating.aggregate([
            {
                $match: {
                    product_id: new mongoose.Types.ObjectId(productId),
                    status: 'approved'
                }
            },
            { $group: { _id: "$rating", count: { $sum: 1 } } }
        ]);

        // Calculate average
        let totalSum = 0;
        const distributionArray = [];

        distribution.forEach(d => {
            totalSum += d._id * d.count;
            distributionArray.push({ rating: d._id, count: d.count });
        });

        const averageRating = total > 0 ? totalSum / total : 0;

        const stats = {
            averageRating,
            totalRatings: total,
            distribution: distributionArray
        };

        res.json({
            success: true,
            data: reviews,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            },
            stats
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Get current user's reviews
router.get("/my-reviews", authenticateHybridToken, async (req, res) => {
    try {
        const customer_id = req.user.id;
        const reviews = await Rating.find({ customer_id })
            .populate('product_id', 'name image_url')
            .sort({ created_at: -1 });

        res.json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete own review
router.delete("/:id", authenticateHybridToken, async (req, res) => {
    try {
        const { id } = req.params;
        const customer_id = req.user.id;

        const rating = await Rating.findOneAndDelete({ _id: id, customer_id });

        if (!rating) {
            return res.status(404).json({ error: "Review not found or not authorized" });
        }

        // Update product rating if the deleted review was approved
        if (rating.status === 'approved') {
            await updateProductRating(rating.product_id);
        }

        res.json({ success: true, message: "Review deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get all reviews
router.get("/admin/all", async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }

        // If search is implemented, it would likely need aggregation to search populated fields
        // Keeping it simple for now

        const reviews = await Rating.find(filter)
            .populate('customer_id', 'name email')
            .populate('product_id', 'name image_url')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Rating.countDocuments(filter);

        res.json({
            success: true,
            data: reviews,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Update review status
router.patch("/admin/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const rating = await Rating.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!rating) {
            return res.status(404).json({ error: "Review not found" });
        }

        // If approved, update product average rating
        if (status === 'approved') {
            await updateProductRating(rating.product_id);
        }
        // If was approved and now rejected/pending, may need to re-calculate too
        else {
            // Always re-calculate to be safe
            await updateProductRating(rating.product_id);
        }

        res.json({
            success: true,
            data: rating
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete review
router.delete("/admin/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const rating = await Rating.findByIdAndDelete(id);

        if (!rating) {
            return res.status(404).json({ error: "Review not found" });
        }

        // Update product rating if the deleted review was approved
        if (rating.status === 'approved') {
            await updateProductRating(rating.product_id);
        }

        res.json({ success: true, message: "Review deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper: Calculate and update product average rating
async function updateProductRating(productId) {
    try {
        const stats = await Rating.aggregate([
            {
                $match: {
                    product_id: new mongoose.Types.ObjectId(productId),
                    status: 'approved'
                }
            },
            {
                $group: {
                    _id: "$product_id",
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 },
                    totalReviews: {
                        $sum: {
                            $cond: [{ $ifNull: ["$review", false] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        if (stats.length > 0) {
            await Product.findByIdAndUpdate(productId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10, // Round to 1 decimal
                totalRatings: stats[0].totalRatings,
                totalReviews: stats[0].totalReviews || stats[0].totalRatings // fallback
            });
        } else {
            // Reset if no approved reviews left
            await Product.findByIdAndUpdate(productId, {
                averageRating: 0,
                totalRatings: 0,
                totalReviews: 0
            });
        }
    } catch (err) {
        console.error("Error updating product rating stats:", err);
    }
}

module.exports = router;
