import { initializeApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  fetchSignInMethodsForEmail,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJexHhgYNkQMoVMpFnAzuAWqhhQ09sLDc",
  authDomain: "murugan-bags.firebaseapp.com",
  projectId: "murugan-bags",
  storageBucket: "murugan-bags.firebasestorage.app",
  messagingSenderId: "763190159570",
  appId: "1:763190159570:web:3a780f3a523de8c00d250b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

// Set auth persistence to LOCAL (survives browser restarts)
// CRITICAL: Export this promise so App.jsx can wait for it
export const authPersistenceReady = (async () => {
  try {
    console.log('🔐 [PERSISTENCE] Setting Firebase auth persistence to LOCAL...');
    await setPersistence(auth, browserLocalPersistence);
    console.log('✅ [PERSISTENCE] Firebase auth persistence set to LOCAL (browserLocalPersistence)');

    // Verify persistence is actually working
    const testKey = '__firebase_persistence_test__';
    try {
      localStorage.setItem(testKey, 'test');
      const canRead = localStorage.getItem(testKey) === 'test';
      localStorage.removeItem(testKey);

      if (!canRead) {
        console.error('❌ [PERSISTENCE] CRITICAL: localStorage verification failed!');
        return false;
      }
      console.log('✅ [PERSISTENCE] localStorage verification passed');
    } catch (storageError) {
      console.error('❌ [PERSISTENCE] CRITICAL: localStorage not accessible:', storageError);
      return false;
    }

    // Log production environment info
    if (typeof window !== 'undefined') {
      console.log('🌍 [PERSISTENCE] Environment:', {
        hostname: window.location.hostname,
        isNetlify: window.location.hostname.includes('netlify'),
        isProduction: import.meta.env.PROD,
        localStorageKeys: Object.keys(localStorage).filter(k => k.startsWith('sbbs_') || k.startsWith('firebase')),
      });
    }

    return true;
  } catch (error) {
    console.error('❌ [PERSISTENCE] CRITICAL: Failed to set Firebase auth persistence:', error);
    console.error('❌ [PERSISTENCE] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Fallback: try synchronous setup
    try {
      console.log('🔄 [PERSISTENCE] Attempting synchronous fallback...');
      setPersistence(auth, browserLocalPersistence);
      console.log('✅ [PERSISTENCE] Firebase auth persistence set (sync fallback)');
      return true;
    } catch (syncError) {
      console.error('❌ [PERSISTENCE] CRITICAL: Sync fallback also failed:', syncError);
      return false;
    }
  }
})();

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Set auth language to avoid CORS issues
auth.languageCode = 'en';

export {
  auth,
  storage,
  RecaptchaVerifier,
  googleProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  fetchSignInMethodsForEmail
};

export default app;
