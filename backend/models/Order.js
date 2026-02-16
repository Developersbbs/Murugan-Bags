const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variant_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Variant",
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // selling price
        subtotal: { type: Number, required: true },
      },
    ],

    shipping_cost: { type: Number, default: 0 },
    total_amount: { type: Number, required: true },

    payment_method: {
      type: String,
      enum: ["cash", "online", "razorpay"],
      required: true
    },
    payment_status: { type: String, default: "pending" },

    status: {
      type: String,
      enum: ["payment_pending", "processing", "shipped", "delivered", "cancelled"],
      default: "processing",
    },

    tracking_number: { type: String },
    estimated_delivery: { type: Date },

    invoice_no: { type: String },
    order_time: { type: Date, default: Date.now },

    shipping_address: {
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
  },
  { timestamps: true }
);

// Indexes for analytics performance
orderSchema.index({ order_time: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "items.product_id": 1 });
orderSchema.index({ customer_id: 1 });

module.exports = mongoose.model("Order", orderSchema);
