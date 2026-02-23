require('dotenv').config();
const admin = require('./lib/firebase');

async function testAdminUpload() {
    try {
        const bucket = admin.storage().bucket();
        console.log('Bucket name:', bucket.name);

        const filename = `test/admin_upload_${Date.now()}.txt`;
        const bucketFile = bucket.file(filename);

        console.log('Uploading file:', filename);
        const mockData = Buffer.from('Hello, world! This is a test upload from the backend using Firebase Admin SDK.');

        // Attempting a direct upload using save() instead of stream
        await bucketFile.save(mockData, {
            metadata: {
                contentType: 'text/plain'
            },
            resumable: false // Try to force non-resumable upload for debugging
        });

        console.log('Upload successful!');

        // Make file public
        await bucketFile.makePublic();
        console.log('File made public! URL:', `https://storage.googleapis.com/${bucket.name}/${filename}`);

        process.exit(0);
    } catch (error) {
        console.error('Upload failed with error:', error);
        if (error.response) {
            console.error('Response details:', error.response.data);
        }
        process.exit(1);
    }
}

testAdminUpload();
