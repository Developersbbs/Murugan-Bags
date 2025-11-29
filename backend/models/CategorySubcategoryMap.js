const mongoose = require("mongoose");

const categorySubcategoryMapSchema = new mongoose.Schema({
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'categories',
    required: true
  },
  subcategory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'subcategories',
    required: true
  },
  sort_order: {
    type: Number,
    default: 0
  },
  is_primary: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false // Made optional for now
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false, // Using manual timestamps
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to prevent duplicate mappings
categorySubcategoryMapSchema.index(
  { category_id: 1, subcategory_id: 1 },
  { unique: true }
);

// Index for efficient querying
categorySubcategoryMapSchema.index({ category_id: 1, sort_order: 1 });
categorySubcategoryMapSchema.index({ subcategory_id: 1, sort_order: 1 });
categorySubcategoryMapSchema.index({ is_primary: 1 });

// Pre-save middleware to update timestamp
categorySubcategoryMapSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model("category_subcategory_maps", categorySubcategoryMapSchema);
