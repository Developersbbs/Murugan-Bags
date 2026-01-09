// backend/lib/firebase.js
const admin = require('firebase-admin');

// Firebase service account key (you'll need to generate this from Firebase Console)
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "ecommerce-53a0d",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL || ""}`
};

// Initialize Firebase Admin SDK only if we have valid credentials
// Initialize Firebase Admin SDK
let firebaseApp = null;

try {
  if (admin.apps.length) {
    console.log('[FIREBASE_DEBUG] Application already initialized');
    firebaseApp = admin.app();
  } else {
    // Methods to initialize: 
    // 1. FIREBASE_SERVICE_ACCOUNT (JSON string)
    // 2. Individual variables (FIREBASE_PRIVATE_KEY, etc.)

    let cert = null;
    let projectId = process.env.FIREBASE_PROJECT_ID;

    // Method 1: Check for JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        console.log('[FIREBASE_DEBUG] Found FIREBASE_SERVICE_ACCOUNT, attempting to parse...');
        const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        cert = admin.credential.cert(serviceAccountJson);
        projectId = projectId || serviceAccountJson.project_id;
        console.log('[FIREBASE_DEBUG] Successfully parsed service account JSON');
      } catch (e) {
        console.error('[FIREBASE_DEBUG] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
      }
    }

    // Method 2: Check for individual vars if Method 1 absent/failed
    if (!cert && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      console.log('[FIREBASE_DEBUG] Found individual environment variables');
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID, // Optional
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID, // Optional
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };
      cert = admin.credential.cert(serviceAccount);
    }

    if (cert && projectId) {
      console.log('[FIREBASE_DEBUG] Initializing Firebase Admin SDK...');
      firebaseApp = admin.initializeApp({
        credential: cert,
        projectId: projectId,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`
      });
      console.log("✅ [FIREBASE_DEBUG] Firebase Admin SDK initialized successfully");
    } else {
      console.log("⚠️ [FIREBASE_DEBUG] Firebase Admin SDK not initialized - missing credentials");
      console.log(`[FIREBASE_DEBUG] Status: ServiceAccountJSON=${!!process.env.FIREBASE_SERVICE_ACCOUNT}, IndividualVars=${!!(process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL)}`);
    }
  }
} catch (error) {
  console.error("❌ [FIREBASE_DEBUG] Failed to initialize Firebase Admin SDK:", error.message);
  console.error("Please check your Firebase environment variables in .env file");
}

module.exports = firebaseApp || admin;
