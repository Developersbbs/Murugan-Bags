import axios from 'axios';
import { API_BASE_URL } from '../config/api';

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
 * Store JWT token in localStorage
 * @param {string} token - JWT token
 */
export const storeJWTToken = (token) => {
  if (typeof window !== 'undefined') {
    // Store in multiple locations for compatibility
    localStorage.setItem('authToken', token);
    localStorage.setItem('jwt_token', token);
    console.log('JWT token stored in localStorage with keys: authToken, jwt_token');
  }
};

/**
 * Get stored JWT token
 * @returns {string|null} JWT token or null
 */
export const getStoredJWTToken = () => {
  if (typeof window !== 'undefined') {
    // Try multiple token storage locations for compatibility
    return localStorage.getItem('jwt_token') || 
           localStorage.getItem('authToken') || 
           sessionStorage.getItem('jwt_token') || 
           sessionStorage.getItem('authToken');
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
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('jwt_token');
    console.log('All JWT tokens cleared from storage');
  }
};

/**
 * Get stored JWT token
 * @returns {string} JWT token
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('jwt_token') || '';
};
