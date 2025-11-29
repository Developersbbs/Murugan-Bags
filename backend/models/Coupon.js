const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  campaign_name: { type: String, required: true },
  code: { type: String, required: true },
  discount_type: { type: String, enum: ["percentage", "fixed"], required: true },
  discount_value: { type: Number, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  image_url: { type: String },
  published: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Coupons", couponSchema);
