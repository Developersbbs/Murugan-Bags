import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    // Try multiple token storage locations
    const jwtToken = localStorage.getItem('jwt_token') || 
                     localStorage.getItem('authToken') || 
                     sessionStorage.getItem('jwt_token') || 
                     sessionStorage.getItem('authToken');
    
    console.log('CartService: Available tokens:', {
      jwt_token: localStorage.getItem('jwt_token'),
      authToken: localStorage.getItem('authToken'),
      session_jwt: sessionStorage.getItem('jwt_token'),
      session_auth: sessionStorage.getItem('authToken'),
      selected: jwtToken ? 'YES' : 'NO'
    });
    
    if (jwtToken) {
      config.headers.Authorization = `Bearer ${jwtToken}`;
      console.log('CartService: Added authorization header');
    } else {
      console.warn('CartService: No JWT token found');
    }
  } catch (error) {
    console.warn('Error getting authentication token:', error);
  }
  
  return config;
});

// Cart API functions
export const cartAPI = {
  // Get user's cart from MongoDB
  getCart: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CART);
      return response.data;
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  },

  // Add item to cart in MongoDB
  addToCart: async (item) => {
    try {
      console.log('cartService: Sending request to:', API_BASE_URL + API_ENDPOINTS.CART_ADD);
      console.log('cartService: Request payload:', item);
      const response = await api.post(API_ENDPOINTS.CART_ADD, item);
      console.log('cartService: Success response:', response.data);
      return response.data;
    } catch (error) {
      console.error('cartService: Error adding to cart:', error);
      if (error.response) {
        console.error('cartService: Backend error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('cartService: No response received:', error.request);
      } else {
        console.error('cartService: Request setup error:', error.message);
      }
      throw error;
    }
  },

  // Update item quantity in MongoDB cart
  updateCartItem: async (itemId, quantity) => {
    try {
      const response = await api.put(API_ENDPOINTS.CART_UPDATE(itemId), { quantity });
      return response.data;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  },

  // Remove item from MongoDB cart
  removeFromCart: async (itemId) => {
    try {
      const response = await api.delete(API_ENDPOINTS.CART_REMOVE(itemId));
      return response.data;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  },

  // Clear entire cart in MongoDB
  clearCart: async () => {
    try {
      console.log('CartService: Clearing cart...');
      const response = await api.delete(API_ENDPOINTS.CART_CLEAR);
      console.log('CartService: Clear cart response:', response);
      return response.data;
    } catch (error) {
      console.error('CartService: Error clearing cart:', error);
      console.error('CartService: Error response:', error.response);
      throw error;
    }
  },

  // Get cart item count from MongoDB
  getCartCount: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CART_COUNT);
      return response.data;
    } catch (error) {
      console.error('Error fetching cart count:', error);
      throw error;
    }
  },

  // Sync cart from cookies/localStorage to MongoDB (migration)
  syncCart: async (items) => {
    try {
      const response = await api.post(API_ENDPOINTS.CART_SYNC, { items });
      return response.data;
    } catch (error) {
      console.error('Error syncing cart:', error);
      throw error;
    }
  }
};

// Helper function to transform frontend cart item to backend format
export const transformCartItemForBackend = (product, variant = null, quantity = 1) => {
  return {
    product_id: product._id,
    variant_sku: variant ? variant._id : null,
    quantity,
    price: variant ? variant.selling_price : product.selling_price,
    discounted_price: variant ? variant.selling_price : product.selling_price,
    product_name: variant ? `${product.name} - ${variant.name || 'Variant'}` : product.name,
    product_image: product.image_url?.[0] || null,
    variant_name: variant ? variant.name : null,
    variant_attributes: variant ? variant.attributes : null
  };
};

export default cartAPI;
