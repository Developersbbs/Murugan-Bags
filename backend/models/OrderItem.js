const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  order_id: { type: String, required: true },
  product_id: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
});

module.exports = mongoose.model("order_items", orderItemSchema);
