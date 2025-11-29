const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["new_order", "low_stock"], required: true },
  image_url: { type: String },
  is_read: { type: Boolean, default: false },
  published: { type: Boolean, default: true },
  staff_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notifications", notificationSchema);
