const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
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
    unique: true,
    lowercase: true,
    trim: true
  },
  published: {
    type: Boolean,
    default: true
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
  },
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "subcategories"
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subcategory count through junction table
categorySchema.virtual('subcategoryCount', {
  ref: 'CategorySubcategoryMap',
  localField: '_id',
  foreignField: 'category_id',
  count: true
});

// Indexes for Category
categorySchema.index({ published: 1 });

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model("categories", categorySchema);
