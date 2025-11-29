const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer.js");
const Order = require("../models/Order.js");
const Wishlist = require("../models/Wishlist.js");
const Cart = require("../models/Cart.js");
const admin = require('firebase-admin');
const router = express.Router();

// Check if user exists by email
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    const customer = await Customer.findOne({ 
      email: email.toLowerCase() 
    }).select('_id email');

    return res.json({ 
      success: true, 
      exists: !!customer 
    });
    
  } catch (error) {
    console.error('Error checking email:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error while checking email' 
    });
  }
});

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('Missing Firebase Admin environment variables. Please check your .env file.');
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
  }
}

// Register/Sync Firebase user with MongoDB
router.post('/firebase/register', async (req, res) => {
  try {
    const { firebaseUid, email, displayName, phoneNumber, photoURL, providerId } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({ success: false, error: 'Firebase UID is required' });
    }

    // Verify the Firebase ID token if needed
    // const decodedToken = await admin.auth().verifyIdToken(idToken);
    // const firebaseUid = decodedToken.uid;

    // Check if user already exists
    let customer = await Customer.findOne({ 
      $or: [
        { firebase_uid: firebaseUid },
        { email: email?.toLowerCase() },
        { phone: phoneNumber }
      ].filter(Boolean) // Remove null/undefined conditions
    });

    if (customer) {
      // Update existing user with any new information
      const updateData = {};
      
      if (email && !customer.email) updateData.email = email.toLowerCase();
      if (displayName && !customer.name) updateData.name = displayName;
      if (phoneNumber && !customer.phone) updateData.phone = phoneNumber;
      if (photoURL && !customer.image_url) updateData.image_url = photoURL;
      if (providerId === 'google.com' && !customer.google_id) updateData.google_id = firebaseUid;
      
      if (Object.keys(updateData).length > 0) {
        customer = await Customer.findByIdAndUpdate(
          customer._id,
          { $set: updateData, updated_at: new Date() },
          { new: true }
        );
      }
    } else {
      // Create new customer
      customer = new Customer({
        name: displayName || 'New User',
        email: email?.toLowerCase(),
        phone: phoneNumber,
        firebase_uid: firebaseUid,
        google_id: providerId === 'google.com' ? firebaseUid : undefined,
        image_url: photoURL,
        role: 'user',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      await customer.save();
    }

    // Return the customer data (excluding sensitive information)
    const { password, ...customerData } = customer.toObject();
    res.status(200).json({ success: true, data: customerData });
  } catch (error) {
    console.error('Error in Firebase user registration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to register user',
      details: error.message 
    });
  }
});

