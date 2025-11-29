const mongoose = require("mongoose");

const inventoryLogSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  staff_id: { type: String, required: true },
  change: { type: Number, required: true },
  reason: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("inventory_logs", inventoryLogSchema);
