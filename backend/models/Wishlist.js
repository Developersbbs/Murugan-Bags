const mongoose = require("mongoose");

const wishlistItemSchema = new mongoose.Schema({
  product_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  product_name: { 
    type: String, 
    required: true 
  },
  product_image: { 
    type: String, 
    required: false 
  },
  price: { 
    type: Number, 
    required: true 
  },
  discounted_price: { 
    type: Number, 
    required: true 
  },
  added_at: { 
    type: Date, 
    default: Date.now 
  }
});

const wishlistSchema = new mongoose.Schema({
  customer_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customers', 
    required: true,
    unique: true // One wishlist per customer
  },
  items: [wishlistItemSchema],
  total_items: { 
    type: Number, 
    default: 0 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Update totals before saving
wishlistSchema.pre('save', function(next) {
  this.total_items = this.items.length;
  this.updated_at = new Date();
  next();
});

// Add indexes for better performance
wishlistSchema.index({ customer_id: 1 });
wishlistSchema.index({ 'items.product_id': 1 });
wishlistSchema.index({ updated_at: -1 });

module.exports = mongoose.model("Wishlist", wishlistSchema);