// GET all customers with pagination and search
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter query
    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }
    
    // Execute queries
    const customers = await Customer.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);
      
    const total = await Customer.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);
    
    res.json({
      success: true,
      data: customers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET customer orders
router.get("/:id/orders", async (req, res) => {
  try {
    const orders = await Order.find({ customer_id: req.params.id })
      .populate({
        path: "customer_id",
        select: "name address phone",
        model: "Customers",
      })
      .select('-__v')
      .sort({ created_at: -1 });
      
    res.json({
      success: true,
      data: orders.map(order => ({
        ...order.toObject(),
        id: order._id,
        customers: {
          name: order.shipping_address?.name || order.customer_id?.name,
          address: `${order.shipping_address?.street || ''}, ${order.shipping_address?.city || ''}, ${order.shipping_address?.state || ''} ${order.shipping_address?.zipCode || ''}`.trim(),
          phone: order.shipping_address?.phone || order.customer_id?.phone
        },
        customer: order.customer_id
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET customer wishlist
router.get("/:id/wishlist", async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Find wishlist for this customer
    let wishlist = await Wishlist.findOne({ customer_id: customerId })
      .populate('items.product_id', 'name slug selling_price image_url category')
      .lean();
    
    if (!wishlist) {
      // Return empty wishlist if none exists
      return res.json({
        success: true,
        data: {
          items: [],
          totalItems: 0
        }
      });
    }
    
    // Transform items to match frontend interface
    const transformedItems = wishlist.items.map(item => ({
      _id: item._id,
      product_id: item.product_id._id || item.product_id,
      product_name: item.product_name,
      product_image: item.product_image || item.product_id?.image_url?.[0],
      price: item.price,
      discounted_price: item.discounted_price,
      created_at: item.added_at || item.created_at
    }));
    
    res.json({
      success: true,
      data: {
        items: transformedItems,
        totalItems: transformedItems.length
      }
    });
  } catch (err) {
    console.error('Error fetching customer wishlist:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET customer cart
router.get("/:id/cart", async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Find cart for this customer
    let cart = await Cart.findOne({ customer_id: customerId })
      .populate('items.product_id', 'name slug selling_price image_url category')
      .lean();
    
    if (!cart) {
      // Return empty cart if none exists
      return res.json({
        success: true,
        data: {
          items: [],
          totalItems: 0,
          cartTotal: 0
        }
      });
    }
    
    // Transform items to match frontend interface
    const transformedItems = cart.items.map(item => ({
      _id: item._id,
      product_id: item.product_id._id || item.product_id,
      product_name: item.product_name,
      product_image: item.product_image || item.product_id?.image_url?.[0],
      price: item.price,
      discounted_price: item.discounted_price,
      quantity: item.quantity,
      variant: item.variant || null,
      created_at: item.added_at || item.created_at
    }));
    
    res.json({
      success: true,
      data: {
        items: transformedItems,
        totalItems: cart.total_items || transformedItems.length,
        cartTotal: cart.total_amount || cart.total_discounted_amount || 0
      }
    });
  } catch (err) {
    console.error('Error fetching customer cart:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET customer by ID
// Get customer by Firebase UID
router.get('/firebase/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({ success: false, error: 'Firebase UID is required' });
    }

    const customer = await Customer.findOne({ firebase_uid: uid });
    
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Return customer data without sensitive information
    const { password, ...customerData } = customer.toObject();
    res.json({
      success: true,
      ...customerData,
      id: customer._id, // Include the MongoDB _id as id
    });
  } catch (error) {
    console.error('Error fetching customer by Firebase UID:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update customer by Firebase UID
router.put('/firebase/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, email, phone, address, image_url } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, error: 'Firebase UID is required' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (image_url) updateData.image_url = image_url;

    const customer = await Customer.findOneAndUpdate(
      { firebase_uid: uid },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Return updated customer data without sensitive information
    const { password, ...customerData } = customer.toObject();
    res.json({
      success: true,
      ...customerData,
      id: customer._id,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get customer details by ID
router.get("/:_id", async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params._id })
      .select('-password -__v')
      .lean();
      
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        error: "Customer not found" 
      });
    }
    
    // Get customer's orders
    const orders = await Order.find({ customer_id: customer._id })
      .select('-__v')
      .sort({ created_at: -1 })
      .limit(5)
      .lean();
    
    // Calculate order statistics
    // Update the statistics calculation in the /:_id route
const orderStats = {
  total_orders: await Order.countDocuments({ customer_id: customer._id }),
  total_spent: await Order.aggregate([
    { $match: { customer_id: customer._id } },
    { $group: { _id: null, total: { $sum: "$total_amount" } } }
  ]).then(res => res[0]?.total || 0),
  last_order: orders[0]?.created_at || null,
  order_statuses: await Order.aggregate([
    { $match: { customer_id: customer._id } },
    { $group: { 
        _id: "$status", 
        count: { $sum: 1 },
        total: { $sum: "$total_amount" }
    }},
    { $project: { 
        _id: 0, 
        status: "$_id", 
        count: 1,
        total: 1 
    }}
  ]).then(res => 
    res.reduce((acc, { status, count, total }) => ({
      ...acc,
      [status]: { count, total: total || 0 }
    }), {})
  )
};

    // Prepare response
    const response = {
      success: true,
      data: {
        ...customer,
        orders,
        statistics: orderStats,
        wishlist: {
          total_items: 0, // You can implement wishlist count if needed
          items: []
        }
      }
    };
    
    res.json(response);
  } catch (err) {
    console.error('Error fetching customer details:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, password, hashedPassword, firebase_uid } = req.body;

    // Handle both password and hashedPassword fields for backward compatibility
    const finalPassword = hashedPassword || password;

    console.log("Registration request received:", {
      name,
      email,
      phone,
      hasPassword: !!finalPassword,
      hasHashedPassword: !!hashedPassword,
      hasFirebaseUid: !!firebase_uid,
    });

    // Validate required fields
    if (!name || name.trim() === '') {
      console.log("Name is required");
      return res.status(400).json({ success: false, error: "Name is required" });
    }

    // Check if either email or phone is provided
    if (!email && !phone) {
      console.log("Either email or phone is required");
      return res.status(400).json({
        success: false,
        error: "Either email or phone number is required",
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log("Invalid email format");
        return res.status(400).json({
          success: false,
          error: "Please enter a valid email address",
        });
      }
    }

    // Validate phone format if provided (international format with country code)
    if (phone) {
      // Remove any non-digit characters
      const cleanPhone = phone.replace(/\D/g, '');

      // For international numbers, allow 10-15 digits
      // Most international numbers are 10-15 digits including country code
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        console.log("Invalid phone format - length:", cleanPhone.length);
        return res.status(400).json({
          success: false,
          error: "Please enter a valid phone number (10-15 digits)",
        });
      }

      // Update phone with cleaned version
      req.body.phone = cleanPhone;
    }

    // Check if email already exists (if provided and not empty)
    if (email && email.trim() !== '') {
      const existingEmail = await Customer.findOne({ email: email.trim().toLowerCase() });
      if (existingEmail) {
        console.log("Email already exists:", email.trim().toLowerCase());
        return res.status(400).json({
          success: false,
          error: "Email address is already registered. Please use a different email or try logging in.",
        });
      }
    }

    // Check if phone already exists (if provided and not empty)
    if (phone && phone.trim() !== '') {
      const cleanedPhone = phone.replace(/\D/g, ''); // Use cleaned phone for checking
      const existingPhone = await Customer.findOne({ phone: cleanedPhone });
      if (existingPhone) {
        console.log("Phone already exists:", cleanedPhone);
        return res.status(400).json({
          success: false,
          error: "Phone number is already registered. Please use a different phone number or try logging in.",
        });
      }
    }

    console.log("No duplicates found, creating customer...");

    // Hash password if provided
    // If using email/password, hash the password (unless already hashed)
    if (finalPassword) {
      if (hashedPassword) {
        // Password is already hashed from frontend
        req.body.password = hashedPassword;
      } else {
        // Hash the plain password
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(finalPassword, salt);
      }
    } else if (phone && !email && !firebase_uid) {
      // For phone-only registration without Firebase UID, generate a random password
      const randomPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(randomPassword, salt);
    }
    // Note: For mobile OTP auth (phone + firebase_uid), no password is needed

    // Create customer object with required fields
    const customerData = {
      name: name.trim(),
      role: 'user',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Add email if provided
    if (email && email.trim() !== '') {
      customerData.email = email.trim().toLowerCase();
    }

    // Handle phone number - only set if provided and not empty
    // This ensures we don't set phone to null/empty string which would cause unique index issues
    if (req.body.phone && req.body.phone.trim() !== '') {
      customerData.phone = req.body.phone.trim(); // Use the cleaned phone from earlier validation
    }

    // Set password (already hashed)
    if (req.body.password) customerData.password = req.body.password;
    if (firebase_uid) customerData.firebase_uid = firebase_uid;

    console.log("Saving customer with data:", {
      name: name.trim(),
      email: email || (phone && firebase_uid ? `Mobile OTP (${phone})` : 'not provided'),
      phone: customerData.phone || 'not provided',
      hasPassword: !!req.body.password,
      firebase_uid: firebase_uid || 'not provided'
    });

    const customer = new Customer(customerData);
    await customer.save();

    console.log("Customer saved successfully with ID:", customer._id);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: customer._id.toString(),
        email: customer.email || null,
        phone: customer.phone,
        role: customer.role,
        type: 'customer'
      },
      process.env.JWT_SECRET || "your_jwt_secret_here",
      { expiresIn: "7d" }
    );

    console.log("Token generated, sending response");

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      data: {
        token,
        user: {
          _id: customer._id,
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email || null,
          phone: customer.phone,
          role: customer.role,
          firebase_uid: customer.firebase_uid,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        },
      },
    });
  } catch (err) {
    console.error("Customer registration error:", err);

    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || err.errorResponse?.keyPattern || {})[0];
      let errorMessage = "Registration failed";

      switch (field) {
        case 'email':
          errorMessage = "Email address is already registered. Please use a different email or try logging in.";
          break;
        case 'phone':
          errorMessage = "Phone number is already registered. Please use a different phone number or try logging in.";
          break;
        case 'firebase_uid':
          errorMessage = "This account is already linked to another user. Please contact support if you need help.";
          break;
        default:
          errorMessage = `${field} is already in use. Please use a different value.`;
      }

      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }

    // Handle other specific errors
    if (err.message && err.message.includes('validation failed')) {
      return res.status(400).json({
        success: false,
        error: "Please check your input data and try again."
      });
    }

    res.status(500).json({
      success: false,
      error: err.message || "Registration failed"
    });
  }
});

// UPDATE customer
router.put("/:id", async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer
router.delete("/:id", async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ id: req.params.id });
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export/all", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ created_at: -1 });
    res.json(customers); // 👈 just return array
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export customers to CSV
router.get("/export/csv", async (req, res) => {
  try {
    const { search } = req.query;

    // Build filter
    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { phone: { $regex: searchRegex } }
      ];
    }

    const customers = await Customer.find(filter).sort({ created_at: -1 });

    if (customers.length === 0) {
      return res.status(404).json({ success: false, error: "No customers found to export" });
    }

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Address',
      'City',
      'State',
      'Zip Code',
      'Created At'
    ];

    const csvRows = customers.map(customer => [
      customer.id,
      customer.name || '',
      customer.email || '',
      customer.phone || '',
      customer.address || '',
      customer.city || '',
      customer.state || '',
      customer.zip_code || '',
      customer.createdAt || customer.created_at
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="customers_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export customers to JSON
router.get("/export/json", async (req, res) => {
  try {
    const { search } = req.query;

    // Build filter
    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { phone: { $regex: searchRegex } }
      ];
    }

    const customers = await Customer.find(filter).sort({ created_at: -1 });

    if (customers.length === 0) {
      return res.status(404).json({ success: false, error: "No customers found to export" });
    }

    const exportData = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zip_code,
      createdAt: customer.createdAt || customer.created_at,
      updatedAt: customer.updatedAt || customer.updated_at
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="customers_${new Date().toISOString().split('T')[0]}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      totalRecords: exportData.length,
      filters: {
        search: search || null
      },
      data: exportData
    });
  } catch (err) {
    console.error('JSON export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customer login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    // Find customer by email
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }

    // Check if customer is active
    if (!customer.is_active) {
      return res.status(401).json({
        success: false,
        error: "Account is deactivated"
      });
    }

    // Check password if provided
    if (customer.password) {
      const isValidPassword = await bcrypt.compare(password, customer.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password"
        });
      }
    } else {
      // If no password set, this might be a phone-only account
      return res.status(401).json({
        success: false,
        error: "Please use phone number login for this account"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: customer._id.toString(),
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
        type: 'customer'
      },
      process.env.JWT_SECRET || "your_jwt_secret_here",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: customer._id,
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          role: customer.role,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        },
      },
    });
  } catch (err) {
    console.error("Customer login error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Login failed"
    });
  }
});

module.exports = router;
