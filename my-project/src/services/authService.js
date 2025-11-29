import { 
  auth, 
  RecaptchaVerifier,
  googleProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  fetchSignInMethodsForEmail
} from '../firebase/config';
import { GoogleAuthProvider } from 'firebase/auth';
import axios from 'axios';
import { clearAllAuthData } from '../utils/authUtils';
import { exchangeFirebaseToken, storeJWTToken, clearStoredJWTToken } from './authTokenService';

// Use environment variable if set, otherwise default to local development URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Sync user with backend
const syncUserWithBackend = async (user, additionalData = {}) => {
  if (!user) return null;
  
  try {
    // For phone authentication, prioritize the provided name
    const userName = additionalData.name || user.displayName || 'User';
    
    const userData = {
      firebaseUid: user.uid,
      email: user.email,
      displayName: userName,
      name: userName, // Ensure name is explicitly set
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      providerId: user.providerData?.[0]?.providerId,
      ...additionalData
    };
    
    console.log('syncUserWithBackend: Sending user data:', userData);

    const response = await axios.post(`${API_URL}/auth/firebase/sync`, userData);
    console.log('syncUserWithBackend: Backend response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error syncing user with backend:', error);
    // Try alternative endpoint for Google auth
    if (additionalData.googleId) {
      try {
        const googleResponse = await axios.post(`${API_URL}/auth/google`, {
          name: user.displayName,
          email: user.email,
          googleId: additionalData.googleId,
          imageUrl: user.photoURL
        });
        return googleResponse.data.data;
      } catch (googleError) {
        console.error('Error with Google auth endpoint:', googleError);
      }
    }
    return null;
  }
};

// Set up auth state listener
export const setupAuthListener = (callback) => {
  console.log('Setting up Firebase auth state listener...');
  
  return onAuthStateChanged(auth, async (user) => {
    console.log('Firebase auth state changed:', user ? { uid: user.uid, email: user.email } : 'null');
    
    if (user) {
      try {
        // Exchange Firebase user for JWT token
        console.log('Exchanging Firebase token for JWT...');
        const tokenResult = await exchangeFirebaseToken(user);
        storeJWTToken(tokenResult.data.token);
        console.log('JWT token stored successfully');
        
        const syncedUser = await syncUserWithBackend(user);
        callback(syncedUser || user);
      } catch (error) {
        console.warn('Failed to exchange Firebase token, continuing with Firebase auth:', error);
        const syncedUser = await syncUserWithBackend(user);
        callback(syncedUser || user);
      }
    } else {
      // Clear JWT token on logout
      console.log('Firebase user is null, clearing JWT token');
      clearStoredJWTToken();
      callback(null);
    }
  });
};

// Initialize reCAPTCHA verifier
const setupRecaptcha = (elementId = 'recaptcha-container') => {
  // Clear existing verifier if it exists
  if (window.recaptchaVerifier) {
    try {
      console.log('Clearing existing reCAPTCHA verifier...');
      window.recaptchaVerifier.clear();
    } catch (error) {
      console.log('Error clearing existing reCAPTCHA:', error);
    }
    window.recaptchaVerifier = null;
  }

  // Clear the DOM element content to ensure clean state
  const recaptchaElement = document.getElementById(elementId);
  if (recaptchaElement) {
    console.log('Clearing reCAPTCHA DOM element content...');
    recaptchaElement.innerHTML = '';
    // Remove any existing reCAPTCHA related attributes
    recaptchaElement.removeAttribute('data-sitekey');
    recaptchaElement.removeAttribute('data-callback');
    recaptchaElement.removeAttribute('data-expired-callback');
  }

  try {
    console.log('Creating new reCAPTCHA verifier...');
    window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: (response) => {
        console.log('reCAPTCHA solved:', response);
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
        // Clean up on expiration
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (clearError) {
            console.log('Error clearing expired reCAPTCHA:', clearError);
          }
          window.recaptchaVerifier = null;
        }
      }
    });
    
    console.log('reCAPTCHA verifier created successfully');
    return window.recaptchaVerifier;
  } catch (error) {
    console.error('Error setting up reCAPTCHA:', error);
    
    // Additional cleanup on error
    if (recaptchaElement) {
      recaptchaElement.innerHTML = '';
    }
    window.recaptchaVerifier = null;
    
    return null;
  }
};

