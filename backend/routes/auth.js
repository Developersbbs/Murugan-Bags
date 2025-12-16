const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Staff = require("../models/Staff.js");
const Customer = require("../models/Customer.js");
const admin = require("../lib/firebase");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  if (!id) return false;
  // Convert to string if it's an ObjectId object
  const stringId = id.toString ? id.toString() : id;
  return mongoose.Types.ObjectId.isValid(stringId);
};

// Phone OTP Authentication Routes

// Check if account exists by phone number
router.post("/check-account", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone number is required" });
    }

    const customer = await Customer.findOne({ phone });
    const exists = !!customer;

    res.json({
      success: true,
      exists,
      message: exists ? "Account exists" : "Account does not exist"
    });
  } catch (err) {
    console.error("Check account error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Firebase Phone OTP and create/login user
router.post("/verify-phone-otp", async (req, res) => {
  try {
    const { phone, otp, firebase_uid, name, idToken } = req.body;

    if (!phone || !firebase_uid) {
      return res.status(400).json({
        success: false,
        error: "Phone number and Firebase UID are required"
      });
    }

    // For development or when Firebase Admin SDK is not configured
    // We trust the client-side Firebase verification
    console.log("📱 Trusting client-side Firebase verification for phone:", phone);

    // Normalize phone number for consistent lookup
    const normalizedPhone = phone.replace(/\D/g, '');
    console.log("Normalized phone number:", normalizedPhone);

    // Check if user exists
    let customer = await Customer.findOne({ phone: normalizedPhone });
    console.log("Existing customer found:", customer ? "YES" : "NO", customer ? customer._id : "none");
    if (customer) {
      console.log("Existing customer phone in DB:", customer.phone);
      console.log("Normalized phone matches DB phone:", normalizedPhone === customer.phone);
    }

    if (customer) {
      // User exists - login
      if (!customer.is_active) {
        return res.status(401).json({
          success: false,
          error: "Account is deactivated"
        });
      }

      // Update Firebase UID if not set
      if (!customer.firebase_uid) {
        customer.firebase_uid = firebase_uid;
        await customer.save();
      }

      const token = jwt.sign(
        {
          id: customer._id.toString(),
          phone: customer.phone,
          role: customer.role,
          type: 'customer'
        },
        process.env.JWT_SECRET || "your_jwt_secret_here",
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            _id: customer._id,
            id: customer._id.toString(),
            name: customer.name,
            phone: customer.phone,
            role: customer.role,
            firebase_uid: customer.firebase_uid,
            created_at: customer.created_at,
            updated_at: customer.updated_at,
          },
          isNewUser: false
        },
      });
    } else {
      // User doesn't exist - create new account
      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Name is required for new users"
        });
      }

      // Check for existing Firebase UID
      if (firebase_uid) {
        const existingFirebaseUser = await Customer.findOne({ firebase_uid });
        if (existingFirebaseUser) {
          return res.status(400).json({
            success: false,
            error: "Firebase account is already linked to another user"
          });
        }
      }

      // Create new customer - don't set email for mobile users
      customer = new Customer({
        name,
        phone: normalizedPhone,
        firebase_uid,
        role: 'user',
        is_active: true,
      });

      console.log("Attempting to save customer:", {
        name,
        phone: normalizedPhone,
        firebase_uid,
        email: "not set"
      });

      await customer.save();
      console.log("✅ Customer saved successfully:", customer._id);

      const token = jwt.sign(
        {
          id: customer._id.toString(),
          phone: customer.phone,
          role: customer.role,
          type: 'customer'
        },
        process.env.JWT_SECRET || "your_jwt_secret_here",
        { expiresIn: "7d" }
      );

      res.status(201).json({
        success: true,
        message: "Account created successfully",
        data: {
          token,
          user: {
            _id: customer._id,
            id: customer._id.toString(),
            name: customer.name,
            phone: customer.phone,
            role: customer.role,
            firebase_uid: customer.firebase_uid,
            created_at: customer.created_at,
            updated_at: customer.updated_at,
          },
          isNewUser: true
        },
      });
    }
  } catch (err) {
    console.error("Phone OTP verification error:", err);

    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || err.errorResponse?.keyPattern || {})[0];
      let errorMessage = "Authentication failed";

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

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: "OTP session has expired. Please request a new OTP."
      });
    }

    if (err.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        success: false,
        error: "Invalid OTP token. Please try again."
      });
    }

    res.status(500).json({
      success: false,
      error: err.message || "Phone authentication failed"
    });
  }
});

