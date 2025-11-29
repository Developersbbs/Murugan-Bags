const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { authenticateToken } = require('../middleware/auth');
const { authenticateHybridToken } = require('../middleware/hybridAuth');

// Get cart for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    
    let cart = await Cart.findOne({ customer_id: customerId })
      .populate('items.product_id', 'name slug selling_price variants image_url')
      .lean();
    
    if (!cart) {
      // Create empty cart if none exists
      cart = new Cart({ 
        customer_id: customerId, 
        items: [],
        total_items: 0,
        total_amount: 0,
        total_discounted_amount: 0
      });
      await cart.save();
      cart = cart.toObject();
    }
    
    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: error.message
    });
  }
});

// Add item to cart
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { 
      product_id, 
      variant_sku, 
      quantity = 1, 
      price, 
      discounted_price,
      product_name,
      product_image,
      variant_name,
      variant_attributes
    } = req.body;

    // Validate required fields
    if (!product_id || !price || !discounted_price || !product_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: product_id, price, discounted_price, product_name'
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

    // Find or create cart
    let cart = await Cart.findOne({ customer_id: customerId });
    if (!cart) {
      cart = new Cart({ customer_id: customerId, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item => 
      item.product_id.toString() === product_id && 
      (variant_sku ? item.variant_sku === variant_sku : !item.variant_sku)
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
      cart.items[existingItemIndex].quantity += parseInt(quantity);
    } else {
      // Add new item to cart
      cart.items.push({
        product_id,
        variant_sku,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        discounted_price: parseFloat(discounted_price),
        product_name,
        product_image,
        variant_name,
        variant_attributes
      });
    }

    await cart.save();

    // Return updated cart with populated product data
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product_id', 'name slug selling_price variants')
      .lean();

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: updatedCart
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding item to cart',
      error: error.message
    });
  }
});

// Update item quantity in cart
router.put('/update/:itemId', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ customer_id: customerId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    cart.items[itemIndex].quantity = parseInt(quantity);
    await cart.save();

    // Return updated cart with populated product data
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product_id', 'name slug selling_price variants')
      .lean();

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: updatedCart
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart item',
      error: error.message
    });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ customer_id: customerId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    // Return updated cart with populated product data
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product_id', 'name slug selling_price variants')
      .lean();

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: updatedCart
    });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing cart item',
      error: error.message
    });
  }
});

// Clear entire cart
router.delete('/clear', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    
    // Find and clear the cart
    const cart = await Cart.findOneAndUpdate(
      { customer_id: customerId },
      { 
        items: [],
        total_items: 0,
        total_amount: 0,
        total_discounted_amount: 0,
        updated_at: new Date()
      },
      { new: true }
    );
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
});

// Get cart item count
router.get('/count', authenticateHybridToken, async (req, res) => {
  try {
    const customerId = req.user.id;
    
    const cart = await Cart.findOne({ customer_id: customerId });
    const itemCount = cart ? cart.total_items : 0;
    
    res.json({
      success: true,
      data: { count: itemCount }
    });
  } catch (error) {
    console.error('Error fetching cart count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart count',
      error: error.message
    });
  }
});

// Sync cart from frontend (migration from cookies/localStorage)
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

    // Find or create cart
    let cart = await Cart.findOne({ customer_id: customerId });
    if (!cart) {
      cart = new Cart({ customer_id: customerId, items: [] });
    }

    // Process each item from frontend
    for (const item of items) {
      if (!item.id || !item.name || !item.price || !item.quantity) {
        continue; // Skip invalid items
      }

      // Check if item already exists (considering variants)
      const existingIndex = cart.items.findIndex(existingItem => 
        existingItem.product_id.toString() === (item.productId || item.id) &&
        (item.variantId ? existingItem.variant_sku === item.variantId : !existingItem.variant_sku)
      );

      if (existingIndex > -1) {
        // Update existing item quantity
        cart.items[existingIndex].quantity += parseInt(item.quantity);
      } else {
        // Add new item
        cart.items.push({
          product_id: item.productId || item.id,
          variant_sku: item.variantId || null,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
          discounted_price: parseFloat(item.price), // Assuming same for now
          product_name: item.name,
          product_image: item.image,
          variant_name: item.variant ? Object.values(item.variant).join(', ') : null,
          variant_attributes: item.variant || null
        });
      }
    }

    await cart.save();

    // Return updated cart with populated product data
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product_id', 'name slug selling_price variants')
      .lean();

    res.json({
      success: true,
      message: 'Cart synced successfully',
      data: updatedCart
    });
  } catch (error) {
    console.error('Error syncing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing cart',
      error: error.message
    });
  }
});

module.exports = router;
