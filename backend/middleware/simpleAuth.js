const Customer = require('../models/Customer');

// Simple authentication middleware that creates customers based on Firebase UID
const authenticateSimple = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: "Authorization header with Bearer token is required" 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // For now, we'll extract user info from the token payload (unsafe for production)
    // This is a temporary solution until proper Firebase Admin SDK is configured
    try {
      // Try to decode the token without verification (TEMPORARY SOLUTION)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      if (payload.uid || payload.user_id) {
        const firebaseUid = payload.uid || payload.user_id;
        const email = payload.email;
        
        // Find or create customer
        let customer = await Customer.findOne({ firebase_uid: firebaseUid });
        
        if (!customer && email) {
          customer = new Customer({
            firebase_uid: firebaseUid,
            email,
            name: payload.name || payload.display_name || email.split('@')[0],
            is_active: true
          });
          
          await customer.save();
          console.log(`Created new customer: ${customer.email}`);
        }
        
        if (customer) {
          req.user = {
            id: customer._id,
            firebaseUid: customer.firebase_uid,
            email: customer.email,
            name: customer.name,
            customerId: customer._id
          };
          
          return next();
        }
      }
    } catch (decodeError) {
      console.log('Token decode failed:', decodeError.message);
    }
    
    // If all methods fail, return unauthorized
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
  authenticateSimple
};