// Get current customer (for authenticated requests)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    console.log("Auth me: User from token:", req.user);

    if (!req.user || !req.user.id) {
      console.error("Auth me: No user ID in token");
      return res.status(401).json({ success: false, error: "Invalid token - no user ID" });
    }

    // Validate ObjectId format using mongoose
    if (!isValidObjectId(req.user.id)) {
      console.error("Auth me: Invalid ObjectId format:", req.user.id);
      return res.status(400).json({ success: false, error: "Invalid user ID format" });
    }

    let user;
    if (req.user.type === 'customer') {
      user = await Customer.findById(req.user.id).select("-password");
    } else {
      user = await Staff.findById(req.user.id).select("-password");
    }

    if (!user) {
      console.error("Auth me: User not found in database:", req.user.id);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    console.log("Auth me: User found:", user._id, user.name || user.email);

    res.json({
      success: true,
      data: {
        _id: user._id,
        id: user._id.toString(),
        name: user.name,
        email: user.email || null,
        phone: user.phone,
        role: user.role_id || user.role,
        type: req.user.type || 'customer',
        firebase_uid: user.firebase_uid,
        image_url: user.image_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (err) {
    console.error("Auth me: Database error:", err);

    // Handle specific MongoDB CastError for invalid ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ success: false, error: "Invalid user ID format" });
    }

    res.status(500).json({ success: false, error: err.message });
  }
});

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "staff" } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await Staff.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "User already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new Staff({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      role_id: role,
      is_active: true,
      updated_at: new Date(),
    });

    await user.save();

    // Generate JWT token
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role_id,
      type: "staff",
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role_id,
          type: "staff",
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    // Find user by email
    const user = await Staff.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ success: false, error: "Account is deactivated" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    // Generate JWT token
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role_id,
      type: "staff",
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role_id,
          type: "staff",
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update password
router.put("/update-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate user ID from token
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Invalid token - no user ID" });
    }

    // Validate ObjectId format using mongoose
    if (!isValidObjectId(req.user.id)) {
      return res.status(400).json({ success: false, error: "Invalid user ID format" });
    }

    // Find user
    const user = await Staff.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    user.updated_at = new Date();
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Firebase sync endpoint
router.post("/firebase/sync", async (req, res) => {
  try {
    const { firebaseUid, email, displayName, phoneNumber, photoURL, providerId, name, firstName, lastName, phone } = req.body;

    console.log('Firebase sync: Received data:', { firebaseUid, email, displayName, phoneNumber, name, firstName, lastName });

    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        error: "Firebase UID is required"
      });
    }

    // Check if user exists by Firebase UID
    let customer = await Customer.findOne({ firebase_uid: firebaseUid });
    console.log('Firebase sync: Existing customer found:', customer ? 'YES' : 'NO');
    
    if (customer) {
      // Update existing customer - always update name if provided
      const newName = displayName || name || firstName || customer.name;
      if (newName && newName !== 'User') customer.name = newName;
      if (email && !customer.email) customer.email = email;
      if (phoneNumber && !customer.phone) customer.phone = phoneNumber.replace(/\D/g, '').slice(-10);
      // Only update image_url if not already set (preserve custom uploaded photos)
      if (photoURL && !customer.image_url) customer.image_url = photoURL;
      customer.updated_at = new Date();
      await customer.save();
      console.log('Firebase sync: Updated existing customer:', customer.name);
    } else {
      // Create new customer
      const userName = displayName || name || firstName || 'User';
      const customerData = {
        firebase_uid: firebaseUid,
        name: userName,
        is_active: true,
        role: 'user'
      };

      if (email) customerData.email = email;
      if (phoneNumber) customerData.phone = phoneNumber.replace(/\D/g, '').slice(-10);
      if (photoURL) customerData.image_url = photoURL;

      customer = new Customer(customerData);
      await customer.save();
      console.log('Firebase sync: Created new customer:', customer.name, customer._id);
    }

    res.json({
      success: true,
      message: "User synced successfully",
      data: {
        user: {
          _id: customer._id,
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          role: customer.role,
          firebase_uid: customer.firebase_uid,
          image_url: customer.image_url,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        }
      }
    });
  } catch (err) {
    console.error("Firebase sync error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Firebase sync failed"
    });
  }
});

// Google OAuth
router.post("/google", async (req, res) => {
  try {
    const { name, email, googleId, imageUrl } = req.body;

    if (!name || !email || !googleId) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and Google ID are required"
      });
    }

    // Check if user exists
    let customer = await Customer.findOne({ email });
    let isNewUser = false;

    if (!customer) {
      // Create new customer
      isNewUser = true;
      customer = new Customer({
        name,
        email,
        google_id: googleId,
        image_url: imageUrl,
        is_active: true,
        role: 'user'
      });
      await customer.save();
      console.log("✅ New Google user created:", customer._id);
    } else {
      // Update existing customer with Google ID if not set
      if (!customer.google_id) {
        customer.google_id = googleId;
        // Only update image_url if not already set (preserve custom uploaded photos)
        if (imageUrl && !customer.image_url) customer.image_url = imageUrl;
        await customer.save();
        console.log("✅ Existing user linked with Google ID:", customer._id);
      } else {
        console.log(" Existing Google user logged in:", customer._id);
      }
    }

    // Generate JWT token
    const tokenPayload = {
      id: customer._id.toString(),
      phone: customer.phone,
      role: customer.role,
      type: 'customer',
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: isNewUser ? "Google account created successfully" : "Google login successful",
      data: {
        token,
        user: {
          _id: customer._id,
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          role: customer.role,
          image_url: customer.image_url,
          google_id: customer.google_id,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        },
        isNewUser
      }
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Google authentication failed"
    });
  }
});

