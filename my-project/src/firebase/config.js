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
// This MUST be done before any auth operations
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('✅ Firebase auth persistence set to LOCAL (browserLocalPersistence)');
  } catch (error) {
    console.error('❌ CRITICAL: Failed to set Firebase auth persistence:', error);
    // Fallback: try again synchronously
    try {
      setPersistence(auth, browserLocalPersistence);
      console.log('✅ Firebase auth persistence set (sync fallback)');
    } catch (syncError) {
      console.error('❌ CRITICAL: Sync fallback also failed:', syncError);
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
