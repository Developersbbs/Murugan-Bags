const jwt = require("jsonwebtoken");
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

/**
 * Middleware to authenticate JWT tokens for both staff and customer tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: "Authorization header with Bearer token is required" 
      });
    }

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.error("JWT verification failed:", err.name);
        const errorMessage = err.name === 'TokenExpiredError' 
          ? 'Access token has expired' 
          : 'Invalid or malformed token';
        
        return res.status(401).json({ 
          success: false, 
          error: errorMessage,
          code: 'AUTH_ERROR'
        });
      }

      try {
        // Check if it's a staff or customer token
        if (decoded.role) {
          // This is a staff user
          const staff = await Staff.findById(decoded.id);
          if (!staff) {
            console.log(`Staff not found for ID: ${decoded.id}`);
            return res.status(401).json({ 
              success: false, 
              error: 'Staff not found',
              code: 'AUTH_ERROR'
            });
          }
          
          console.log(`Authenticated staff ID: ${staff._id}, Email: ${staff.email}, Role: ${staff.role}`);
          
          // Attach staff data to request
          req.user = {
            ...decoded,
            id: staff._id,
            email: staff.email,
            role: staff.role,
            type: 'staff'
          };
        } else if (decoded.id) {
          // This is a customer
          const customer = await Customer.findById(decoded.id);
          if (!customer) {
            console.log(`Customer not found for ID: ${decoded.id}`);
            return res.status(401).json({ 
              success: false, 
              error: 'Customer not found',
              code: 'AUTH_ERROR'
            });
          }
          
          console.log(`Authenticated customer ID: ${customer._id}, Email: ${customer.email}`);
          
          // Attach customer data to request
          req.user = {
            ...decoded,
            id: customer._id,
            email: customer.email,
            type: 'customer'
          };
        } else {
          return res.status(401).json({
            success: false,
            error: 'Invalid token format',
            code: 'AUTH_ERROR'
          });
        }
        
        next();
      } catch (dbError) {
        console.error('Database error during authentication:', dbError);
        return res.status(500).json({ 
          success: false, 
          error: 'Internal server error during authentication',
          code: 'AUTH_ERROR'
        });
      }
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

/**
 * Middleware to check if user has required role
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorize
};
