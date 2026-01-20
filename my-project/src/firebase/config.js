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
// Added retry logic for production reliability
export const authPersistenceReady = (async () => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔐 [PERSISTENCE] Attempt ${attempt}/3: Setting Firebase auth persistence to LOCAL...`);
      await setPersistence(auth, browserLocalPersistence);
      console.log('✅ [PERSISTENCE] Firebase auth persistence set to LOCAL (browserLocalPersistence)');

      // Verify persistence is actually working
      const testKey = '__firebase_persistence_test__';
      try {
        localStorage.setItem(testKey, 'test');
        const canRead = localStorage.getItem(testKey) === 'test';
        localStorage.removeItem(testKey);

        if (!canRead) {
          throw new Error('localStorage verification failed - cannot read back written value');
        }
        console.log('✅ [PERSISTENCE] localStorage verification passed');
      } catch (storageError) {
        throw new Error(`localStorage not accessible: ${storageError.message}`);
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

      console.log('✅ [PERSISTENCE] All checks passed - persistence is ready');
      return true;

    } catch (error) {
      console.error(`❌ [PERSISTENCE] Attempt ${attempt}/3 failed:`, error);
      console.error('❌ [PERSISTENCE] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      if (attempt < 3) {
        console.log(`🔄 [PERSISTENCE] Waiting 1 second before retry...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // All attempts failed - try synchronous fallback as last resort
  console.error('❌ [PERSISTENCE] CRITICAL: All async attempts failed, trying synchronous fallback...');
  try {
    setPersistence(auth, browserLocalPersistence);
    console.log('✅ [PERSISTENCE] Synchronous fallback succeeded');
    return true;
  } catch (syncError) {
    console.error('❌ [PERSISTENCE] CRITICAL: Even synchronous fallback failed:', syncError);
    console.error('❌ [PERSISTENCE] Auth will NOT persist across sessions!');
    return false;
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
