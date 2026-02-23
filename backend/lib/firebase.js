// backend/lib/firebase.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;

try {
  if (admin.apps.length) {
    console.log('[FIREBASE_DEBUG] Application already initialized');
    firebaseApp = admin.app();
  } else {
    let cert = null;
    let projectId = process.env.FIREBASE_PROJECT_ID;

    // Method 1: Load from JSON file (most reliable - avoids env var newline issues)
    const jsonPath = path.join(__dirname, '..', 'firebase-service-account.json');
    if (fs.existsSync(jsonPath)) {
      try {
        console.log('[FIREBASE_DEBUG] Loading credentials from firebase-service-account.json');
        const serviceAccount = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        cert = admin.credential.cert(serviceAccount);
        projectId = projectId || serviceAccount.project_id;
        console.log('[FIREBASE_DEBUG] Successfully loaded service account JSON');
      } catch (e) {
        console.error('[FIREBASE_DEBUG] Failed to load firebase-service-account.json:', e.message);
      }
    }

    // Method 2: Load from FIREBASE_SERVICE_ACCOUNT env var (JSON string)
    if (!cert && process.env.FIREBASE_SERVICE_ACCOUNT) {
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

    // Method 3: Check for individual env vars
    if (!cert && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      console.log('[FIREBASE_DEBUG] Found individual environment variables');
      const rawKey = process.env.FIREBASE_PRIVATE_KEY;
      // Handle all possible formats of the private key
      const privateKey = rawKey
        .replace(/^["']|["']$/g, '')   // Remove surrounding quotes
        .replace(/\\n/g, '\n');          // Convert \n string to actual newlines

      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };
      cert = admin.credential.cert(serviceAccount);
    }

    if (cert && projectId) {
      // Use explicit FIREBASE_STORAGE_BUCKET, or default to .firebasestorage.app (NOT .appspot.com)
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
      console.log('[FIREBASE_DEBUG] Initializing Firebase Admin SDK...');
      console.log(`[FIREBASE_DEBUG] Project: ${projectId}, Bucket: ${storageBucket}`);
      firebaseApp = admin.initializeApp({
        credential: cert,
        projectId: projectId,
        storageBucket: storageBucket
      });
      console.log("✅ [FIREBASE_DEBUG] Firebase Admin SDK initialized successfully");
    } else {
      console.log("⚠️ [FIREBASE_DEBUG] Firebase Admin SDK not initialized - missing credentials");
      console.log(`[FIREBASE_DEBUG] Status: JSONFile=${fs.existsSync(path.join(__dirname, '..', 'firebase-service-account.json'))}, ServiceAccountJSON=${!!process.env.FIREBASE_SERVICE_ACCOUNT}, IndividualVars=${!!(process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL)}`);
    }
  }
} catch (error) {
  console.error("❌ [FIREBASE_DEBUG] Failed to initialize Firebase Admin SDK:", error.message);
  console.error("Please check your Firebase credentials");
}

module.exports = firebaseApp || admin;
