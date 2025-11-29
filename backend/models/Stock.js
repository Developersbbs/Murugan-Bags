const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product.product_variants",
      default: null // null for base product stock
    },
    quantity: {
      type: Number,
      required: false, // Allow null when stock not set
      min: 0,
      default: null
    },
    minStock: {
      type: Number,
      min: 0,
      default: 0
    },
    notes: {
      type: String,
      default: ""
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Index for efficient queries
stockSchema.index({ productId: 1, variantId: 1 }, { unique: true });

// Pre-save middleware to log inventory changes
stockSchema.pre('save', async function(next) {
  if (this.isModified('quantity') && !this.isNew) {
    const InventoryLog = mongoose.model('inventory_logs');
    const change = this.quantity - this._originalQuantity || 0;

    if (change !== 0) {
      await InventoryLog.create({
        product_id: this.productId.toString(),
        staff_id: this.lastUpdatedBy.toString(),
        change: change,
        reason: `Stock updated from ${this._originalQuantity || 0} to ${this.quantity}`
      });
    }
  }
  next();
});

module.exports = mongoose.models.Stock || mongoose.model("Stock", stockSchema);
