require("dotenv").config();
const connectDB = require("./lib/mongodb");
const firebaseAdmin = require('./lib/firebase');
const Razorpay = require("razorpay");

console.log("🔧 SBBS E-commerce Backend Configuration Test");
console.log("================================================\n");

// Test MongoDB connection
console.log("📊 Testing MongoDB Connection...");
connectDB().then(() => {
  console.log("✅ MongoDB Connected successfully\n");
}).catch(err => {
  console.log("❌ MongoDB Connection failed:", err.message + "\n");
});

// Test Firebase Admin SDK
console.log("🔥 Testing Firebase Admin SDK...");
if (firebaseAdmin && typeof firebaseAdmin.auth === 'function') {
  console.log("✅ Firebase Admin SDK initialized successfully\n");
} else {
  console.log("❌ Firebase Admin SDK not initialized");
  console.log("Missing environment variables:");
  console.log("- FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID ? "Set" : "Not set");
  console.log("- FIREBASE_PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY ? "Set" : "Not set");
  console.log("- FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL ? "Set" : "Not set");
  console.log("- FIREBASE_PRIVATE_KEY_ID:", process.env.FIREBASE_PRIVATE_KEY_ID ? "Set" : "Not set");
  console.log("- FIREBASE_CLIENT_ID:", process.env.FIREBASE_CLIENT_ID ? "Set" : "Not set");
  console.log("\n📝 To fix: Add Firebase credentials to your .env file");
  console.log("   Get them from: Firebase Console > Project Settings > Service Accounts\n");
}

// Test Razorpay
console.log("💳 Testing Razorpay Configuration...");
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("✅ Razorpay initialized successfully");

    // Test order creation
    const testOptions = {
      amount: 10000, // 100 INR in paise
      currency: "INR",
      receipt: "test_receipt_" + Date.now(),
      payment_capture: 1,
    };

    console.log("🔄 Testing Razorpay order creation...");
    razorpay.orders.create(testOptions, (err, order) => {
      if (err) {
        console.log("❌ Razorpay order creation failed:");
        console.log("   Error:", err.error?.description || err.message);
        console.log("   Code:", err.error?.code);
        console.log("\n📝 To fix: Check your Razorpay credentials in .env file");
        console.log("   Get them from: Razorpay Dashboard > Settings > API Keys\n");
      } else {
        console.log("✅ Razorpay order created successfully:", order.id);
        console.log("✅ All configurations working correctly!\n");
      }
      process.exit(0);
    });

  } catch (error) {
    console.log("❌ Razorpay initialization failed:", error.message);
    console.log("\n📝 To fix: Check your Razorpay credentials in .env file\n");
    process.exit(1);
  }
} else {
  console.log("❌ Razorpay credentials not found");
  console.log("Missing environment variables:");
  console.log("- RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "Set" : "Not set");
  console.log("- RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? "Set" : "Not set");
  console.log("\n📝 To fix: Add Razorpay credentials to your .env file");
  console.log("   Get them from: Razorpay Dashboard > Settings > API Keys\n");
  process.exit(1);
}
