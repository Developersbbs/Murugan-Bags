const express = require("express");
const connectDB = require("./lib/mongodb");

// Test database connection
console.log("🔧 Testing Database Connection...");
connectDB().then(() => {
  console.log("✅ Database connected successfully");

  // Test payments route import
  try {
    const paymentsRoutes = require("./routes/payments");
    console.log("✅ Payments routes loaded successfully");
    console.log("Route type:", typeof paymentsRoutes);

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to load payments routes:", error.message);
    process.exit(1);
  }
}).catch((err) => {
  console.error("❌ Database connection failed:", err.message);
  process.exit(1);
});
