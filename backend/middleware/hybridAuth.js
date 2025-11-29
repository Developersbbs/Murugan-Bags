const jwt = require("jsonwebtoken");
const admin = require('../lib/firebase');
const Customer = require('../models/Customer');

// Simple user session store (in production, use Redis or database)
const userSessions = new Map();

/**
 * Hybrid authentication middleware that handles both Firebase ID tokens and JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateHybridToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: "Authorization header with Bearer token is required" 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // First, try Firebase ID token verification
    if (admin && typeof admin.auth === 'function') {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Find or create customer in database
        let customer = await Customer.findOne({ firebase_uid: decodedToken.uid });
        
        if (!customer) {
          // Create new customer if doesn't exist
          customer = new Customer({
            firebase_uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.display_name,
            phone: decodedToken.phone_number,
            image_url: decodedToken.picture,
            is_active: true
          });
          
          await customer.save();
          console.log(`Created new customer: ${customer.email}`);
        }

        // Attach customer info to request
        req.user = {
          id: customer._id,
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.display_name,
          customerId: customer._id
        };
        
        return next();
      } catch (firebaseError) {
        console.log('Firebase token verification failed, trying JWT fallback:', firebaseError.message);
        // Continue to JWT verification fallback
      }
    }
    
    // Fallback to JWT token verification
    if (process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find customer by decoded info
        let customer = await Customer.findById(decoded.id);
        
        if (!customer) {
          return res.status(401).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        req.user = {
          id: customer._id,
          email: customer.email,
          name: customer.name,
          customerId: customer._id
        };
        
        return next();
      } catch (jwtError) {
        console.error("JWT verification failed:", jwtError.message);
      }
    }
    
    // If both methods fail, return unauthorized
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token',
      code: 'AUTH_ERROR'
    });
    
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = {
  authenticateHybridToken
};
