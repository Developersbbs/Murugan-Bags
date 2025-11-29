import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { exchangeFirebaseToken, storeJWTToken, clearStoredJWTToken } from './authTokenService';
import axios from 'axios';

/**
 * Enhanced authentication initialization service
 * Handles proper auth state restoration on app startup
 */
class AuthInitService {
  constructor() {
    this.isInitialized = false;
    this.authStateListeners = [];
    this.initPromise = null;
  }

  /**
   * Initialize authentication state with proper persistence handling
   */
  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      console.log('AuthInitService: Starting authentication initialization...');
      
      // Check if we have stored user data
      const storedUser = localStorage.getItem('sbbs_auth');
      let hasStoredUser = false;
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.uid) {
            hasStoredUser = true;
            console.log('AuthInitService: Found stored user data:', userData.uid);
          }
        } catch (error) {
          console.error('AuthInitService: Error parsing stored user:', error);
          localStorage.removeItem('sbbs_auth');
        }
      }

      let authStateResolved = false;
      let timeoutId = null;

      // Set up Firebase auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('AuthInitService: Firebase auth state changed:', user ? user.uid : 'null');
        
        let processedUser = user;
        
        // If user exists, exchange for JWT and sync with backend
        if (user) {
          try {
            console.log('AuthInitService: Exchanging Firebase token for JWT...');
            const tokenResult = await exchangeFirebaseToken(user);
            storeJWTToken(tokenResult.data.token);
            console.log('AuthInitService: JWT token stored successfully');
            
            // Sync with backend to get complete user data
            const syncedUser = await this.syncUserWithBackend(user);
            processedUser = syncedUser || user;
          } catch (error) {
            console.warn('AuthInitService: Failed to exchange Firebase token, continuing with Firebase auth:', error);
            try {
              const syncedUser = await this.syncUserWithBackend(user);
              processedUser = syncedUser || user;
            } catch (syncError) {
              console.warn('AuthInitService: Failed to sync with backend:', syncError);
            }
          }
        } else {
          // Clear JWT token on logout
          clearStoredJWTToken();
        }
        
        if (!authStateResolved) {
          // Clear timeout if Firebase resolves quickly
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          authStateResolved = true;
          this.isInitialized = true;
          
          // Notify all listeners
          this.notifyListeners(processedUser);
          resolve(processedUser);
        } else {
          // Subsequent auth state changes
          this.notifyListeners(processedUser);
        }
      });

      // If we have stored user data but Firebase hasn't resolved within 1.5 seconds,
      // use the stored data to prevent logout
      if (hasStoredUser) {
        timeoutId = setTimeout(() => {
          if (!authStateResolved) {
            console.log('AuthInitService: Firebase timeout, using stored user data');
            authStateResolved = true;
            this.isInitialized = true;
            
            try {
              const userData = JSON.parse(localStorage.getItem('sbbs_auth'));
              this.notifyListeners(userData);
              resolve(userData);
            } catch (error) {
              console.error('AuthInitService: Error using stored user data:', error);
              this.notifyListeners(null);
              resolve(null);
            }
          }
        }, 1500); // Reduced from 3000ms to 1500ms
      } else {
        // No stored user, set shorter timeout
        timeoutId = setTimeout(() => {
          if (!authStateResolved) {
            console.log('AuthInitService: No stored user, Firebase timeout');
            authStateResolved = true;
            this.isInitialized = true;
            this.notifyListeners(null);
            resolve(null);
          }
        }, 800); // Reduced from 1000ms to 800ms
      }

      // Keep the unsubscribe function for cleanup
      this.firebaseUnsubscribe = unsubscribe;
    });

    return this.initPromise;
  }

  /**
   * Add a listener for auth state changes
   */
  addAuthStateListener(callback) {
    this.authStateListeners.push(callback);
    
    // If already initialized, immediately call the callback
    if (this.isInitialized && this.currentUser !== undefined) {
      callback(this.currentUser);
    }
  }

  /**
   * Remove an auth state listener
   */
  removeAuthStateListener(callback) {
    const index = this.authStateListeners.indexOf(callback);
    if (index > -1) {
      this.authStateListeners.splice(index, 1);
    }
  }

  /**
   * Sync user with backend
   */
  async syncUserWithBackend(user, additionalData = {}) {
    if (!user) return null;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const userData = {
        firebaseUid: user.uid,
        email: user.email,
        displayName: user.displayName || additionalData.name,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL,
        providerId: user.providerData?.[0]?.providerId,
        ...additionalData
      };

      const response = await axios.post(`${API_URL}/auth/firebase/sync`, userData);
      return response.data.data;
    } catch (error) {
      console.error('AuthInitService: Error syncing user with backend:', error);
      return null;
    }
  }

  /**
   * Notify all listeners of auth state change
   */
  notifyListeners(user) {
    this.currentUser = user;
    this.authStateListeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('AuthInitService: Error in auth state listener:', error);
      }
    });
  }

  /**
   * Force logout and clear all data
   */
  forceLogout() {
    console.log('AuthInitService: Force logout initiated');
    this.currentUser = null;
    
    // Clear localStorage
    const authKeys = [
      'sbbs_auth',
      'sbbs_user',
      'sbbs_token',
      'firebase_auth_token',
      'firebase_user',
      'auth_token',
      'user_data',
      'authToken'
    ];
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Notify listeners
    this.notifyListeners(null);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.firebaseUnsubscribe) {
      this.firebaseUnsubscribe();
    }
    this.authStateListeners = [];
  }
}

// Create singleton instance
const authInitService = new AuthInitService();

export default authInitService;
