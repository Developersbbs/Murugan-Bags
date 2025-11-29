const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  variant_sku: { 
    type: String, 
    required: false // For products with variants
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1,
    default: 1
  },
  price: { 
    type: Number, 
    required: true 
  },
  discounted_price: { 
    type: Number, 
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
  variant_name: { 
    type: String, 
    required: false 
  },
  variant_attributes: { 
    type: mongoose.Schema.Types.Mixed, 
    required: false 
  },
  added_at: { 
    type: Date, 
    default: Date.now 
  }
});

const cartSchema = new mongoose.Schema({
  customer_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customers', 
    required: true,
    unique: true // One cart per customer
  },
  items: [cartItemSchema],
  total_items: { 
    type: Number, 
    default: 0 
  },
  total_amount: { 
    type: Number, 
    default: 0 
  },
  total_discounted_amount: { 
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
cartSchema.pre('save', function(next) {
  this.total_items = this.items.reduce((total, item) => total + item.quantity, 0);
  this.total_amount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  this.total_discounted_amount = this.items.reduce((total, item) => total + (item.discounted_price * item.quantity), 0);
  this.updated_at = new Date();
  next();
});

// Add indexes for better performance
cartSchema.index({ customer_id: 1 });
cartSchema.index({ 'items.product_id': 1 });
cartSchema.index({ updated_at: -1 });

module.exports = mongoose.model("Cart", cartSchema);
