const admin = require('../lib/firebase');

/**
 * Upload a file to Firebase Storage
 * @param {Object} file - Multer file object (with buffer from memoryStorage)
 * @param {string} folder - Folder path in Firebase Storage (default: 'products')
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
async function uploadToFirebase(file, folder = 'products') {
    try {
        // Check if Firebase Admin SDK is initialized
        if (!admin || typeof admin.storage !== 'function') {
            console.error('❌ Firebase Admin SDK is not initialized');
            console.error('⚠️ Please check your Firebase credentials in .env file');
            console.error('Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
            throw new Error('Firebase Admin SDK not initialized - check .env credentials');
        }

        const bucket = admin.storage().bucket();

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const filename = `${folder}/${timestamp}_${randomString}_${file.originalname}`;

        const fileUpload = bucket.file(filename);

        // Upload file with metadata
        await fileUpload.save(file.buffer, {
            metadata: {
                contentType: file.mimetype,
            },
            public: true, // Make file publicly accessible
        });

        // Make the file public and get URL
        await fileUpload.makePublic();

        // Return public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        console.log(`✅ Uploaded to Firebase Storage: ${publicUrl}`);

        return publicUrl;
    } catch (error) {
        console.error('❌ Firebase upload error:', error);
        throw new Error(`Failed to upload to Firebase: ${error.message}`);
    }
}

/**
 * Delete a file from Firebase Storage
 * @param {string} fileUrl - Public URL of the file to delete
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFromFirebase(fileUrl) {
    try {
        if (!fileUrl || !fileUrl.includes('storage.googleapis.com')) {
            return false; // Not a Firebase URL, skip deletion
        }

        const bucket = admin.storage().bucket();

        // Extract filename from URL
        // URL format: https://storage.googleapis.com/bucket-name/folder/filename.jpg
        const urlParts = fileUrl.split(`${bucket.name}/`);
        if (urlParts.length < 2) {
            console.warn('⚠️ Could not extract filename from Firebase URL:', fileUrl);
            return false;
        }

        const filename = urlParts[1];
        const file = bucket.file(filename);

        await file.delete();
        console.log(`✅ Deleted from Firebase Storage: ${filename}`);

        return true;
    } catch (error) {
        console.error('❌ Firebase deletion error:', error);
        return false;
    }
}

module.exports = {
    uploadToFirebase,
    deleteFromFirebase,
};
