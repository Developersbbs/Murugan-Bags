const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { authenticateToken } = require('../middleware/auth');
const { authenticateHybridToken } = require('../middleware/hybridAuth');


// Get wishlist for authenticated user
router.get('/', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;

    let wishlist = await Wishlist.findOne({ customer_id: customerId })
      .populate('items.product_id', 'name slug selling_price image_url category')
      .lean();

    if (!wishlist) {
      // Create empty wishlist if none exists
      wishlist = new Wishlist({
        customer_id: customerId,
        items: [],
        total_items: 0
      });
      await wishlist.save();
      wishlist = wishlist.toObject();
    }

    res.json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist',
      error: error.message
    });
  }
});

// Add item to wishlist
router.post('/add', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    console.log(`[Wishlist] Adding item for customer: ${customerId}`);

    const {
      product_id,
      product_name,
      product_image,
      price,
      discounted_price,
      variant_id
    } = req.body;

    console.log('[Wishlist] Request body:', req.body);

    // Validate required fields
    if (!product_id || !product_name || price === undefined || discounted_price === undefined) {
      console.log('[Wishlist] Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: product_id, product_name, price, discounted_price'
      });
    }

    // Verify product exists
    try {
      const product = await Product.findById(product_id);
      if (!product) {
        console.log(`[Wishlist] Product not found: ${product_id}`);
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
    } catch (err) {
      console.error(`[Wishlist] Invalid product ID: ${product_id}`, err);
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    // Find or create wishlist
    let wishlist;
    try {
      wishlist = await Wishlist.findOne({ customer_id: customerId });
      if (!wishlist) {
        console.log(`[Wishlist] Creating new wishlist for customer: ${customerId}`);
        wishlist = new Wishlist({ customer_id: customerId, items: [] });
      } else {
        console.log(`[Wishlist] Found existing wishlist for customer: ${customerId}`);
      }
    } catch (err) {
      console.error('[Wishlist] Error finding/creating wishlist:', err);
      throw err;
    }

    // Check if item already exists in wishlist (checking both product_id and variant_id)
    const existingItemIndex = wishlist.items.findIndex(item => {
      const sameProduct = item.product_id.toString() === product_id;
      const sameVariant = variant_id
        ? (item.variant_id && item.variant_id.toString() === variant_id.toString())
        : (!item.variant_id); // If no variant_id in request, match item with no variant_id

      return sameProduct && sameVariant;
    });

    if (existingItemIndex > -1) {
      console.log(`[Wishlist] Item already exists: ${product_id}`);
      return res.status(400).json({
        success: false,
        message: 'Item already exists in wishlist'
      });
    }

    // Add new item to wishlist
    try {
      wishlist.items.push({
        product_id,
        product_name,
        product_image,
        price: parseFloat(price),
        discounted_price: parseFloat(discounted_price),
        variant_id
      });

      console.log('[Wishlist] Saving wishlist...');
      await wishlist.save();
      console.log('[Wishlist] Wishlist saved successfully');
    } catch (err) {
      console.error('[Wishlist] Error saving wishlist:', err);
      throw err;
    }

    // Return updated wishlist with populated product data
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.product_id', 'name slug selling_price image_url category')
      .lean();

    res.json({
      success: true,
      message: 'Item added to wishlist successfully',
      data: updatedWishlist
    });
  } catch (error) {
    console.error('[Wishlist] Critical error adding item to wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding item to wishlist',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Remove item from wishlist
router.delete('/remove/:itemId', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { itemId } = req.params;

    const wishlist = await Wishlist.findOne({ customer_id: customerId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const itemIndex = wishlist.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    // Return updated wishlist with populated product data
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.product_id', 'name slug selling_price image_url category')
      .lean();

    res.json({
      success: true,
      message: 'Item removed from wishlist successfully',
      data: updatedWishlist
    });
  } catch (error) {
    console.error('Error removing wishlist item:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing wishlist item',
      error: error.message
    });
  }
});

// Remove item from wishlist by product ID
router.delete('/remove-product/:productId', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ customer_id: customerId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const itemIndex = wishlist.items.findIndex(item =>
      item.product_id.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    // Return updated wishlist with populated product data
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.product_id', 'name slug selling_price image_url category')
      .lean();

    res.json({
      success: true,
      message: 'Item removed from wishlist successfully',
      data: updatedWishlist
    });
  } catch (error) {
    console.error('Error removing wishlist item:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing wishlist item',
      error: error.message
    });
  }
});

// Clear entire wishlist
router.delete('/clear', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;

    const wishlist = await Wishlist.findOne({ customer_id: customerId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    wishlist.items = [];
    await wishlist.save();

    res.json({
      success: true,
      message: 'Wishlist cleared successfully',
      data: wishlist
    });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing wishlist',
      error: error.message
    });
  }
});

// Get wishlist item count
router.get('/count', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;

    const wishlist = await Wishlist.findOne({ customer_id: customerId });
    const itemCount = wishlist ? wishlist.total_items : 0;

    res.json({
      success: true,
      data: { count: itemCount }
    });
  } catch (error) {
    console.error('Error fetching wishlist count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist count',
      error: error.message
    });
  }
});

// Check if product is in wishlist
router.get('/check/:productId', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ customer_id: customerId });
    const isInWishlist = wishlist ?
      wishlist.items.some(item => item.product_id.toString() === productId) :
      false;

    res.json({
      success: true,
      data: { isInWishlist }
    });
  } catch (error) {
    console.error('Error checking wishlist item:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking wishlist item',
      error: error.message
    });
  }
});

// Sync wishlist from frontend (migration from cookies/localStorage)
router.post('/sync', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items must be an array'
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ customer_id: customerId });
    if (!wishlist) {
      wishlist = new Wishlist({ customer_id: customerId, items: [] });
    }

    // Process each item from frontend
    for (const item of items) {
      if (!item._id || !item.name || !item.price) {
        continue; // Skip invalid items
      }

      // Check if item already exists (considering variants)
      const existingIndex = wishlist.items.findIndex(existingItem => {
        const sameProduct = existingItem.product_id.toString() === item._id;
        const sameVariant = item.variant_id
          ? (existingItem.variant_id && existingItem.variant_id.toString() === item.variant_id.toString())
          : (!existingItem.variant_id);
        return sameProduct && sameVariant;
      });

      if (existingIndex === -1) {
        // Add new item
        wishlist.items.push({
          product_id: item._id,
          product_name: item.name,
          product_image: item.image,
          price: parseFloat(item.price) || 0,
          discounted_price: parseFloat(item.price) || 0,
          variant_id: item.variant_id || null
        });
      }
    }

    await wishlist.save();

    // Return updated wishlist with populated product data
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.product_id', 'name slug selling_price image_url category')
      .lean();

    res.json({
      success: true,
      message: 'Wishlist synced successfully',
      data: updatedWishlist
    });
  } catch (error) {
    console.error('Error syncing wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing wishlist',
      error: error.message
    });
  }
});

module.exports = router;
