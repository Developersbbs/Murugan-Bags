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
    
    if (jwtToken) {
      config.headers.Authorization = `Bearer ${jwtToken}`;
      return config;
    }
    
    // Fallback: Try to get Firebase ID token
    const { auth } = await import('../firebase/config');
    const user = auth.currentUser;
    
    if (user) {
      const firebaseToken = await user.getIdToken();
      config.headers.Authorization = `Bearer ${firebaseToken}`;
    }
  } catch (error) {
    console.warn('Error getting authentication token:', error);
  }
  
  return config;
});

// Wishlist API functions
export const wishlistAPI = {
  // Get user's wishlist from MongoDB
  getWishlist: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.WISHLIST);
      return response.data;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
  },

  // Add item to wishlist in MongoDB
  addToWishlist: async (item) => {
    try {
      console.log('wishlistService: Sending request to:', API_BASE_URL + API_ENDPOINTS.WISHLIST_ADD);
      console.log('wishlistService: Request payload:', item);
      const response = await api.post(API_ENDPOINTS.WISHLIST_ADD, item);
      console.log('wishlistService: Success response:', response.data);
      return response.data;
    } catch (error) {
      console.error('wishlistService: Error adding to wishlist:', error);
      if (error.response) {
        console.error('wishlistService: Backend error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('wishlistService: No response received:', error.request);
      } else {
        console.error('wishlistService: Request setup error:', error.message);
      }
      throw error;
    }
  },

  // Remove item from MongoDB wishlist by item ID
  removeFromWishlist: async (itemId) => {
    try {
      const response = await api.delete(API_ENDPOINTS.WISHLIST_REMOVE(itemId));
      return response.data;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  // Remove item from MongoDB wishlist by product ID
  removeFromWishlistByProduct: async (productId) => {
    try {
      const response = await api.delete(API_ENDPOINTS.WISHLIST_REMOVE_PRODUCT(productId));
      return response.data;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  // Clear entire wishlist in MongoDB
  clearWishlist: async () => {
    try {
      const response = await api.delete(API_ENDPOINTS.WISHLIST_CLEAR);
      return response.data;
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      throw error;
    }
  },

  // Get wishlist item count from MongoDB
  getWishlistCount: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.WISHLIST_COUNT);
      return response.data;
    } catch (error) {
      console.error('Error fetching wishlist count:', error);
      throw error;
    }
  },

  // Check if product is in wishlist
  checkInWishlist: async (productId) => {
    try {
      const response = await api.get(API_ENDPOINTS.WISHLIST_CHECK(productId));
      return response.data;
    } catch (error) {
      console.error('Error checking wishlist:', error);
      throw error;
    }
  },

  // Sync wishlist from cookies/localStorage to MongoDB (migration)
  syncWishlist: async (items) => {
    try {
      const response = await api.post(API_ENDPOINTS.WISHLIST_SYNC, { items });
      return response.data;
    } catch (error) {
      console.error('Error syncing wishlist:', error);
      throw error;
    }
  }
};

// Helper function to transform frontend wishlist item to backend format
export const transformWishlistItemForBackend = (product) => {
  return {
    product_id: product._id,
    product_name: product.name,
    product_image: product.images?.[0]?.url || product.image_url?.[0] || null,
    price: product.price,
    discounted_price: product.salePrice || product.price
  };
};

export default wishlistAPI;
