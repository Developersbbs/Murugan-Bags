const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { authenticateToken } = require('../middleware/auth');

// Get wishlist for authenticated user
router.get('/', authenticateToken, async (req, res) => {
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
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { 
      product_id, 
      product_name,
      product_image,
      price,
      discounted_price
    } = req.body;

    // Validate required fields
    if (!product_id || !product_name || !price || !discounted_price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: product_id, product_name, price, discounted_price'
      });
    }

    // Verify product exists
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ customer_id: customerId });
    if (!wishlist) {
      wishlist = new Wishlist({ customer_id: customerId, items: [] });
    }

    // Check if item already exists in wishlist
    const existingItemIndex = wishlist.items.findIndex(item => 
      item.product_id.toString() === product_id
    );

    if (existingItemIndex > -1) {
      return res.status(400).json({
        success: false,
        message: 'Item already exists in wishlist'
      });
    }

    // Add new item to wishlist
    wishlist.items.push({
      product_id,
      product_name,
      product_image,
      price: parseFloat(price),
      discounted_price: parseFloat(discounted_price)
    });

    await wishlist.save();

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
    console.error('Error adding item to wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding item to wishlist',
      error: error.message
    });
  }
});

// Remove item from wishlist
router.delete('/remove/:itemId', authenticateToken, async (req, res) => {
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
router.delete('/remove-product/:productId', authenticateToken, async (req, res) => {
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
router.delete('/clear', authenticateToken, async (req, res) => {
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
router.get('/count', authenticateToken, async (req, res) => {
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
router.get('/check/:productId', authenticateToken, async (req, res) => {
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
router.post('/sync', authenticateToken, async (req, res) => {
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

      // Check if item already exists
      const existingIndex = wishlist.items.findIndex(existingItem => 
        existingItem.product_id.toString() === item._id
      );

      if (existingIndex === -1) {
        // Add new item
        wishlist.items.push({
          product_id: item._id,
          product_name: item.name,
          product_image: item.images?.[0]?.url || item.image,
          price: parseFloat(item.price) || 0,
          discounted_price: parseFloat(item.salePrice || item.price) || 0
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
