const admin = require('../lib/firebase');
const Customer = require('../models/Customer');

/**
 * Middleware to authenticate Firebase ID tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: "Authorization header with Bearer token is required" 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!admin) {
      console.error('Firebase Admin not initialized');
      return res.status(500).json({
        success: false,
        error: 'Firebase authentication not available',
        code: 'FIREBASE_ERROR'
      });
    }

    try {
      // Verify the Firebase ID token
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
      
      next();
    } catch (error) {
      console.error("Firebase token verification failed:", error.message);
      
      let errorMessage = 'Invalid or expired token';
      if (error.code === 'auth/id-token-expired') {
        errorMessage = 'Token has expired';
      } else if (error.code === 'auth/argument-error') {
        errorMessage = 'Invalid token format';
      }
      
      return res.status(401).json({ 
        success: false, 
        error: errorMessage,
        code: 'AUTH_ERROR'
      });
    }
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
  authenticateFirebaseToken
};
