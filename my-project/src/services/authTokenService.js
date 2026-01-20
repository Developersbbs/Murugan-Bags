import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { validateToken, isTokenExpired, shouldRefreshToken } from '../utils/tokenUtils';
import { auth } from '../firebase/config';

// Create axios instance for auth token service
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

/**
 * Exchange Firebase user data for a JWT token
 * @param {Object} firebaseUser - Firebase user object
 * @returns {Promise<Object>} JWT token and user data
 */
export const exchangeFirebaseToken = async (firebaseUser) => {
  try {
    const response = await api.post('/auth-token/firebase-exchange', {
      firebaseUser: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        phoneNumber: firebaseUser.phoneNumber,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        providerData: firebaseUser.providerData
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error exchanging Firebase token:', error);
    throw error;
  }
};

/**
 * Store JWT token in localStorage with metadata
 * @param {string} token - JWT token
 */
export const storeJWTToken = (token) => {
  if (typeof window !== 'undefined') {
    // Store in multiple locations for compatibility
    localStorage.setItem('authToken', token);
    localStorage.setItem('jwt_token', token);

    // Store timestamp for tracking
    localStorage.setItem('jwt_token_stored_at', Date.now().toString());

    console.log('JWT token stored in localStorage with keys: authToken, jwt_token');
  }
};

/**
 * Get stored JWT token with validation
 * @returns {string|null} JWT token or null if invalid/expired
 */
export const getStoredJWTToken = () => {
  if (typeof window !== 'undefined') {
    // Try multiple token storage locations for compatibility
    const token = localStorage.getItem('jwt_token') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('jwt_token') ||
      sessionStorage.getItem('authToken');

    // Validate token before returning
    if (token && validateToken(token)) {
      return token;
    }

    // Token is invalid or expired
    if (token) {
      console.log('Stored JWT token is invalid or expired, clearing it');
      clearStoredJWTToken();
    }

    return null;
  }
  return null;
};

/**
 * Clear stored JWT token
 */
export const clearStoredJWTToken = () => {
  if (typeof window !== 'undefined') {
    // Clear all possible token storage locations
    localStorage.removeItem('authToken');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_token_stored_at');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('jwt_token');
    console.log('All JWT tokens cleared from storage');
  }
};

/**
 * Get stored JWT token (legacy function for compatibility)
 * @returns {string} JWT token
 */
export const getAuthToken = () => {
  return getStoredJWTToken() || '';
};

/**
 * Refresh JWT token by re-exchanging Firebase token
 * @returns {Promise<string|null>} New JWT token or null if failed
 */
export const refreshJWTToken = async () => {
  try {
    console.log('Refreshing JWT token...');

    // Get current Firebase user
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error('Cannot refresh JWT token: No Firebase user logged in');
      return null;
    }

    // Exchange Firebase token for new JWT
    const response = await exchangeFirebaseToken(currentUser);

    if (response.success && response.data && response.data.token) {
      const newToken = response.data.token;
      storeJWTToken(newToken);
      console.log('JWT token refreshed successfully');
      return newToken;
    }

    console.error('Failed to refresh JWT token: Invalid response');
    return null;
  } catch (error) {
    console.error('Error refreshing JWT token:', error);
    return null;
  }
};

/**
 * Get valid JWT token, refreshing if necessary
 * @returns {Promise<string|null>} Valid JWT token or null
 */
export const getValidJWTToken = async () => {
  let token = getStoredJWTToken();

  // If no token or token is expired, try to refresh
  if (!token || isTokenExpired(token)) {
    console.log('JWT token missing or expired, attempting refresh...');
    token = await refreshJWTToken();
  }
  // If token is about to expire soon, refresh proactively
  else if (shouldRefreshToken(token)) {
    console.log('JWT token expiring soon, refreshing proactively...');
    const newToken = await refreshJWTToken();
    if (newToken) {
      token = newToken;
    }
    // If refresh fails, use existing token (it's still valid)
  }

  return token;
};
