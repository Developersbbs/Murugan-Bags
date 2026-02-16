const express = require("express");
const Razorpay = require("razorpay");
const Order = require("../models/Order.js");
const OrderItem = require("../models/OrderItem.js");
const Cart = require("../models/Cart.js");
const { authenticateHybridToken } = require('../middleware/hybridAuth');
const router = express.Router();

// Initialize Razorpay
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized successfully');
  } else {
    console.warn('⚠️  Razorpay credentials not found. Payment features will not work.');
    console.warn('Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file');
  }
} catch (error) {
  console.error('❌ Failed to initialize Razorpay:', error.message);
  razorpay = null;
}

// Test route to verify payment routes are loading
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Payment routes are working",
    timestamp: new Date().toISOString(),
    razorpay_configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  });
});

// Create Razorpay order
router.post("/create-order", authenticateHybridToken, async (req, res) => {
  try {
    console.log("🔍 PAYMENT DEBUG: Received create-order request");
    console.log("🔍 PAYMENT DEBUG: User:", req.user);
    console.log("🔍 PAYMENT DEBUG: Request body:", JSON.stringify(req.body, null, 2));

    // Check if Razorpay is configured
    if (!razorpay) {
      console.log("❌ PAYMENT DEBUG: Razorpay not configured");
      return res.status(503).json({
        error: "Payment gateway not configured. Please contact administrator.",
        details: "Razorpay credentials are missing or invalid"
      });
    }
    const {
      shipping_address,
      items,
      shipping_cost = 0,
      coupon_id = null
    } = req.body;

    console.log("🔍 PAYMENT DEBUG: Parsed request data:");
    console.log("- customer_id:", req.user?.id);
    console.log("- shipping_address:", shipping_address);
    console.log("- items:", items);
    console.log("- shipping_cost:", shipping_cost);
    console.log("- coupon_id:", coupon_id);

    // Get customer_id from authenticated user
    const customer_id = req.user.id;

    // Validate required fields
    if (!customer_id || !shipping_address || !items || items.length === 0) {
      console.log("❌ PAYMENT DEBUG: Validation failed");
      console.log("- customer_id:", customer_id);
      console.log("- shipping_address:", !!shipping_address);
      console.log("- items:", items?.length);
      return res.status(400).json({
        error: "Missing required fields: shipping_address, items"
      });
    }

    console.log("✅ PAYMENT DEBUG: Validation passed");

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total_amount = subtotal + shipping_cost + tax;

    console.log("🔍 PAYMENT DEBUG: Calculated totals:");
    console.log("- subtotal:", subtotal);
    console.log("- tax:", tax);
    console.log("- total_amount:", total_amount);

    // Convert amount to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(total_amount * 100);
    console.log("🔍 PAYMENT DEBUG: Amount in paise:", amountInPaise);

    // Generate invoice number
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const invoice_no = `ORD-${timestamp}-${randomNum}`;

    // Create Razorpay order options
    const options = {
      amount: amountInPaise, // Amount in paise
      currency: "INR",
      receipt: invoice_no,
      payment_capture: 1, // Auto capture payment
    };

    console.log("🔍 PAYMENT DEBUG: Creating Razorpay order with options:", options);

    // Create Razorpay order with timeout
    const razorpayOrderPromise = razorpay.orders.create(options);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Razorpay API timeout')), 5000)
    );

    const razorpayOrder = await Promise.race([razorpayOrderPromise, timeoutPromise]);
    console.log("✅ PAYMENT DEBUG: Razorpay order created:", razorpayOrder.id);

    // Create order in database with payment_pending status
    const order = new Order({
      customer_id,
      coupon_id,
      invoice_no,
      payment_method: 'razorpay',
      shipping_cost,
      total_amount,
      status: 'payment_pending',
      shipping_address,
      razorpay_order_id: razorpayOrder.id,
      payment_status: 'pending',
      estimated_delivery: null, // Will be set after payment
      tracking_number: null // Will be set after payment
    });

    console.log("🔍 PAYMENT DEBUG: Saving order to database...");
    const savedOrder = await order.save();
    console.log("✅ PAYMENT DEBUG: Order saved with ID:", savedOrder._id);

    // Create order items
    const orderItems = items.map(item => ({
      order_id: invoice_no,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    console.log("🔍 PAYMENT DEBUG: Saving order items...");
    await OrderItem.insertMany(orderItems);
    console.log("✅ PAYMENT DEBUG: Order items saved");

    console.log("✅ PAYMENT DEBUG: Order creation completed successfully");

    res.status(201).json({
      success: true,
      message: "Razorpay order created successfully",
      order: {
        ...savedOrder.toObject(),
        items: orderItems,
        subtotal,
        tax,
        total: total_amount
      },
      razorpay_order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt
      }
    });

  } catch (error) {
    console.error('❌ PAYMENT DEBUG: Create order error:', error);
    console.error('❌ PAYMENT DEBUG: Error details:', error.message);
    console.error('❌ PAYMENT DEBUG: Error stack:', error.stack);

    // Log to file for debugging
    try {
      const fs = require('fs');
      const path = require('path');
      const logFile = path.join(__dirname, '../debug_payments.log');
      const logData = `
----------------------------------------
Timestamp: ${new Date().toISOString()}
Error: ${error.message}
Stack: ${error.stack}
Request User: ${JSON.stringify(req.user)}
Request Body: ${JSON.stringify(req.body)}
Items: ${JSON.stringify(req.body.items)}
Calculated Amount (Paise): ${Math.round((req.body.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) + (req.body.shipping_cost || 0)) * 1.1 * 100)}
----------------------------------------
`;
      fs.appendFileSync(logFile, logData);
    } catch (fsError) {
      console.error('Failed to write to log file:', fsError);
    }

    res.status(500).json({
      error: "Failed to create Razorpay order",
      details: error.message
    });
  }
});

// Verify Razorpay payment
router.post("/verify-payment", authenticateHybridToken, async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const logFile = path.join(__dirname, '../debug_payments.log');

  const log = (msg) => {
    try {
      fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) { console.error(e); }
  };

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id
    } = req.body;

    log(`VERIFY REQUEST: User=${req.user.id}, Order=${order_id}, RZ_Order=${razorpay_order_id}`);

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      log('MISSING FIELDS');
      return res.status(400).json({
        error: "Missing required payment verification fields"
      });
    }

    // Verify payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = require("crypto")
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      log('INVALID SIGNATURE');
      return res.status(400).json({
        error: "Payment verification failed - invalid signature"
      });
    }

    // Find and update the order
    const order = await Order.findOne({ invoice_no: order_id });

    if (!order) {
      log(`ORDER NOT FOUND: ${order_id}`);
      return res.status(404).json({
        error: "Order not found"
      });
    }

    log(`ORDER FOUND: ID=${order._id}, Customer=${order.customer_id}, Status=${order.status}`);
    log(`COMPARING: OrderCustomer=${order.customer_id} vs ReqUser=${req.user.id}`);

    if (order.customer_id.toString() !== req.user.id.toString()) {
      log('UNAUTHORIZED ACCESS ATTEMPT');
      return res.status(403).json({
        error: "Unauthorized to access this order"
      });
    }

    // Update order with payment details
    order.razorpay_payment_id = razorpay_payment_id;
    order.razorpay_signature = razorpay_signature;
    order.payment_status = 'completed';
    order.status = 'processing'; // Move to processing after payment

    // Set estimated delivery (7-14 days from order time)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 7) + 7);
    order.estimated_delivery = estimatedDelivery;

    await order.save();
    log('ORDER UPDATED SUCCESSFULLY');

    // Clear user's cart after successful payment
    await Cart.deleteMany({ customer_id: req.user.id });

    res.json({
      success: true,
      message: "Payment verified and order confirmed successfully",
      order: order,
      payment_details: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    log(`VERIFY ERROR: ${error.message}\n${error.stack}`);
    res.status(500).json({
      error: "Payment verification failed",
      details: error.message
    });
  }
});

// Handle payment failure
router.post("/payment-failed", authenticateHybridToken, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      order_id,
      error_description
    } = req.body;

    // Find the order
    const order = await Order.findOne({ invoice_no: order_id });

    if (!order) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    if (order.customer_id !== req.user.id) {
      return res.status(403).json({
        error: "Unauthorized to access this order"
      });
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    order.payment_status = 'failed';
    await order.save();

    res.json({
      success: true,
      message: "Payment failure recorded",
      order: order
    });

  } catch (error) {
    console.error('Payment failure handling error:', error);
    res.status(500).json({
      error: "Failed to handle payment failure",
      details: error.message
    });
  }
});

// Get Razorpay configuration (for frontend)
router.get("/config", (req, res) => {
  if (!razorpay || !process.env.RAZORPAY_KEY_ID) {
    return res.status(503).json({
      error: "Payment gateway not configured",
      configured: false
    });
  }

  res.json({
    key_id: process.env.RAZORPAY_KEY_ID,
    currency: "INR",
    configured: true
  });
});

module.exports = router;
