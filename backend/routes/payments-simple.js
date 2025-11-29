const express = require("express");
const router = express.Router();

// Test route to verify payment routes are loading
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Payment routes are working",
    timestamp: new Date().toISOString()
  });
});

// Get Razorpay configuration (for frontend)
router.get("/config", (req, res) => {
  res.json({
    key_id: "test_key_id",
    currency: "INR",
    configured: true
  });
});

module.exports = router;
