const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customers",
      required: true
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      required: false,
      maxlength: 1000
    },
    images: [{
      type: String
    }],
    verified_purchase: {
      type: Boolean,
      default: false
    },
    helpful_count: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Compound index to ensure one rating per customer per product
ratingSchema.index({ customer_id: 1, product_id: 1 }, { unique: true });

// Index for product queries
ratingSchema.index({ product_id: 1, status: 1 });

// Index for customer queries
ratingSchema.index({ customer_id: 1 });

module.exports = mongoose.models.Rating || mongoose.model("Rating", ratingSchema);