// Email/Password Authentication
export const registerWithEmail = async (email, password, userData = {}) => {
  const { firstName = '', lastName = '', phone = '' } = userData;
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
  
  try {
    // Validate required fields
    if (!email || !password) {
      return { 
        user: null, 
        error: 'Email and password are required',
        code: 'auth/missing-credentials'
      };
    }

    // First create the Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    try {
      // Update the user's display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      // Force token refresh to get the latest claims
      await userCredential.user.getIdToken(true);
      
      try {
        // Exchange Firebase user for JWT token (same as Google auth)
        console.log('Exchanging Firebase token for JWT during registration...');
        const tokenResult = await exchangeFirebaseToken(userCredential.user);
        storeJWTToken(tokenResult.data.token);
        console.log('JWT token stored successfully for email/password registration');
      } catch (tokenError) {
        console.warn('Failed to exchange Firebase token for JWT during registration:', tokenError);
      }
      
      // Then sync with our backend
      const syncedUser = await syncUserWithBackend(userCredential.user, {
        name: displayName,
        firstName,
        lastName,
        phone: phone
      });
      
      return { 
        user: { 
          ...userCredential.user, 
          displayName: displayName || userCredential.user.displayName,
          firstName,
          lastName,
          phone,
          ...(syncedUser || {})
        }, 
        error: null 
      };
      
    } catch (syncError) {
      console.error('Registration sync error:', syncError);
      
      // Clean up Firebase user if sync fails
      try {
        await userCredential.user.delete();
      } catch (deleteError) {
        console.error('Error cleaning up user after failed sync:', deleteError);
      }
      
      return { 
        user: null, 
        error: 'Failed to create user profile. Please try again.',
        code: syncError.code || 'auth/sync-failed'
      };
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    let errorMessage = 'Failed to create account. Please try again.';
    
    if (error.code === 'auth/email-already-in-use') {
      // Return a specific error code that we can check in the UI
      return { 
        user: null, 
        error: 'An account with this email already exists. Please log in instead.',
        code: 'auth/email-already-in-use',
        existingEmail: email // Include the email that's already in use
      };
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/password accounts are not enabled';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please try again later.';
    }
    
    return { 
      user: null, 
      error: errorMessage,
      code: error.code || 'auth/registration-failed'
    }; 
  }
};

