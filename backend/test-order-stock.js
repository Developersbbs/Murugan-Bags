// Test script to verify stock deduction when order is placed
const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('./models/Order');
const Stock = require('./models/Stock');
const Product = require('./models/Product');
const Customer = require('./models/Customer');

async function testOrderStockDeduction() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not set in environment variables');
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // 1. Get or create a test customer
    console.log('\n📝 Setting up test customer...');
    let customer = await Customer.findOne({ email: 'test@murugan.com' });
    if (!customer) {
      customer = await Customer.create({
        name: 'Test Customer',
        email: 'test@murugan.com',
        phone: '9999999999',
        firebase_uid: 'test-firebase-uid'
      });
      console.log('✅ Test customer created:', customer._id);
    } else {
      console.log('✅ Using existing test customer:', customer._id);
    }

    // 2. Get a product with available stock
    console.log('\n📦 Fetching test product with stock...');
    const stock = await Stock.findOne({ quantity: { $gt: 0 } });
    if (!stock) {
      throw new Error('No product with available stock found in database');
    }

    const product = await Product.findById(stock.productId);
    if (!product) {
      throw new Error('Product not found for stock entry');
    }

    console.log(`✅ Found product: ${product.name}`);
    console.log(`   Stock ID: ${stock._id}`);
    console.log(`   Available quantity: ${stock.quantity}`);

    // 3. Create test order data
    const orderQuantity = Math.min(2, stock.quantity); // Order 2 units or less
    console.log(`\n🛒 Creating test order with ${orderQuantity} unit(s)...`);

    const orderData = {
      customer_id: customer._id,
      items: [
        {
          product_id: product._id,
          variant_id: stock.variantId || null,
          quantity: orderQuantity,
          price: 100,
          subtotal: 100 * orderQuantity
        }
      ],
      shipping_cost: 50,
      total_amount: (100 * orderQuantity) + 50 + ((100 * orderQuantity + 50) * 0.1), // items + shipping + 10% tax
      payment_method: 'cash',
      shipping_address: {
        name: 'Test Customer',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '123456',
        phone: '9999999999'
      },
      status: 'processing'
    };

    const stockBefore = stock.quantity;

    // 4. Create order
    const order = await Order.create(orderData);
    console.log(`✅ Order created: ${order._id}`);
    console.log(`   Invoice: ${order.invoice_no}`);

    // 5. Check if stock was deducted
    console.log(`\n📊 Checking stock after order placement...`);
    const updatedStock = await Stock.findById(stock._id);

    if (!updatedStock) {
      console.error('❌ Stock record not found after order ');
      throw new Error('Stock record was deleted or not found');
    }

    console.log(`   Stock before order: ${stockBefore}`);
    console.log(`   Stock after order: ${updatedStock.quantity}`);
    console.log(`   Stock deducted: ${stockBefore - updatedStock.quantity}`);

    if (updatedStock.quantity === stockBefore - orderQuantity) {
      console.log(`\n✅ SUCCESS: Stock was correctly deducted by ${orderQuantity} units`);
      console.log(`   Expected stock: ${stockBefore - orderQuantity}`);
      console.log(`   Actual stock: ${updatedStock.quantity}`);
    } else {
      console.error(`\n❌ FAILURE: Stock deduction mismatch`);
      console.error(`   Expected: ${stockBefore - orderQuantity}, Got: ${updatedStock.quantity}`);
      throw new Error('Stock deduction failed');
    }

    // 6. Check order notes
    console.log(`\n📝 Stock notes: ${updatedStock.notes}`);

    console.log('\n✅ All tests passed! Stock deduction is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🔌 Disconnecting from MongoDB...');
    await mongoose.connection.close();
  }
}

// Run tests
if (require.main === module) {
  testOrderStockDeduction();
}

module.exports = { testOrderStockDeduction };