// Email registration endpoint
router.post("/register/email", async (req, res) => {
  try {
    const { name, email, firebaseUid, firstName, lastName, phone } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !firebaseUid) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and Firebase UID are required"
      });
    }

    // Check if user already exists
    let customer = await Customer.findOne({
      $or: [
        { email: normalizedEmail },
        { firebase_uid: firebaseUid }
      ]
    });

    if (customer) {
      return res.status(400).json({
        success: false,
        error: "User already exists with this email or Firebase UID"
      });
    }

    // Create new customer
    customer = new Customer({
      name,
      email: normalizedEmail,
      firebase_uid: firebaseUid,
      phone: phone ? phone.replace(/\D/g, '').slice(-10) : undefined,
      role: 'user',
      is_active: true
    });

    await customer.save();

    const token = jwt.sign(
      {
        id: customer._id.toString(),
        email: customer.email,
        role: customer.role,
        type: 'customer'
      },
      process.env.JWT_SECRET || "your_jwt_secret_here",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        token,
        user: {
          _id: customer._id,
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          role: customer.role,
          firebase_uid: customer.firebase_uid,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        },
        isNewUser: true
      }
    });
  } catch (err) {
    console.error("Email registration error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Email registration failed"
    });
  }
});

// Email login endpoint
router.post("/login/email", async (req, res) => {
  try {
    const { email, firebaseUid } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !firebaseUid) {
      return res.status(400).json({
        success: false,
        error: "Email and Firebase UID are required"
      });
    }

    // Find user by email
    const customer = await Customer.findOne({ email: normalizedEmail });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "No account found with this email"
      });
    }

    if (!customer.is_active) {
      return res.status(401).json({
        success: false,
        error: "Account is deactivated"
      });
    }

    // Update Firebase UID if not set
    if (!customer.firebase_uid) {
      customer.firebase_uid = firebaseUid;
      await customer.save();
    }

    const token = jwt.sign(
      {
        id: customer._id.toString(),
        email: customer.email,
        role: customer.role,
        type: 'customer'
      },
      process.env.JWT_SECRET || "your_jwt_secret_here",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          _id: customer._id,
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          role: customer.role,
          firebase_uid: customer.firebase_uid,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        }
      }
    });
  } catch (err) {
    console.error("Email login error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Email login failed"
    });
  }
});

// Get user profile by Firebase UID
router.get("/profile/:firebaseUid", async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    console.log('GET /profile/:firebaseUid - Fetching profile for firebaseUid:', firebaseUid);

    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        error: "Firebase UID is required"
      });
    }

    // Find user by Firebase UID
    const customer = await Customer.findOne({ firebase_uid: firebaseUid });
    console.log('GET /profile - Found customer:', customer ? {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      firebase_uid: customer.firebase_uid,
      image_url: customer.image_url
    } : 'NOT FOUND');

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const responseData = {
      success: true,
      data: {
        _id: customer._id,
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
        firebase_uid: customer.firebase_uid,
        image_url: customer.image_url,
        address: customer.address,
        created_at: customer.created_at,
        updated_at: customer.updated_at,

      }
    };

    console.log('GET /profile - Sending response with image_url:', responseData.data.image_url);
    res.json(responseData);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch profile"
    });
  }
});

// Update user profile by Firebase UID
router.put("/profile/:firebaseUid", async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const { name, email, phone, address, image_url } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        error: "Firebase UID is required"
      });
    }

    // Find and update user by Firebase UID
    const customer = await Customer.findOne({ firebase_uid: firebaseUid });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Update fields if provided
    if (name) customer.name = name;
    if (email) customer.email = email;
    if (phone) customer.phone = phone.replace(/\D/g, '').slice(-10);
    if (address) customer.address = address;
    if (image_url) customer.image_url = image_url;
    customer.updated_at = new Date();

    await customer.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: customer._id,
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
        firebase_uid: customer.firebase_uid,
        image_url: customer.image_url,
        address: customer.address,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      }
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to update profile"
    });
  }
});

module.exports = {
  router,
  authenticateToken
};
