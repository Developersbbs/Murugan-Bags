const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

/**
 * Generate JWT token for a customer
 * @param {Object} customer - Customer object from database
 * @returns {string} JWT token
 */
const generateJWTToken = (customer) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  const payload = {
    id: customer._id,
    name: customer.name,
    firebaseUid: customer.firebase_uid
  };
  
  // Include email if it exists
  if (customer.email) {
    payload.email = customer.email;
  }
  
  // Include phone if it exists
  if (customer.phone) {
    payload.phone = customer.phone;
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Create or update customer from Firebase user data and return JWT token
 * @param {Object} firebaseUser - Firebase user object
 * @returns {Object} Customer data and JWT token
 */
const createCustomerFromFirebase = async (firebaseUser) => {
  try {
    console.log('createCustomerFromFirebase: Processing user:', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      name: firebaseUser.name,
      phoneNumber: firebaseUser.phoneNumber
    });
    
    let customer = await Customer.findOne({ firebase_uid: firebaseUser.uid });
    
    if (!customer) {
      // Create new customer
      const customerData = {
        firebase_uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.name || 'User',
        is_active: true
      };
      
      // Only set email if it exists (phone users might not have email)
      if (firebaseUser.email) {
        customerData.email = firebaseUser.email;
      }
      
      if (firebaseUser.phoneNumber) {
        customerData.phone = firebaseUser.phoneNumber.replace(/\D/g, '').slice(-10);
      }
      
      if (firebaseUser.photoURL) {
        customerData.image_url = firebaseUser.photoURL;
      }
      
      customer = new Customer(customerData);
      await customer.save();
      console.log(`Created new customer: ${customer.name} (${customer.email || customer.phone})`);
    } else {
      // Update existing customer
      const newName = firebaseUser.displayName || firebaseUser.name;
      if (newName && newName !== 'User') customer.name = newName;
      if (firebaseUser.phoneNumber) customer.phone = firebaseUser.phoneNumber.replace(/\D/g, '').slice(-10);
      // Only update image_url if not already set (preserve custom uploaded photos)
      if (firebaseUser.photoURL && !customer.image_url) customer.image_url = firebaseUser.photoURL;
      customer.updated_at = new Date();
      
      await customer.save();
      console.log(`Updated existing customer: ${customer.name} (${customer.email || customer.phone})`);
    }
    
    const token = generateJWTToken(customer);
    
    console.log(`Generated JWT for customer ID: ${customer._id}, Firebase UID: ${customer.firebase_uid}, Email: ${customer.email}`);
    
    return {
      customer,
      token,
      user: {
        id: customer._id,
        email: customer.email,
        name: customer.name,
        firebaseUid: customer.firebase_uid
      }
    };
  } catch (error) {
    console.error('Error creating customer from Firebase:', error);
    throw error;
  }
};

module.exports = {
  generateJWTToken,
  createCustomerFromFirebase
};
