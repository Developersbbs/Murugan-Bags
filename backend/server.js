require("dotenv").config();
const express = require("express");
const connectDB = require("./lib/mongodb");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const { upload } = require('./middleware/upload');
const path = require('path');
const compression = require('compression');
const app = express();

// Enable Gzip compression
app.use(compression());

// Initialize Firebase Admin SDK
const firebaseAdmin = require('./lib/firebase');
console.log('🔥 Firebase Admin SDK status:', firebaseAdmin ? 'Initialized' : 'Not initialized');

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'http://localhost:5173', // Vite default port
  'http://localhost:5174', // Vite alternate port
  'http://localhost:5175', // Vite alternate port
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://profound-snickerdoodle-771c0c.netlify.app',
  'https://charming-monstera-f84687.netlify.app',
];

// Simple CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Check if the request origin is in the allowed list or is a Netlify app
  const isAllowed = allowedOrigins.includes(origin) || (origin && origin.endsWith('.netlify.app'));

  if (isAllowed || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// JSON and URL-encoded body parsing
// Skip multipart/form-data for global parsers to let multer handle it
app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

app.use(cookieParser());

// Import routes
const { router: authRoutes } = require("./routes/auth");
const staffRolesRoutes = require("./routes/staffRoles");
const staffRoutes = require("./routes/staff");
const categoriesRoutes = require("./routes/categories");
const subcategoriesRoutes = require("./routes/subcategories");
const productsRoutes = require("./routes/products");
const customersRoutes = require("./routes/customers");
const couponsRoutes = require("./routes/coupons");
const ordersRoutes = require("./routes/orders");
const orderItemsRoutes = require("./routes/orderItems");
const notificationsRoutes = require("./routes/notifications");
const inventoryLogsRoutes = require("./routes/inventoryLogs");
const stockRoutes = require("./routes/stock");
const cartRoutes = require("./routes/cart");
const wishlistRoutes = require("./routes/wishlist");
const authTokenRoutes = require("./routes/auth-token");
const addressesRoutes = require("./routes/addresses");
const paymentsRoutes = require("./routes/payments");
const heroSectionRoutes = require("./routes/heroSection");
const specialOffersRoutes = require("./routes/specialOffers");
const comboOffersRoutes = require("./routes/comboOffers");
const marqueeOffersRoutes = require("./routes/marqueeOffers");
const offerPopupsRoutes = require("./routes/offerPopups");
const analyticsRoutes = require("./routes/analytics");
const newArrivalBannersRoutes = require("./routes/newArrivalBanners");
const ratingsRoutes = require("./routes/ratings");
console.log('✅ Payments routes loaded:', typeof paymentsRoutes);

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Firebase Debug Route
app.get('/api/debug/firebase', (req, res) => {
  const admin = require('./lib/firebase');
  const envCheck = {
    FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    FIREBASE_SERVICE_ACCOUNT_LENGTH: process.env.FIREBASE_SERVICE_ACCOUNT ? process.env.FIREBASE_SERVICE_ACCOUNT.length : 0,
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
    NODE_ENV: process.env.NODE_ENV
  };

  try {
    const apps = admin.apps ? admin.apps.length : 0;
    const isInit = apps > 0;

    // Try to re-initialize if empty (for debugging)
    let reInitResult = 'Not attempted';
    if (!isInit && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        const serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        reInitResult = 'Success';
      } catch (e) {
        reInitResult = `Failed: ${e.message}`;
      }
    }

    res.json({
      success: true,
      initialized: isInit,
      appsCount: apps,
      envCheck,
      reInitAttempt: reInitResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// Razorpay Debug Route
app.get('/api/debug/razorpay', (req, res) => {
  res.json({
    success: true,
    envCheck: {
      RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_ID_LENGTH: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.length : 0,
      RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
      RAZORPAY_KEY_SECRET_LENGTH: process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 0,
      NODE_ENV: process.env.NODE_ENV
    },
    razorpayInitialized: !!require('./routes/payments.js').razorpay,
    timestamp: new Date().toISOString()
  });
});

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/staffRoles", staffRolesRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/subcategories", subcategoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/orderItems", orderItemsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/inventoryLogs", inventoryLogsRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/auth-token", authTokenRoutes);
app.use("/api/addresses", addressesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/hero-section", heroSectionRoutes);
app.use("/api/special-offers", specialOffersRoutes);
app.use("/api/combo-offers", comboOffersRoutes);
app.use("/api/marquee-offers", marqueeOffersRoutes);
app.use("/api/offer-popups", offerPopupsRoutes);
const uploadRoutes = require("./routes/upload");
app.use("/api/upload", uploadRoutes);
const bulkOrdersRoutes = require("./routes/bulkOrders");
app.use("/api/bulk-orders", bulkOrdersRoutes);
console.log('✅ Payments routes mounted at /api/payments');
app.use("/api/ratings", ratingsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/new-arrival-banners", newArrivalBannersRoutes);
const reportsRoutes = require("./routes/reports");
app.use("/api/reports", reportsRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Fallback for missing /uploads files (e.g. images deleted after Firebase migration)
// Instead of a 404, return a transparent placeholder image so clients don't get console errors
app.use("/uploads", (req, res) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#f3f4f6"/>
    <text x="50%" y="46%" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-family="sans-serif">No Image</text>
    <text x="50%" y="56%" font-size="11" text-anchor="middle" dominant-baseline="middle" fill="#d1d5db" font-family="sans-serif">Image not available</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // cache for 1 day
  res.status(200).send(svg);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 GLOBAL SERVER ERROR:', err);

  // Handle Multer specifically since it might throw before our route handlers
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Maximum size is 20MB.' });
    }
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }

  // Handle other generic errors nicely as JSON, preventing HTML 500 dumps
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, "uploads")}`);
  console.log(`🌐 API URL: http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
