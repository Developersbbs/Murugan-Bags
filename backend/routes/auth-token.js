const express = require('express');
const router = express.Router();
const { createCustomerFromFirebase } = require('../utils/tokenUtils');

// Test endpoint to check if JWT_SECRET is configured
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth token service is running',
    jwtConfigured: !!process.env.JWT_SECRET,
    timestamp: new Date().toISOString()
  });
});

// Exchange Firebase user data for JWT token
router.post('/firebase-exchange', async (req, res) => {
  try {
    const { firebaseUser } = req.body;
    
    console.log('Firebase token exchange request:', {
      uid: firebaseUser?.uid,
      email: firebaseUser?.email,
      phoneNumber: firebaseUser?.phoneNumber,
      displayName: firebaseUser?.displayName
    });
    
    if (!firebaseUser || !firebaseUser.uid) {
      console.log('Firebase token exchange failed: Missing uid');
      return res.status(400).json({
        success: false,
        message: 'Invalid Firebase user data - uid is required'
      });
    }
    
    // Validate that user has either email or phone number
    if (!firebaseUser.email && !firebaseUser.phoneNumber) {
      console.log('Firebase token exchange failed: Missing email and phoneNumber');
      return res.status(400).json({
        success: false,
        message: 'Invalid Firebase user data - either email or phoneNumber is required'
      });
    }
    
    console.log('Processing Firebase token exchange for user:', firebaseUser.uid);
    const result = await createCustomerFromFirebase(firebaseUser);
    
    console.log('Firebase token exchange successful for user:', firebaseUser.uid, 'Customer ID:', result.customer._id);
    
    res.json({
      success: true,
      data: {
        token: result.token,
        user: result.user,
        customer: {
          id: result.customer._id,
          email: result.customer.email,
          displayName: result.customer.name,
          photoURL: result.customer.image_url
        }
      }
    });
  } catch (error) {
    console.error('Error exchanging Firebase token:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating authentication token',
      error: error.message
    });
  }
});

module.exports = router;
