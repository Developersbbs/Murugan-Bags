const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order.js");
const OrderItem = require("../models/OrderItem.js");
const Cart = require("../models/Cart.js");
const Stock = require("../models/Stock.js");
const Product = require("../models/Product.js");
const { authenticateToken } = require('../middleware/auth');
const { authenticateFirebaseToken } = require('../middleware/firebaseAuth');
const { authenticateHybridToken } = require('../middleware/hybridAuth');
const router = express.Router();
const { syncProductWithStock } = require("./stock");

// Test route to verify orders routes are loading
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Orders routes are working",
    timestamp: new Date().toISOString()
  });
});

// Check if user has purchased a specific product
router.get("/check-purchase/:productId", authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const Customer = require('../models/Customer');

    // Use authenticated user's ID
    const customerId = req.user.id;

    // For JWT auth, find customer by ID
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.json({
        success: true,
        hasPurchased: false
      });
    }

    // Check if customer has purchased this product using new embedded items schema
    const hasPurchased = await Order.findOne({
      customer_id: customer._id,
      status: { $in: ['processing', 'shipped', 'delivered'] },
      'items.product_id': productId
    });

    res.json({
      success: true,
      hasPurchased: !!hasPurchased
    });
  } catch (err) {
    console.error("Error checking purchase status:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET all orders with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      method,
      startDate,
      endDate
    } = req.query;

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    // Build filter query
    let filter = {};

    if (search) {
      filter.$or = [
        { invoice_no: { $regex: search, $options: "i" } },
        { "shipping_address.name":  { $regex: search, $options: "i" } },
        { "shipping_address.email": { $regex: search, $options: "i" } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (method) {
      filter.payment_method = method;
    }

    if (startDate || endDate) {
      filter.order_time = {};
      if (startDate) filter.order_time.$gte = new Date(startDate);
      if (endDate)   filter.order_time.$lte = new Date(endDate);
    }

    // Execute queries
    const orders = await Order.find(filter)
      .populate({
        path: "customer_id",
        select: "name email phone",
        model: "Customers",
      })
      .select('-__v')
      .sort({ order_time: -1 })
      .skip(skip)
      .limit(limitNum);

    const total      = await Order.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Transform orders to match frontend structure
    const transformedOrders = orders.map(order => {
      const transformed = {
        ...order.toObject(),
        id: order._id.toString(),
        customers: {
          name: order.customer_id?.name || order.shipping_address?.name,
          address: `${order.shipping_address?.street || ''}, ${order.shipping_address?.city || ''}, ${order.shipping_address?.state || ''} ${order.shipping_address?.zipCode || ''}`.trim(),
          phone: order.shipping_address?.phone || order.customer_id?.phone
        },
        customer: order.customer_id
      };

      console.log('🔍 Transformed order:', {
        _id: order._id,
        id: transformed.id,
        invoice_no: order.invoice_no
      });

      return transformed;
    });

    res.json({
      success: true,
      items: transformedOrders,
      pagination: {
        total,
        current: pageNum,
        limit:   limitNum,
        pages:   totalPages,
        prev: pageNum > 1          ? pageNum - 1 : null,
        next: pageNum < totalPages ? pageNum + 1 : null,
      },
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET orders by customer ID
router.get("/customer/:customerId", authenticateHybridToken, async (req, res) => {
  try {
    const orders = await Order.find({ customer_id: req.params.customerId })
      .sort({ order_time: -1 });

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ order_id: order.invoice_no });
        return {
          ...order.toObject(),
          items: items
        };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET orders by Firebase UID (for frontend compatibility)
router.get("/customer/firebase/:firebaseUid", authenticateHybridToken, async (req, res) => {
  console.log('Firebase orders route called with UID:', req.params.firebaseUid);
  try {
    const Customer = require('../models/Customer');

    // Find customer by Firebase UID
    const customer = await Customer.findOne({ firebase_uid: req.params.firebaseUid });
    console.log('Customer found:', customer ? customer._id : 'Not found');
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const orders = await Order.find({ customer_id: customer._id.toString() })
      .sort({ order_time: -1 });

    console.log('Orders found:', orders.length);

    // Enhance items with product information (items are now embedded in order)
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const enhancedItems = await Promise.all(
          order.items.map(async (item) => {
            try {
              const Product    = require('../models/Product');
              const ComboOffer = require('../models/ComboOffer');

              let product = await Product.findById(item.product_id);
              let isCombo = false;

              if (!product) {
                product = await ComboOffer.findById(item.product_id);
                if (product) isCombo = true;
              }

              // DEBUG LOG
              if (item.product_id.toString() === '694e3dcb954bc1a935ff0920' || !product) {
                console.log(`[Order Debug] Item: ${item.name} (${item.product_id})`);
                console.log(`[Order Debug] Product found: ${!!product} (isCombo: ${isCombo})`);
                if (product) {
                  console.log(`[Order Debug] product.${isCombo ? 'image' : 'image_url'}:`, isCombo ? product.image : product.image_url);
                }
              }

              let imageUrl = '/images/products/placeholder-product.svg';

              if (product) {
                if (isCombo) {
                  imageUrl = product.image || '/images/products/placeholder-product.svg';
                } else {
                  // ✅ FIX: If order item has a variant_id, try to get variant image first
                  if (item.variant_id && product.product_variants && product.product_variants.length > 0) {
                    const matchedVariant = product.product_variants.find(
                      v => v._id.toString() === item.variant_id.toString()
                    );
                    if (matchedVariant && matchedVariant.images && matchedVariant.images.length > 0) {
                      imageUrl = matchedVariant.images[0];
                    }
                  }

                  // Fall back to main product image if no variant image found
                  if (imageUrl === '/images/products/placeholder-product.svg') {
                    if (product.images && product.images.length > 0) {
                      const img = product.images[0];
                      imageUrl = typeof img === 'string' ? img : (img.url || img.secure_url);
                    } else if (product.image_url) {
                      if (Array.isArray(product.image_url) && product.image_url.length > 0) {
                        const img = product.image_url[0];
                        imageUrl = typeof img === 'string' ? img : (img.url || img.secure_url);
                      } else if (typeof product.image_url === 'string') {
                        imageUrl = product.image_url;
                      }
                    }

                    // Legacy "image" property
                    if (imageUrl === '/images/products/placeholder-product.svg' && product.image) {
                      imageUrl = product.image;
                    }
                  }
                }
              }

              // ✅ FIX: Resolve correct product name for variants
              let productName = 'Product Not Found';
              if (product) {
                if (isCombo) {
                  productName = product.title;
                } else if (item.variant_id && product.product_variants && product.product_variants.length > 0) {
                  const matchedVariant = product.product_variants.find(
                    v => v._id.toString() === item.variant_id.toString()
                  );
                  productName = matchedVariant
                    ? `${product.name} - ${matchedVariant.name || matchedVariant.slug}`
                    : product.name;
                } else {
                  productName = product.name;
                }
              }

              return {
                ...item.toObject(),
                id:    item._id,
                name:  productName,
                image: imageUrl,
                sku:   product ? (isCombo ? 'COMBO' : (product.sku || 'N/A')) : 'N/A',
                price: item.price || 0
              };
            } catch (error) {
              return {
                ...item.toObject(),
                id:    item._id,
                name:  'Product Not Found',
                image: '/images/products/placeholder-product.svg',
                sku:   'N/A',
                price: item.price || 0
              };
            }
          })
        );

        return {
          ...order.toObject(),
          items: enhancedItems,
          shipping_address: order.shipping_address || {}
        };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    console.error('Error fetching orders by Firebase UID:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export orders to CSV
router.get("/export/csv", async (req, res) => {
  try {
    const { search, status, method, startDate, endDate } = req.query;

    // Build filter query
    let filter = {};

    if (search) {
      filter.$or = [
        { invoice_no: { $regex: search, $options: "i" } },
        { "shipping_address.name":  { $regex: search, $options: "i" } },
        { "shipping_address.email": { $regex: search, $options: "i" } }
      ];
    }

    if (status)  filter.status         = status;
    if (method)  filter.payment_method = method;

    if (startDate || endDate) {
      filter.order_time = {};
      if (startDate) filter.order_time.$gte = new Date(startDate);
      if (endDate)   filter.order_time.$lte = new Date(endDate);
    }

    // Fetch orders with customer data
    const orders = await Order.find(filter)
      .populate({
        path: "customer_id",
        select: "name email phone",
        model: "Customers",
      })
      .sort({ order_time: -1 });

    // Transform orders for CSV
    const csvOrders = orders.map(order => ({
      'Invoice No':       order.invoice_no,
      'Order Date':       new Date(order.order_time).toLocaleDateString(),
      'Customer Name':    order.customer_id?.name  || order.shipping_address?.name  || 'N/A',
      'Customer Email':   order.shipping_address?.email || order.customer_id?.email || 'N/A',
      'Customer Phone':   order.shipping_address?.phone || order.customer_id?.phone || 'N/A',
      'Payment Method':   order.payment_method,
      'Order Status':     order.status,
      'Shipping Cost':    order.shipping_cost || 0,
      'Total Amount':     order.total_amount,
      'Shipping Address': `${order.shipping_address?.street || ''}, ${order.shipping_address?.city || ''}, ${order.shipping_address?.state || ''} ${order.shipping_address?.zipCode || ''}`.trim()
    }));

    // Convert to CSV
    const csv = convertToCSV(csvOrders);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Error exporting orders:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Helper function to convert array of objects to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers    = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',');
  });

  return csvHeaders + '\n' + csvRows.join('\n');
}

// GET a single order by id
router.get("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log('🔍 Fetching order with ID:', orderId);

    const order = await Order.findOne({ _id: orderId })
      .populate({
        path: "customer_id",
        select: "name email phone",
        model: "Customers",
      })
      .select('-__v');

    if (!order) {
      console.log('❌ Order not found with ID:', orderId);
      return res.status(404).json({ error: "Order not found" });
    }

    console.log('✅ Found order:', {
      _id:        order._id,
      invoice_no: order.invoice_no,
      status:     order.status
    });

    // Get order items with product details
    const items = await OrderItem.find({ order_id: order.invoice_no });

    // Enhance items with product information
    const enhancedItems = await Promise.all(
      items.map(async (item) => {
        try {
          const Product    = require('../models/Product');
          const ComboOffer = require('../models/ComboOffer');

          let product = await Product.findById(item.product_id);
          let isCombo = false;

          if (!product) {
            product = await ComboOffer.findById(item.product_id);
            if (product) isCombo = true;
          }

          let imageUrl = '/images/products/placeholder-product.svg';
          if (product && isCombo) {
            imageUrl = product.image || '/images/products/placeholder-product.svg';
          } else if (product) {
            imageUrl = product.images?.[0]?.url || product.image_url?.[0] || product.image || '/images/products/placeholder-product.svg';
          }

          return {
            ...item.toObject(),
            id:         item._id,
            unit_price: item.unit_price || item.price || 0,
            quantity:   item.quantity || 1,
            products: {
              name:  product ? (isCombo ? product.title : product.name) : 'Product Not Found',
              image: imageUrl,
              sku:   product ? (isCombo ? 'COMBO' : (product.sku || 'N/A')) : 'N/A'
            }
          };
        } catch (error) {
          return {
            ...item.toObject(),
            id:         item._id,
            unit_price: item.unit_price || item.price || 0,
            quantity:   item.quantity || 1,
            products: {
              name:  'Product Not Found',
              image: '/images/products/placeholder-product.svg',
              sku:   'N/A'
            }
          };
        }
      })
    );

    // Transform order to match frontend structure
    const transformedOrder = {
      ...order.toObject(),
      id: order._id.toString(),
      customers: {
        name:    order.customer_id?.name  || order.shipping_address?.name  || 'N/A',
        email:   order.shipping_address?.email || order.customer_id?.email || 'N/A',
        address: `${order.shipping_address?.street || ''}, ${order.shipping_address?.city || ''}, ${order.shipping_address?.state || ''} ${order.shipping_address?.zipCode || ''}`.trim(),
        phone:   order.shipping_address?.phone || order.customer_id?.phone
      },
      customer:    order.customer_id,
      order_items: enhancedItems,
      coupons:     order.coupons || null
    };

    console.log('🔍 Transformed single order:', {
      _id:        order._id,
      id:         transformedOrder.id,
      invoice_no: order.invoice_no
    });

    res.json({
      success: true,
      data: transformedOrder
    });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST place order (Cash on Delivery)
router.post("/place-order", authenticateHybridToken, async (req, res) => {
  try {
    const {
      payment_method,
      shipping_address,
      items,
      shipping_cost = 0,
      coupon_id = null
    } = req.body;

    // Get customer_id from authenticated user
    const customer_id = req.user.id;

    // Validate required fields
    if (!customer_id || !payment_method || !shipping_address || !items || items.length === 0) {
      return res.status(400).json({
        error: "Missing required fields: payment_method, shipping_address, items"
      });
    }

    // Only allow cash on delivery for now
    if (payment_method !== 'cash') {
      return res.status(400).json({
        error: "Only Cash on Delivery payment method is supported"
      });
    }

    // ✅ FIX: Validate that each item has required fields before saving
    for (const item of items) {
      if (!item.product_id) {
        return res.status(400).json({
          error: "Each item must have a valid product_id"
        });
      }
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          error: "Each item must have a valid quantity"
        });
      }
      if (item.unit_price === undefined || item.unit_price === null) {
        return res.status(400).json({
          error: "Each item must have a valid unit_price"
        });
      }
    }

    // ✅ NEW: Validate stock availability before creating order
    console.log('📦 Validating stock availability for order items...');
    for (const item of items) {
      // First, get the product to find the actual variant ID
      const product = await Product.findById(item.product_id);
      if (!product) {
        return res.status(400).json({
          error: `Product not found: ${item.product_id}`
        });
      }

      // Determine the variant ID
      let actualVariantId = item.variant_id || null;

      // If no variant_id provided but product has variants, try to find matching variant
      if (!actualVariantId && product.product_variants && product.product_variants.length > 0) {
        // Try to match by SKU first if provided
        if (item.variant_sku) {
          const matchedVariant = product.product_variants.find(v => v.sku === item.variant_sku);
          if (matchedVariant) {
            actualVariantId = matchedVariant._id;
            console.log(`📍 Found variant by SKU: ${item.variant_sku} -> ${actualVariantId}`);
          }
        }
        
        // Fallback: if still not found and attributes provided, match by attributes
        if (!actualVariantId && item.variant_attributes) {
          const matchedVariant = product.product_variants.find(v => {
            if (!v.attributes) return false;
            const vAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
            return Object.keys(item.variant_attributes).every(
              key => String(item.variant_attributes[key]) === String(vAttrs[key])
            );
          });
          if (matchedVariant) {
            actualVariantId = matchedVariant._id;
            console.log(`📍 Found variant by attributes: ${actualVariantId}`);
          }
        }
      }

      const stockQuery = {
        productId: item.product_id,
        variantId: actualVariantId
      };

      console.log(`🔍 Checking stock with query:`, stockQuery);
      const stock = await Stock.findOne(stockQuery);

      if (!stock) {
        return res.status(400).json({
          error: `Stock not configured for this product variant. Please contact support.`
        });
      }

      if (stock.quantity === null || stock.quantity === undefined) {
        return res.status(400).json({
          error: `Stock quantity not set for product`
        });
      }

      if (stock.quantity < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock. Available: ${stock.quantity}, Required: ${item.quantity}`
        });
      }
    }

    // Calculate totals
    const subtotal     = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax          = subtotal * 0.1; // 10% tax
    const total_amount = subtotal + shipping_cost + tax;

    // Generate invoice number
    const timestamp  = Date.now();
    const randomNum  = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const invoice_no = `ORD-${timestamp}-${randomNum}`;

    // Calculate estimated delivery (7-14 days from order time)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 7) + 7);

    // ✅ FIX: Prepare items array — explicitly map each field to avoid
    //         stale/wrong data coming through from the frontend payload
    const orderItems = items.map(item => ({
      product_id: item.product_id,                   // Must be the selected product
      variant_id: item.variant_id || null,            // null for simple products
      quantity:   item.quantity,
      price:      item.unit_price,                    // selling price at time of order
      subtotal:   item.unit_price * item.quantity
    }));

    // Create order with embedded items
    const order = new Order({
      customer_id,
      items: orderItems,
      shipping_cost,
      total_amount,
      payment_method,
      shipping_address,
      invoice_no,
      estimated_delivery: estimatedDelivery,
      tracking_number:    null,
      status: 'processing'
    });

    const savedOrder = await order.save();

    // ✅ NEW: Deduct stock for each item after successful order creation
    console.log('📉 Deducting stock for order items...');
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const product = await Product.findById(item.product_id);
      
      if (!product) {
        console.error(`❌ Product not found for stock deduction: ${item.product_id}`);
        continue;
      }

      // Resolve the actual variant ID (same logic as validation above)
      let actualVariantId = item.variant_id || null;

      if (!actualVariantId && product.product_variants && product.product_variants.length > 0) {
        if (item.variant_sku) {
          const matchedVariant = product.product_variants.find(v => v.sku === item.variant_sku);
          if (matchedVariant) {
            actualVariantId = matchedVariant._id;
          }
        }
        
        if (!actualVariantId && item.variant_attributes) {
          const matchedVariant = product.product_variants.find(v => {
            if (!v.attributes) return false;
            const vAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
            return Object.keys(item.variant_attributes).every(
              key => String(item.variant_attributes[key]) === String(vAttrs[key])
            );
          });
          if (matchedVariant) {
            actualVariantId = matchedVariant._id;
          }
        }
      }

      const stockQuery = {
        productId: item.product_id,
        variantId: actualVariantId
      };

      const updatedStock = await Stock.findOneAndUpdate(
        stockQuery,
        {
          $inc: { quantity: -item.quantity },
          $set: {
            updated_at: new Date(),
            notes: `Stock reduced via order placement (${invoice_no}): -${item.quantity} units`
          }
        },
        { new: true }
      );

      if (!updatedStock) {
        console.error(`❌ Failed to update stock for product ${item.product_id}`);
        // Continue with order but log the error
      } else {
        console.log(`✅ Stock updated for product ${item.product_id}: -${item.quantity} (remaining: ${updatedStock.quantity})`);
        
        // ✅ NEW: Sync product status based on updated stock
        await syncProductWithStock(updatedStock);
      }
    }

    // Clear user's cart after successful order
    await Cart.deleteMany({ customer_id });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: {
        ...savedOrder.toObject(),
        subtotal,
        tax,
        total: total_amount
      }
    });

  } catch (err) {
    console.error('Order placement error:', err);
    res.status(500).json({ error: "Failed to place order", details: err.message });
  }
});

// POST create new order (legacy)
router.post("/", async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update order
router.put("/:id", async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update order status with proper stock management
// Deducts stock when order moves to "dispatched"
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const orderId    = req.params.id;

    const validStatuses = [
      "delivered", "cancelled", "pending",
      "processing", "shipped", "dispatched"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const Stock = require("../models/Stock");
    const { syncProductWithStock } = require("../routes/stock");

    const currentOrder = await Order.findById(orderId);
    if (!currentOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const previousStatus = currentOrder.status;

    // ✅ FIX: Deduct stock when transitioning to "dispatched" (only once)
    if (status === "dispatched" && previousStatus !== "dispatched") {

      for (const item of currentOrder.items) {

        // ✅ FIX: Use explicit null for simple products so DB query matches correctly
        const stockQuery = {
          productId: item.product_id,
          variantId: item.variant_id ? item.variant_id : null
        };

        const stock = await Stock.findOne(stockQuery);

        if (!stock) {
          console.log(`Stock not found for product ${item.product_id} variant ${item.variant_id || 'none'}`);
          continue;
        }

        // Safety check
        if (stock.quantity < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for product ${item.product_id}. Available: ${stock.quantity}, Required: ${item.quantity}`
          });
        }

        // ✅ Atomic decrement (race-condition safe)
        const updatedStock = await Stock.findOneAndUpdate(
          { _id: stock._id, quantity: { $gte: item.quantity } },
          {
            $inc: { quantity: -item.quantity },
            $set: {
              updated_at: new Date(),
              notes: `Reduced via order dispatch (${currentOrder.invoice_no}): ${stock.quantity} → ${stock.quantity - item.quantity}`
            }
          },
          { new: true }
        );

        if (!updatedStock) {
          return res.status(400).json({
            error: `Stock update failed due to concurrent modification for product ${item.product_id}`
          });
        }

        // ✅ FIX: syncProductWithStock re-fetches fresh stock data internally
        //         so minStock is always accurate for low-stock alert calculation
        await syncProductWithStock(updatedStock);

        console.log(`Stock reduced for product ${item.product_id}: -${item.quantity} (remaining: ${updatedStock.quantity})`);
      }
    }

    // Update order status
    currentOrder.status     = status;
    currentOrder.updated_at = new Date();
    await currentOrder.save();

    res.json({
      success: true,
      message: "Order status updated successfully",
      order: currentOrder
    });

  } catch (err) {
    console.error("Order status update error:", err);
    res.status(500).json({
      error: "Failed to update order status"
    });
  }
});

// PATCH update order status (admin functionality)
// Deducts stock when order moves to "delivered"
router.patch("/:id/status", authenticateHybridToken, async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;

    // Validate status
    const validStatuses = ["delivered", "cancelled", "pending", "processing", "shipped"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const Stock = require("../models/Stock");
    const { syncProductWithStock } = require("../routes/stock");

    // Fetch the current order
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const previousStatus = currentOrder.status;

    // ✅ FIX: Deduct stock when transitioning to "delivered" (only once)
    if (status === "delivered" && previousStatus !== "delivered") {
      console.log(`🚚 Order ${currentOrder.invoice_no} marked as delivered — deducting stock...`);

      for (const item of currentOrder.items) {

        // ✅ FIX: Use explicit null for simple products so DB query matches correctly
        const stockQuery = {
          productId: item.product_id,
          variantId: item.variant_id ? item.variant_id : null
        };

        const stock = await Stock.findOne(stockQuery);

        if (!stock) {
          console.log(`⚠️ Stock not found for product ${item.product_id} variant ${item.variant_id || 'none'} — skipping`);
          continue;
        }

        // Safety check: ensure enough stock exists
        if (stock.quantity < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for product ${item.product_id}. Available: ${stock.quantity}, Required: ${item.quantity}`
          });
        }

        // ✅ Atomic decrement to prevent race conditions
        const updatedStock = await Stock.findOneAndUpdate(
          { _id: stock._id, quantity: { $gte: item.quantity } },
          {
            $inc: { quantity: -item.quantity },
            $set: {
              updated_at: new Date(),
              notes: `Reduced via order delivery (${currentOrder.invoice_no}): ${stock.quantity} → ${stock.quantity - item.quantity}`
            }
          },
          { new: true }
        );

        if (!updatedStock) {
          return res.status(400).json({
            error: `Stock update failed due to concurrent modification for product ${item.product_id}`
          });
        }

        // ✅ FIX: syncProductWithStock re-fetches fresh stock data internally
        //         so minStock is always accurate for low-stock alert calculation
        await syncProductWithStock(updatedStock);

        console.log(`✅ Stock reduced for product ${item.product_id}: -${item.quantity} (remaining: ${updatedStock.quantity})`);
      }
    }

    const updateData = { status, updated_at: new Date() };

    if (status === 'shipped' && trackingNumber) {
      updateData.tracking_number = trackingNumber;

      if (!currentOrder.estimated_delivery) {
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
        updateData.estimated_delivery = estimatedDelivery;
      }
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({
      success: true,
      message: "Order status updated successfully",
      order
    });
  } catch (err) {
    console.error('Order status update error:', err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// GET track order by tracking number
router.get("/track/:trackingNumber", async (req, res) => {
  try {
    const order = await Order.findOne({ tracking_number: req.params.trackingNumber });
    if (!order) return res.status(404).json({ error: "Tracking number not found" });

    // Get order items
    const items = await OrderItem.find({ order_id: order.invoice_no });

    res.json({
      orderId:          order.invoice_no,
      status:           order.status,
      estimatedDelivery: order.estimated_delivery,
      trackingNumber:   order.tracking_number,
      shippingAddress:  order.shipping_address,
      items:            items,
      orderTime:        order.order_time
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET order invoice (HTML generation)
router.get("/:id/invoice", authenticateHybridToken, async (req, res) => {
  try {
    const Order     = require('../models/Order');
    const OrderItem = require('../models/OrderItem');
    const Customer  = require('../models/Customer');
    const Product   = require('../models/Product');

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Get customer details
    const customer = await Customer.findById(order.customer_id);

    // Get order items with product details (items are now embedded in order)
    const enhancedItems = await Promise.all(
      order.items.map(async (item) => {
        try {
          const Product    = require('../models/Product');
          const ComboOffer = require('../models/ComboOffer');

          let product = await Product.findById(item.product_id);
          let isCombo = false;

          if (!product) {
            product = await ComboOffer.findById(item.product_id);
            if (product) isCombo = true;
          }

          return {
            ...item.toObject(),
            name:       product ? (isCombo ? product.title : product.name) : 'Product Not Found',
            sku:        product ? (isCombo ? 'COMBO' : (product.sku || 'N/A')) : 'N/A',
            unit_price: item.price || 0
          };
        } catch (error) {
          return {
            ...item.toObject(),
            name:       'Product Not Found',
            sku:        'N/A',
            unit_price: item.price || 0
          };
        }
      })
    );

    // Calculate totals
    const subtotal = enhancedItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax      = subtotal * 0.1;
    const shipping = order.shipping_cost || 0;
    const total    = order.total_amount;

    // Generate HTML for invoice
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${order.invoice_no}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2563eb; margin: 0; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .section h3 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f9fafb; font-weight: 600; }
        .total-row { font-weight: 600; }
        .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>INVOICE</h1>
        <p>Thank you for your order!</p>
      </div>
      
      <div class="invoice-info">
        <div class="section">
          <h3>Invoice Details</h3>
          <p><strong>Invoice No:</strong> ${order.invoice_no}</p>
          <p><strong>Order Date:</strong> ${new Date(order.order_time).toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Payment Method:</strong> ${order.payment_method}</p>
        </div>
        
        <div class="section">
          <h3>Billing Address</h3>
          <p><strong>Name:</strong> ${customer?.name || order.shipping_address?.name || 'N/A'}</p>
          <p><strong>Email:</strong> ${customer?.email || order.shipping_address?.email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${customer?.phone || order.shipping_address?.phone || 'N/A'}</p>
        </div>
      </div>
      
      <div class="section">
        <h3>Shipping Address</h3>
        <p>${order.shipping_address?.name   || 'N/A'}</p>
        <p>${order.shipping_address?.street || 'N/A'}</p>
        <p>${order.shipping_address?.city   || 'N/A'}, ${order.shipping_address?.state || 'N/A'} ${order.shipping_address?.zipCode || ''}</p>
        <p>${order.shipping_address?.country || 'N/A'}</p>
      </div>
      
      <div class="section">
        <h3>Order Items</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${enhancedItems.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.sku}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unit_price.toFixed(2)}</td>
                <td>₹${(item.unit_price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4">Subtotal:</td>
              <td>₹${subtotal.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="4">Tax (10%):</td>
              <td>₹${tax.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="4">Shipping:</td>
              <td>₹${shipping.toFixed(2)}</td>
            </tr>
            <tr class="total-row" style="border-top: 2px solid #1f2937;">
              <td colspan="4"><strong>Total:</strong></td>
              <td><strong>₹${total.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        <p>This is a computer-generated invoice. No signature required.</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.invoice_no}.pdf"`);
    res.send(htmlContent);

  } catch (err) {
    console.error('Error generating invoice:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE order
router.delete("/:id", async (req, res) => {
  try {
    const result = await Order.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;