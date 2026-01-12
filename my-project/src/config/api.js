// API Configuration
const getApiBaseUrl = () => {
  let url = 'http://localhost:5000/api';

  // Runtime check for Netlify environment (bulletproof)
  if (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')) {
    console.log('API Config: Netlify domain detected, enforcing /api proxy');
    return '/api';
  }

  // Check for Vite environment variables first
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) {
      url = import.meta.env.VITE_API_URL;
      console.log('API Config: Found VITE_API_URL:', url);
    } else if (import.meta.env.MODE === 'production' || import.meta.env.PROD) {
      // Production build without strict VITE_API_URL - default to relative path for proxy
      console.log('API Config: Production mode detected (Vite), defaulting to /api');
      url = '/api';
    }
  }

  // Fallback for non-Vite environments (e.g. legacy or tests)
  else if (typeof process !== 'undefined') {
    if (process.env?.REACT_APP_API_URL) {
      url = process.env.REACT_APP_API_URL;
    } else if (process.env.NODE_ENV === 'production') {
      url = '/api';
    }
  }

  // Force HTTP for localhost to prevent SSL errors during development
  // This aggressively fixes accidental HTTPS usage for local development
  if (url && (url.includes('localhost') || url.includes('127.0.0.1')) && url.toLowerCase().trim().startsWith('https')) {
    console.warn('API Config: Forcing HTTP for localhost/127.0.0.1 to prevent SSL errors. Original:', url);
    url = url.replace(/^https:/i, 'http:');
    console.log('API Config: New URL:', url);
  } else {
    console.log('API Config: Use URL:', url);
  }

  return url;
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  // Cart endpoints
  CART: '/cart',
  CART_ADD: '/cart/add',
  CART_UPDATE: (itemId) => `/cart/update/${itemId}`,
  CART_REMOVE: (itemId) => `/cart/remove/${itemId}`,
  CART_CLEAR: '/cart/clear',
  CART_COUNT: '/cart/count',
  CART_SYNC: '/cart/sync',

  // Wishlist endpoints
  WISHLIST: '/wishlist',
  WISHLIST_ADD: '/wishlist/add',
  WISHLIST_REMOVE: (itemId) => `/wishlist/remove/${itemId}`,
  WISHLIST_REMOVE_PRODUCT: (productId) => `/wishlist/remove-product/${productId}`,
  WISHLIST_CLEAR: '/wishlist/clear',
  WISHLIST_COUNT: '/wishlist/count',
  WISHLIST_CHECK: (productId) => `/wishlist/check/${productId}`,
  WISHLIST_SYNC: '/wishlist/sync'
};

// Environment detection
export const isDevelopment = () => {
  if (typeof import.meta !== 'undefined') {
    return import.meta.env?.MODE === 'development';
  }
  if (typeof process !== 'undefined') {
    return process.env?.NODE_ENV === 'development';
  }
  return true; // Default to development
};

export const isProduction = () => !isDevelopment();