// Check if user exists in the backend
const checkUserExists = async (email) => {
  try {
    const response = await axios.get(`${API_URL}/customers/check-email`, {
      params: { email }
    });
    return response.data.exists;
  } catch (error) {
    console.error('Error checking user existence:', error);
    // If there's an error, we'll assume the user exists to not block login
    // This is a safety measure to not lock out users if the check fails
    return true;
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    // First check if user exists in the backend
    try {
      const userExists = await checkUserExists(email);
      if (!userExists) {
        // Sign out the user if they were somehow authenticated
        await signOut(auth);
        return { 
          user: null, 
          error: 'No account found with this email. Please register first.',
          code: 'auth/user-not-found'
        };
      }
    } catch (checkError) {
      console.error('Error checking user existence:', checkError);
      // Continue with login if there was an error checking user existence
      // This is a safety measure to not block login if the check fails
    }

    // Proceed with Firebase authentication
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (firebaseError) {
      console.error('Firebase authentication error:', firebaseError);
      return { 
        user: null, 
        error: firebaseError.message || 'Failed to sign in. Please check your credentials.',
        code: firebaseError.code
      };
    }
    
    // Force token refresh and reload user data to get the latest information
    await userCredential.user.reload();
    const refreshedUser = auth.currentUser;
    await refreshedUser.getIdToken(true);
    
    // Get the latest user data from Firebase
    const userData = {
      uid: refreshedUser.uid,
      email: refreshedUser.email,
      emailVerified: refreshedUser.emailVerified,
      displayName: refreshedUser.displayName,
      photoURL: refreshedUser.photoURL,
      phoneNumber: refreshedUser.phoneNumber,
      providerData: refreshedUser.providerData ? refreshedUser.providerData.map(provider => ({
        providerId: provider.providerId,
        uid: provider.uid,
        displayName: provider.displayName,
        email: provider.email,
        phoneNumber: provider.phoneNumber,
        photoURL: provider.photoURL
      })) : []
    };
    
    try {
      // Exchange Firebase user for JWT token (same as Google auth)
      console.log('Exchanging Firebase token for JWT...');
      const tokenResult = await exchangeFirebaseToken(userData);
      storeJWTToken(tokenResult.data.token);
      console.log('JWT token stored successfully for email/password login');
    } catch (tokenError) {
      console.warn('Failed to exchange Firebase token for JWT:', tokenError);
    }
    
    // Sync with backend
    const syncedUser = await syncUserWithBackend(userData);
    
    return { 
      user: { 
        ...userData,
        ...(syncedUser || {}) 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Login error:', error);
    
    let errorMessage = 'Failed to sign in. Please try again.';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid email or password.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled. Please contact support.';
    }
    
    return { 
      user: null, 
      error: error.message || 'Failed to sign in. Please check your credentials and try again.' 
    };
  }
};

// Clean up reCAPTCHA verifier and DOM element
export const cleanupRecaptcha = (elementId = 'recaptcha-container') => {
  console.log('Cleaning up reCAPTCHA...');
  
  // Clear Firebase verifier
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (error) {
      console.log('Error clearing reCAPTCHA verifier:', error);
    }
    window.recaptchaVerifier = null;
  }
  
  // Clear DOM element
  const recaptchaElement = document.getElementById(elementId);
  if (recaptchaElement) {
    recaptchaElement.innerHTML = '';
    recaptchaElement.removeAttribute('data-sitekey');
    recaptchaElement.removeAttribute('data-callback');
    recaptchaElement.removeAttribute('data-expired-callback');
  }
  
  // Clear confirmation result
  if (window.confirmationResult) {
    window.confirmationResult = null;
  }
};

// Phone Number Authentication
export const sendOTP = async (phoneNumber, recaptchaContainerId = 'recaptcha-container') => {
  try {
    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    
    // Setup reCAPTCHA
    const appVerifier = setupRecaptcha(recaptchaContainerId);
    if (!appVerifier) {
      throw new Error('Failed to setup reCAPTCHA verifier');
    }
    
    // Send OTP
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    window.confirmationResult = confirmationResult;
    
    return { success: true, error: null, confirmationResult };
  } catch (error) {
    console.error('Send OTP error:', error);
    
    // Clean up reCAPTCHA on error
    if (window.recaptchaVerifier) {
      try {
        console.log('Cleaning up reCAPTCHA after error...');
        window.recaptchaVerifier.clear();
      } catch (clearError) {
        console.log('Error clearing reCAPTCHA:', clearError);
      }
      window.recaptchaVerifier = null;
    }
    
    // Also clean up DOM element
    const recaptchaElement = document.getElementById(recaptchaContainerId);
    if (recaptchaElement) {
      console.log('Cleaning up reCAPTCHA DOM element after error...');
      recaptchaElement.innerHTML = '';
    }
    
    let errorMessage = error.message;
    if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please try again later.';
    } else if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Please enter a valid phone number.';
    } else if (error.message && error.message.includes('reCAPTCHA has already been rendered')) {
      errorMessage = 'reCAPTCHA error. Please refresh the page and try again.';
      console.log('reCAPTCHA already rendered error detected');
    } else if (error.code === 'auth/app-not-authorized') {
      errorMessage = 'App not authorized for phone authentication. Please contact support.';
    }
    
    return { success: false, error: errorMessage };
  }
};

