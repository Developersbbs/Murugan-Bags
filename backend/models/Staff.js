const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  image_url: { type: String, default: null },
  joining_date: { type: Date },
  published: { type: Boolean, default: true },
  is_active: { type: Boolean, default: true },
  role_id: { type: String, default: "staff" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ✅ Fix: Prevent OverwriteModelError
const Staff = mongoose.models.Staff || mongoose.model("Staff", staffSchema);

module.exports = Staff;
