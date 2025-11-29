const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  image_url: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "categories",
    required: true
  },
  seo_title: {
    type: String,
    trim: true,
    maxlength: 60
  },
  seo_description: {
    type: String,
    trim: true,
    maxlength: 160
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false // Made optional for now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for category count through junction table (for many-to-many)
subcategorySchema.virtual('categoryCount', {
  ref: 'CategorySubcategoryMap',
  localField: '_id',
  foreignField: 'subcategory_id',
  count: true
});

// Virtual for product count
subcategorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'subcategory_id',
  count: true
});

// Indexes for Subcategory
subcategorySchema.index({ name: 1 });
subcategorySchema.index({ slug: 1 });
subcategorySchema.index({ category_id: 1 });

// Pre-save middleware to generate slug
subcategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model("subcategories", subcategorySchema);