export const verifyOTP = async (otp, name = '') => {
  try {
    if (!window.confirmationResult) {
      throw new Error('No OTP verification in progress');
    }
    
    const result = await window.confirmationResult.confirm(otp);
    const user = result.user;
    
    try {
      // Exchange Firebase user for JWT token (same as Google auth)
      console.log('Exchanging Firebase token for JWT during phone verification...');
      const tokenResult = await exchangeFirebaseToken(user);
      storeJWTToken(tokenResult.data.token);
      console.log('JWT token stored successfully for phone authentication');
    } catch (tokenError) {
      console.error('Failed to exchange Firebase token for JWT during phone verification:', tokenError);
      // Try to retry the token exchange once more
      try {
        console.log('Retrying JWT token exchange for phone authentication...');
        const retryResult = await exchangeFirebaseToken(user);
        storeJWTToken(retryResult.data.token);
        console.log('JWT token stored successfully on retry for phone authentication');
      } catch (retryError) {
        console.error('JWT token exchange failed on retry for phone authentication:', retryError);
        throw new Error('Failed to generate authentication token. Please try logging in again.');
      }
    }
    
    // Sync with backend for phone authentication
    const syncedUser = await syncUserWithBackend(user, {
      name: name || user.displayName || 'User',
      phone: user.phoneNumber
    });
    
    // Clean up
    window.confirmationResult = null;
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (clearError) {
        console.log('Error clearing reCAPTCHA:', clearError);
      }
      window.recaptchaVerifier = null;
    }
    
    // Create a comprehensive user object with all necessary fields
    const userName = name || user.displayName || 'User';
    const backendUserName = (syncedUser?.user?.name || syncedUser?.name);
    const finalUserName = backendUserName && backendUserName !== 'User' ? backendUserName : userName;
    
    const completeUser = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: finalUserName,
      name: finalUserName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber,
      phone: user.phoneNumber,
      providerData: user.providerData || [],
      // Include backend user data
      ...(syncedUser?.user || syncedUser || {}),
      // Ensure critical fields are not overwritten with bad values
      uid: user.uid, // Always preserve Firebase UID
      displayName: finalUserName,
      name: finalUserName,
      phoneNumber: user.phoneNumber,
      phone: user.phoneNumber
    };
    
    console.log('verifyOTP: Complete user object:', {
      uid: completeUser.uid,
      name: completeUser.name,
      displayName: completeUser.displayName,
      phone: completeUser.phone,
      email: completeUser.email
    });
    
    return { 
      user: completeUser, 
      error: null 
    };
  } catch (error) {
    console.error('Verify OTP error:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid OTP. Please enter the correct code.';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'OTP has expired. Please request a new one.';
      window.confirmationResult = null;
    }
    
    return { user: null, error: errorMessage };
  }
};

// Logout
export const logoutUser = async () => {
  try {
    // Clean up reCAPTCHA if exists
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (error) {
        console.log('Error clearing reCAPTCHA during logout:', error);
      }
      window.recaptchaVerifier = null;
    }
    
    // Clean up confirmation result
    window.confirmationResult = null;
    
    // Clear JWT token
    clearStoredJWTToken();
    
    // Use utility function to clear all auth data
    clearAllAuthData();
    
    // Sign out from Firebase
    await firebaseSignOut(auth);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

// Google Authentication
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const user = result.user;
    
    // Extract Google ID from the credential or user data
    const googleId = credential?.accessToken || user.providerData?.[0]?.uid || user.uid;
    
    try {
      // Exchange Firebase user for JWT token
      const tokenResult = await exchangeFirebaseToken(user);
      storeJWTToken(tokenResult.data.token);
      console.log('JWT token stored successfully');
    } catch (tokenError) {
      console.warn('Failed to exchange Firebase token for JWT:', tokenError);
    }
    
    // Sync with backend after successful Google sign-in
    const syncedUser = await syncUserWithBackend(user, {
      googleId: googleId,
      name: user.displayName
    });
    
    return { 
      user: {
        ...user,
        ...(syncedUser || {})
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Google sign in error:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in was cancelled. Please try again.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup was blocked. Please allow popups and try again.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = 'Sign-in was cancelled. Please try again.';
    }
    
    return { user: null, error: errorMessage };
  }
};

// Check if phone number exists in the system
export const checkPhoneNumber = async (phoneNumber) => {
  try {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Format phone number consistently
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    const normalizedPhone = formattedPhone.replace(/\D/g, '').slice(-10); // Get last 10 digits
    
    const response = await axios.post(`${API_URL}/auth/check-account`, {
      phone: normalizedPhone
    });

    return response.data.exists;
  } catch (error) {
    console.error('Error checking phone number:', error);
    // If there's an error, we'll assume the number doesn't exist
    // This is a safe default to prevent false positives
    return false;
  }
};

// Get current user
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
};
