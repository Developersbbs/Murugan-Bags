const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: false, unique: true, sparse: true }, // Optional email field
  phone: { type: String, required: false }, // Remove unique: true from here - will be handled by index
  password: { type: String, required: false }, // Optional for phone-only auth
  firebase_uid: { type: String, unique: true, sparse: true },
  google_id: { type: String }, // For Google authentication
  image_url: { type: String, required: false }, // For profile images
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  is_active: { type: Boolean, default: true },
  address: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Add indexes for better query performance
customerSchema.index({ name: 1 });
// Create unique index for phone with partial filter to allow multiple nulls but ensure unique non-null values
customerSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $exists: true, $type: "string" } } });
// Create unique index for google_id with partial filter to allow multiple nulls but ensure unique non-null values
customerSchema.index({ google_id: 1 }, { unique: true, partialFilterExpression: { google_id: { $exists: true, $type: "string" } } });

// Ensure either email or phone is provided (but not requiring both)
// Also ensure phone field is not empty string for unique constraint
customerSchema.pre('save', function (next) {
  if (!this.email && !this.phone) {
    return next(new Error('Either email or phone number is required'));
  }

  // If phone is empty string, null, or undefined, set it to undefined so unique constraint doesn't apply
  if (this.phone === '' || this.phone === null || this.phone === undefined) {
    this.phone = undefined;
  }

  next();
});

module.exports = mongoose.model("Customers", customerSchema);
