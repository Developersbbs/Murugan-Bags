// Utility functions for authentication management

/**
 * Completely clear all authentication-related data from storage
 * This ensures no stale auth data remains after logout
 */
export const clearAllAuthData = () => {
  if (typeof window === 'undefined') return;

  try {
    // List of all possible auth-related keys
    const authKeys = [
      'sbbs_auth',
      'sbbs_user',
      'sbbs_token',
      'firebase_auth_token',
      'firebase_user',
      'auth_token',
      'user_data',
      'persist:root',
      'persist:auth'
    ];

    // Clear from both localStorage and sessionStorage
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear Firebase-specific keys (these are generated dynamically)
    const firebaseKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('firebase:') || 
      key.includes('firebaseui') ||
      key.includes('firebase-heartbeat')
    );

    firebaseKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('All auth data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Check if user is authenticated based on current storage state
 */
export const isUserAuthenticated = () => {
  if (typeof window === 'undefined') return false;

  try {
    const authData = localStorage.getItem('sbbs_auth');
    return authData && JSON.parse(authData) !== null;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
};

/**
 * Get current user data from storage
 */
export const getCurrentUserFromStorage = () => {
  if (typeof window === 'undefined') return null;

  try {
    const authData = localStorage.getItem('sbbs_auth');
    return authData ? JSON.parse(authData) : null;
  } catch (error) {
    console.error('Error getting user from storage:', error);
    localStorage.removeItem('sbbs_auth');
    return null;
  }
};

/**
 * Force logout with complete cleanup
 * This is a nuclear option that clears everything and redirects
 */
export const forceLogout = () => {
  clearAllAuthData();
  
  // Clear any remaining global state
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (error) {
      console.log('Error clearing reCAPTCHA:', error);
    }
    window.recaptchaVerifier = null;
  }
  
  window.confirmationResult = null;
  
  // Redirect to login
  window.location.href = '/login';
};
