import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { exchangeFirebaseToken, storeJWTToken, clearStoredJWTToken } from './authTokenService';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

/**
 * Enhanced authentication initialization service
 * Handles proper auth state restoration on app startup
 */
class AuthInitService {
  constructor() {
    this.isInitialized = false;
    this.authStateListeners = [];
    this.initPromise = null;
    console.log('[AUTH_DEBUG_V2] AuthInitService constructed');
  }

  /**
   * Initialize authentication state with proper persistence handling
   */
  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      console.log('[AUTH_DEBUG_V2] AuthInitService: Starting authentication initialization...');
      console.log('[AUTH_DEBUG_V2] Time:', new Date().toISOString());

      // Check if we have stored user data
      const storedUser = localStorage.getItem('sbbs_auth');
      const allKeys = Object.keys(localStorage);
      console.log('[AUTH_DEBUG_V2] All LocalStorage Keys:', allKeys);
      console.log('[AUTH_DEBUG_V2] LocalStorage sbbs_auth exists:', !!storedUser);

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          console.log('[AUTH_DEBUG_V2] storedUser uid:', parsed.uid);
        } catch (e) { console.log('[AUTH_DEBUG_V2] storedUser parse error', e); }
      }

      let hasStoredUser = false;

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.uid) {
            hasStoredUser = true;
            console.log('[AUTH_DEBUG_V2] AuthInitService: Found stored user data:', userData.uid);
          }
        } catch (error) {
          console.error('[AUTH_DEBUG_V2] AuthInitService: Error parsing stored user:', error);
          localStorage.removeItem('sbbs_auth');
        }
      }

      let authStateResolved = false;
      let timeoutId = null;

      // Set up Firebase auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('[AUTH_DEBUG_V2] onAuthStateChanged triggered');
        console.log('[AUTH_DEBUG_V2] User object present:', !!user);
        if (user) console.log('[AUTH_DEBUG_V2] User uid:', user.uid);

        console.log('[AUTH_DEBUG_V2] authStateResolved:', authStateResolved);
        console.log('[AUTH_DEBUG_V2] hasStoredUser:', hasStoredUser);

        let processedUser = user;

        // If user exists, exchange for JWT and sync with backend
        if (user) {
          try {
            console.log('AuthInitService: Exchanging Firebase token for JWT...');

            // Add retry logic for token exchange
            let tokenResult = null;
            let retryCount = 0;
            const maxRetries = 3;

            while (!tokenResult && retryCount < maxRetries) {
              try {
                tokenResult = await exchangeFirebaseToken(user);
              } catch (e) {
                console.warn(`AuthInitService: Token exchange attempt ${retryCount + 1} failed:`, e);
                retryCount++;
                if (retryCount < maxRetries) {
                  // Wait increasing amount of time before retry (500ms, 1000ms, 1500ms)
                  await new Promise(r => setTimeout(r, 500 * retryCount));
                }
              }
            }

            if (tokenResult) {
              storeJWTToken(tokenResult.data.token);
              console.log('AuthInitService: JWT token stored successfully');
            } else {
              throw new Error('Failed to exchange token after multiple retries');
            }

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
          // ONLY clear token if we are NOT waiting for stored user fallback
          // This prevents clearing the token on the initial "null" flash from Firebase 
          // when we actually have a valid stored session we want to use.
          if (authStateResolved || !hasStoredUser) {
            console.log('[AUTH_DEBUG_V2] Clearing JWT token (User is null and no stored fallback)');
            clearStoredJWTToken();
          } else {
            console.log('[AUTH_DEBUG_V2] Preserving JWT token despite null user (Waiting for stored fallback)');
          }
        }

        // If we have a stored user but Firebase returns null initially, 
        // we ignore this initial null state and wait for the timeout to fallback to stored user.
        if (!processedUser && hasStoredUser) {
          console.log('[AUTH_DEBUG_V2] AuthInitService: Ignoring initial null auth state in favor of stored user');
          return;
        }

        // Clear timeout if Firebase resolves quickly (with user, or null if no stored user)
        if (timeoutId) {
          console.log('[AUTH_DEBUG] Clearing timeout, Firebase resolved first');
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        authStateResolved = true;
        this.isInitialized = true;

        // Notify all listeners
        this.notifyListeners(processedUser);
        resolve(processedUser);
      });

      // If we have stored user data but Firebase hasn't resolved, use stored data
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
              console.error('[AUTH_DEBUG_V2] AuthInitService: Error using stored user data:', error);
              this.notifyListeners(null);
              resolve(null);
            }
          }
        }, 45000); // Increased to 45000ms (45s) to handle Render cold starts
      } else {
        // No stored user
        timeoutId = setTimeout(() => {
          if (!authStateResolved) {
            console.log('[AUTH_DEBUG_V2] AuthInitService: No stored user, Firebase timeout');
            authStateResolved = true;
            this.isInitialized = true;
            this.notifyListeners(null);
            resolve(null);
          }
        }, 45000); // Increased to 45000ms (45s)
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
      const API_URL = API_BASE_URL;

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

    // Clear all user-specific profile caches
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sbbs_profile_') || key.startsWith('sbbs_backend_user')) {
        console.log(`AuthInitService: Clearing user-specific cache: ${key}`);
        localStorage.removeItem(key);
      }
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
