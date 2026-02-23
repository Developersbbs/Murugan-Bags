const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
require('dotenv').config();

const firebaseConfig = {
    apiKey: "AIzaSyCJexHhgYNkQMoVMpFnAzuAWqhhQ09sLDc",
    authDomain: "murugan-bags.firebaseapp.com",
    projectId: "murugan-bags",
    storageBucket: "murugan-bags.firebasestorage.app",
    messagingSenderId: "763190159570",
    appId: "1:763190159570:web:3a780f3a523de8c00d250b"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function testUpload() {
    try {
        const filename = `test_upload_${Date.now()}.txt`;
        console.log('Uploading file:', filename);
        const storageRef = ref(storage, 'test/' + filename);

        // Convert string to Uint8Array for Client SDK compatibility
        const data = "Hello, world!";
        const buffer = new Uint8Array(Buffer.from(data));

        const snapshot = await uploadBytes(storageRef, buffer, { contentType: 'text/plain' });
        console.log('Uploaded successfully!');

        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('File available at', downloadURL);
        process.exit(0);
    } catch (error) {
        console.error('Upload failed:', error);
        process.exit(1);
    }
}

testUpload();
